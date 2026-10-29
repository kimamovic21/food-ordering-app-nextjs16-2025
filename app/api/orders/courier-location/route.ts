import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/libs/authOptions';
import { normalizeCourierLocation } from '@/libs/courierTracking';
import { Order } from '@/models/order';
import { User } from '@/models/user';
import mongoose from 'mongoose';
import type { CourierTrackingResponse } from '@/types/courierTracking';

const json = (body: CourierTrackingResponse | { error: string }, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return json({ error: 'Unauthorized' }, 401);

    const orderId = new URL(request.url).searchParams.get('orderId');
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return json({ error: 'Invalid order ID' }, 400);
    }

    await mongoose.connect(process.env.MONGODB_URL as string);
    const user = await User.findOne({ email }).select('_id email role restaurantId').lean();
    if (!user) return json({ error: 'User not found' }, 404);

    const order = await Order.findById(orderId)
      .select(
        'userId email restaurantId orderStatus courierId courierAssignmentStatus courierDeliveredAt courierAcceptedAt courierAssignedAt'
      )
      .lean();
    if (!order) return json({ error: 'Order not found' }, 404);

    const superAdminEmail =
      process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    const isSuperAdmin =
      user.role === 'admin' && Boolean(superAdminEmail) && user.email === superAdminEmail;
    const isRestaurantAdmin =
      user.role === 'admin' &&
      Boolean(user.restaurantId) &&
      String(user.restaurantId) === String(order.restaurantId);
    // Legacy orders can have only an email. Never override an existing owner ID with email.
    const isCustomer = order.userId
      ? String(order.userId) === String(user._id)
      : order.email === user.email;
    if (!isSuperAdmin && !isRestaurantAdmin && !isCustomer) {
      return json({ error: 'Not authorized to view this order' }, 403);
    }

    const checkedAt = new Date().toISOString();
    if (
      ['delivered', 'completed', 'canceled'].includes(order.orderStatus) ||
      order.courierDeliveredAt
    ) {
      return json({
        location: null,
        trackingStatus: 'ended',
        checkedAt,
        message: 'Courier tracking has ended for this order.',
      });
    }

    const accepted = order.courierAssignmentStatus === 'accepted';
    const legacyTransport =
      !order.courierAssignmentStatus && order.orderStatus === 'transportation';
    if (
      !['ready', 'transportation'].includes(order.orderStatus) ||
      (!accepted && !legacyTransport)
    ) {
      return json({
        location: null,
        trackingStatus: 'waiting',
        checkedAt,
        message: 'Waiting for an accepted courier assignment.',
      });
    }

    // Both sides of the assignment must still agree. Historical courierId alone is not permission.
    const courier = await User.findOne({
      ...(order.courierId ? { _id: order.courierId } : {}),
      takenOrder: order._id,
      role: 'courier',
    })
      .select('name email latitude longitude lastLocationUpdate')
      .lean();
    if (!courier) {
      return json({
        location: null,
        trackingStatus: 'waiting',
        checkedAt,
        message: 'No active courier assigned to this order.',
      });
    }

    let location = normalizeCourierLocation(courier);
    const assignmentStartedAt = order.courierAcceptedAt || order.courierAssignedAt;
    if (
      assignmentStartedAt &&
      (!location?.lastLocationUpdate ||
        Date.parse(location.lastLocationUpdate) < new Date(assignmentStartedAt).getTime())
    ) {
      location = null;
    }

    return json({
      location,
      trackingStatus: location ? 'active' : 'waiting',
      checkedAt,
      ...(!location ? { message: 'Waiting for a location update for this delivery.' } : {}),
      courier: { name: courier.name, email: courier.email },
    });
  } catch (error) {
    console.error('Error fetching courier location:', error);
    return json({ error: 'Failed to fetch courier location' }, 500);
  }
}
