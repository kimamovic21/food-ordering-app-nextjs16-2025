import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';

loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const getArgValue = (name) => {
  const prefix = `${name}=`;
  return (
    process.argv
      .slice(2)
      .find((arg) => arg.startsWith(prefix))
      ?.slice(prefix.length) || ''
  );
};

const apply = args.has('--apply');
const limit = Math.max(1, Number(getArgValue('--limit')) || 1000);
const userId = getArgValue('--userId');
const orderId = getArgValue('--orderId');
const mongoUrl = process.env.MONGODB_URL;

const roundMoney = (value) => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
const formatMoney = (value) => `$${roundMoney(value).toFixed(2)}`;
const toObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

const getOrderNumber = (order) => order._id.toString().slice(-6);
const getEntryDate = (order) =>
  order.completedAt || order.updatedAt || order.createdAt || new Date();

if (!mongoUrl) {
  console.error('MONGODB_URL is required to backfill loyalty ledger entries.');
  process.exit(1);
}

const buildOrderFilter = () => {
  const filter = {
    orderStatus: 'completed',
    userId: { $exists: true, $ne: null },
  };

  if (userId) {
    filter.userId = toObjectId(userId);
  }

  if (orderId) {
    filter._id = toObjectId(orderId);
  }

  return filter;
};

const buildCompletionEntry = (order, entryDate) => ({
  userId: order.userId,
  orderId: order._id,
  restaurantId: order.restaurantId || null,
  type: 'order_completed',
  status: 'active',
  tierName: order.loyaltyTier || null,
  discountPercentage: Number(order.loyaltyDiscountPercentage) || 0,
  discountAmount: 0,
  orderTotal: roundMoney(order.total),
  orderCountDelta: 1,
  description: `Order #${getOrderNumber(order)} counted toward loyalty rewards.`,
  metadata: {
    source: 'maintenance_backfill',
    orderStatus: order.orderStatus,
    completedAt: order.completedAt || null,
    deliveryCompletedBy: order.deliveryCompletedBy || null,
  },
  createdAt: entryDate,
  updatedAt: entryDate,
});

const buildDiscountEntry = (order, entryDate, discountAmount) => ({
  userId: order.userId,
  orderId: order._id,
  restaurantId: order.restaurantId || null,
  type: 'discount_applied',
  status: 'active',
  tierName: order.loyaltyTier || null,
  discountPercentage: Number(order.loyaltyDiscountPercentage) || 0,
  discountAmount,
  orderTotal: roundMoney(order.total),
  orderCountDelta: 0,
  description: `${order.loyaltyTier || 'Loyalty'} reward saved ${formatMoney(
    discountAmount
  )} on order #${getOrderNumber(order)}.`,
  metadata: {
    source: 'maintenance_backfill',
    orderStatus: order.orderStatus,
    completedAt: order.completedAt || null,
    deliveryCompletedBy: order.deliveryCompletedBy || null,
  },
  createdAt: entryDate,
  updatedAt: entryDate,
});

const insertIfNeeded = async ({ collection, existingTypes, type, entry, stats }) => {
  if (existingTypes.has(type)) {
    stats.skippedExisting += 1;
    return;
  }

  if (!apply) {
    stats.planned += 1;
    return;
  }

  try {
    await collection.insertOne(entry);
    stats.inserted += 1;
  } catch (error) {
    if (error?.code === 11000) {
      stats.skippedExisting += 1;
      return;
    }

    throw error;
  }
};

const main = async () => {
  await mongoose.connect(mongoUrl);

  const orders = mongoose.connection.collection('orders');
  const ledgerEntries = mongoose.connection.collection('loyalty_ledger_entries');

  await Promise.all([
    ledgerEntries.createIndex({ userId: 1, createdAt: -1 }),
    ledgerEntries.createIndex({ userId: 1, type: 1, createdAt: -1 }),
    ledgerEntries.createIndex({ restaurantId: 1, createdAt: -1 }),
    ledgerEntries.createIndex({ orderId: 1, type: 1 }, { unique: true }),
  ]);

  const filter = buildOrderFilter();
  const completedOrders = await orders
    .find(filter)
    .sort({ completedAt: 1, createdAt: 1 })
    .limit(limit)
    .toArray();

  const stats = {
    scanned: completedOrders.length,
    planned: 0,
    inserted: 0,
    skippedExisting: 0,
    missingUser: 0,
  };

  for (const order of completedOrders) {
    if (!order.userId) {
      stats.missingUser += 1;
      continue;
    }

    const existingEntries = await ledgerEntries
      .find({
        orderId: order._id,
        type: { $in: ['order_completed', 'discount_applied'] },
      })
      .project({ type: 1 })
      .toArray();
    const existingTypes = new Set(existingEntries.map((entry) => entry.type));
    const entryDate = getEntryDate(order);
    const loyaltyDiscount = roundMoney(order.loyaltyDiscount);

    await insertIfNeeded({
      collection: ledgerEntries,
      existingTypes,
      type: 'order_completed',
      entry: buildCompletionEntry(order, entryDate),
      stats,
    });

    if (loyaltyDiscount > 0) {
      await insertIfNeeded({
        collection: ledgerEntries,
        existingTypes,
        type: 'discount_applied',
        entry: buildDiscountEntry(order, entryDate, loyaltyDiscount),
        stats,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        filter: {
          orderStatus: 'completed',
          userId: userId || null,
          orderId: orderId || null,
          limit,
        },
        ...stats,
      },
      null,
      2
    )
  );

  if (!apply) {
    console.log('Dry run only. Re-run with --apply or npm run loyalty:ledger:backfill:apply.');
  }
};

main()
  .catch((error) => {
    console.error('Failed to backfill loyalty ledger entries:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
