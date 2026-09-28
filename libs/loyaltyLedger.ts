import 'server-only';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { LoyaltyLedgerEntry } from '@/models/loyaltyLedgerEntry';
import { formatMoney, roundMoney } from '@/libs/money';
import type {
  LoyaltyLedgerEntry as LoyaltyLedgerEntryType,
  LoyaltyLedgerEntryType as LedgerEntryType,
  LoyaltyLedgerResult,
  LoyaltyLedgerSummary,
} from '@/types/loyalty';

type OrderDocument = HydratedDocument<any>;

type LoyaltyLedgerActor = {
  _id?: unknown;
  email?: string | null;
  role?: string | null;
};

const toObjectIdIfValid = (value: unknown) => {
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }

  return value;
};

const stringifyId = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof (value as { toString?: unknown }).toString === 'function') {
    return (value as { toString: () => string }).toString();
  }

  return String(value);
};

const toIsoString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;

  const date = value ? new Date(value as string | number | Date) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
};

const buildActorMetadata = (actor?: LoyaltyLedgerActor | null) =>
  actor
    ? {
        actorId: stringifyId(actor._id) || null,
        actorEmail: actor.email || null,
        actorRole: actor.role || null,
      }
    : {};

const getOrderNumber = (order: OrderDocument) => stringifyId((order as any)._id).slice(-6);

const hasOrderId = (order: OrderDocument) => Boolean((order as any)?._id);
const hasUserId = (order: OrderDocument) => Boolean((order as any)?.userId);

const serializeLedgerEntry = (entry: any): LoyaltyLedgerEntryType => ({
  _id: stringifyId(entry._id),
  userId: stringifyId(entry.userId),
  orderId: stringifyId(entry.orderId),
  restaurantId: entry.restaurantId ? stringifyId(entry.restaurantId) : null,
  type: entry.type,
  status: entry.status || 'active',
  tierName: entry.tierName || null,
  discountPercentage: Number(entry.discountPercentage) || 0,
  discountAmount: roundMoney(Number(entry.discountAmount) || 0),
  orderTotal: roundMoney(Number(entry.orderTotal) || 0),
  orderCountDelta: Number(entry.orderCountDelta) || 0,
  description: entry.description || '',
  metadata: entry.metadata || {},
  createdAt: toIsoString(entry.createdAt),
  updatedAt: toIsoString(entry.updatedAt),
});

