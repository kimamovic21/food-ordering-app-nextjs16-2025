import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/libs/authOptions';
import { createAuditLog } from '@/libs/auditLog';
import { buildOrderCartSnapshotFromOrderProducts } from '@/libs/orderCartSnapshot';
import { Order } from '@/models/order';
import { User } from '@/models/user';

export async function POST(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const { orderId } = (await request.json()) as { orderId?: string };

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return Response.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const order = await Order.findOne({ _id: orderId, userId: user._id }).lean();
  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  let snapshot;

  try {
    snapshot = await buildOrderCartSnapshotFromOrderProducts(order.cartProducts || []);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to reorder this order.' },
      { status: 400 }
    );
  }

  if (snapshot.cartItems.length === 0) {
    return Response.json(
      {
        adjustedItems: snapshot.adjustedItems,
        error: snapshot.skippedItems[0]?.message || 'No items from this order can be reordered.',
        priceChangedItems: snapshot.priceChangedItems,
        recoverySummary: snapshot.recoverySummary,
        skippedItems: snapshot.skippedItems,
      },
      { status: 400 }
    );
  }

  await createAuditLog({
    actor: user,
    action: 'order.reordered',
    entityType: 'order',
    entityId: order._id,
    restaurantId: snapshot.cartItems[0]?.restaurantId,
    orderId: order._id,
    metadata: {
      adjustedItemCount: snapshot.adjustedItems.length,
      itemCount: snapshot.cartItems.length,
      priceChangedItemCount: snapshot.priceChangedItems.length,
      skippedItemCount: snapshot.skippedItems.length,
    },
  });

  return Response.json({
    adjustedItems: snapshot.adjustedItems,
    cartItems: snapshot.cartItems,
    priceChangedItems: snapshot.priceChangedItems,
    recoverySummary: snapshot.recoverySummary,
    skippedItems: snapshot.skippedItems,
  });
}
