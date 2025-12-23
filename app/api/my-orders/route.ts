import { Order } from '@/models/order';
import { User } from '@/models/user';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/libs/authOptions';

export async function GET(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Find the current user
  const user = await User.findOne({ email: session.user.email });
  
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // If fetching specific order by id
  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await Order.findById(id).lean();

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order belongs to current user
    if (order.userId?.toString() !== user._id.toString()) {
      return Response.json({ error: 'Unauthorized - Order does not belong to you' }, { status: 403 });
    }

    return Response.json({ order });
  }

  // Fetch all orders for the current user
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 5;
  const skip = (page - 1) * limit;

  const totalOrders = await Order.countDocuments({ userId: user._id });
  const orders = await Order.find({ userId: user._id })
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalPages = Math.ceil(totalOrders / limit) || 1;

  return Response.json({ orders, page, totalPages, totalOrders });
}
