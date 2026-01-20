import { isAdmin, isAdminOrManager } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@/models/user';
import { Order } from '@/models/order';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isAdminOrManager())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const availableOnly = url.searchParams.get('availableOnly') === 'true';

  const filter: any = { role: 'courier' };
  if (availableOnly) {
    filter.availability = true;
  }

  const couriers = await User.find(filter).select(
    'name email image availability takenOrder role createdAt'
  );

  return Response.json({ couriers });
}

export async function PATCH(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isAdminOrManager())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courierId, orderId } = await request.json();

  if (!courierId || !mongoose.Types.ObjectId.isValid(courierId)) {
    return Response.json({ error: 'Invalid courier ID' }, { status: 400 });
  }

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return Response.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const courier = await User.findById(courierId);

  if (!courier) {
    return Response.json({ error: 'Courier not found' }, { status: 404 });
  }

  if (courier.role !== 'courier') {
    return Response.json({ error: 'User is not a courier' }, { status: 400 });
  }

  // Update courier's taken order
  courier.takenOrder = orderId;
  await courier.save();

  // Also update the order to set courierId
  const order = await Order.findByIdAndUpdate(
    orderId,
    { courierId: courierId },
    { new: true }
  );

  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  return Response.json({ courier, order });
}