const upsertLedgerEntry = async ({
  order,
  type,
  description,
  orderCountDelta,
  discountAmount = 0,
  actor,
  extraMetadata = {},
}: {
  order: OrderDocument;
  type: LedgerEntryType;
  description: string;
  orderCountDelta: number;
  discountAmount?: number;
  actor?: LoyaltyLedgerActor | null;
  extraMetadata?: Record<string, unknown>;
}) => {
  const now = new Date();

  return LoyaltyLedgerEntry.findOneAndUpdate(
    {
      orderId: toObjectIdIfValid((order as any)._id),
      type,
    },
    {
      $setOnInsert: {
        userId: toObjectIdIfValid((order as any).userId),
        orderId: toObjectIdIfValid((order as any)._id),
        restaurantId: (order as any).restaurantId
          ? toObjectIdIfValid((order as any).restaurantId)
          : null,
        type,
        status: 'active',
        tierName: (order as any).loyaltyTier || null,
        discountPercentage: Number((order as any).loyaltyDiscountPercentage) || 0,
        discountAmount: roundMoney(discountAmount),
        orderTotal: roundMoney(Number((order as any).total) || 0),
        orderCountDelta,
        description,
        metadata: {
          orderStatus: (order as any).orderStatus || null,
          completedAt: (order as any).completedAt || null,
          deliveryCompletedBy: (order as any).deliveryCompletedBy || null,
          ...buildActorMetadata(actor),
          ...extraMetadata,
        },
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const recordOrderLoyaltyCompletion = async (
  order: OrderDocument,
  { actor = null }: { actor?: LoyaltyLedgerActor | null } = {}
) => {
  if (
    !order ||
    !hasOrderId(order) ||
    !hasUserId(order) ||
    (order as any).orderStatus !== 'completed'
  ) {
    return { recorded: false };
  }

  const orderNumber = getOrderNumber(order);
  const discountAmount = roundMoney(Number((order as any).loyaltyDiscount) || 0);
  const tierName = (order as any).loyaltyTier || null;

  await upsertLedgerEntry({
    order,
    type: 'order_completed',
    description: `Order #${orderNumber} counted toward loyalty rewards.`,
    orderCountDelta: 1,
    actor,
    extraMetadata: {
      source: 'order_completion',
    },
  });

  if (discountAmount > 0) {
    await upsertLedgerEntry({
      order,
      type: 'discount_applied',
      description: `${tierName || 'Loyalty'} reward saved ${formatMoney(discountAmount)} on order #${orderNumber}.`,
      orderCountDelta: 0,
      discountAmount,
      actor,
      extraMetadata: {
        source: 'completed_order_discount',
      },
    });
  }

  return { recorded: true };
};

export const reverseOrderLoyaltyRewards = async (
  order: OrderDocument,
  {
    reason,
    actor = null,
  }: {
    reason: string;
    actor?: LoyaltyLedgerActor | null;
  }
) => {
  if (!order || !hasOrderId(order) || !hasUserId(order)) {
    return { reversed: false };
  }

  const orderId = toObjectIdIfValid((order as any)._id);
  const completionEntry = await LoyaltyLedgerEntry.findOne({
    orderId,
    type: 'order_completed',
  });

  if (!completionEntry) {
    return { reversed: false };
  }

  const existingReversal = await LoyaltyLedgerEntry.findOne({
    orderId,
    type: 'reward_reversed',
  });

  if (existingReversal) {
    return { reversed: false, alreadyReversed: true };
  }

  const now = new Date();
  await LoyaltyLedgerEntry.updateMany(
    {
      orderId,
      type: { $in: ['order_completed', 'discount_applied'] },
    },
    {
      $set: {
        status: 'reversed',
        updatedAt: now,
        'metadata.reversalReason': reason,
        'metadata.reversedAt': now,
      },
    }
  );

  await upsertLedgerEntry({
    order,
    type: 'reward_reversed',
    description: `Loyalty reward for order #${getOrderNumber(order)} was reversed.`,
    orderCountDelta: -1,
    actor,
    extraMetadata: {
      source: 'loyalty_reversal',
      reason,
      reversedAt: now,
    },
  });

  return { reversed: true };
};

const EMPTY_SUMMARY: LoyaltyLedgerSummary = {
  earnedOrders: 0,
  reversedOrders: 0,
  totalDiscountApplied: 0,
  totalDiscountReversed: 0,
};

export const getUserLoyaltyLedger = async (
  userId: unknown,
  { limit = 12 }: { limit?: number } = {}
): Promise<LoyaltyLedgerResult> => {
  const normalizedUserId = toObjectIdIfValid(userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);

  const [entries, summaryRows] = await Promise.all([
    LoyaltyLedgerEntry.find({ userId: normalizedUserId })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean(),
    LoyaltyLedgerEntry.aggregate([
      { $match: { userId: normalizedUserId } },
      {
        $group: {
          _id: null,
          earnedOrders: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$type', 'order_completed'] }, { $eq: ['$status', 'active'] }],
                },
                '$orderCountDelta',
                0,
              ],
            },
          },
          reversedOrders: {
            $sum: {
              $cond: [{ $eq: ['$type', 'reward_reversed'] }, 1, 0],
            },
          },
          totalDiscountApplied: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$type', 'discount_applied'] }, { $eq: ['$status', 'active'] }],
                },
                '$discountAmount',
                0,
              ],
            },
          },
          totalDiscountReversed: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$type', 'discount_applied'] }, { $eq: ['$status', 'reversed'] }],
                },
                '$discountAmount',
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const summary = summaryRows[0] || EMPTY_SUMMARY;

  return {
    entries: entries.map(serializeLedgerEntry),
    summary: {
      earnedOrders: Number(summary.earnedOrders) || 0,
      reversedOrders: Number(summary.reversedOrders) || 0,
      totalDiscountApplied: roundMoney(Number(summary.totalDiscountApplied) || 0),
      totalDiscountReversed: roundMoney(Number(summary.totalDiscountReversed) || 0),
    },
  };
};
