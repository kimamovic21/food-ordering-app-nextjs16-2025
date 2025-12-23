import { isAdmin } from '@/app/api/auth/[...nextauth]/route';
import { Order } from '@/models/order';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await Order.findById(id).lean();

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    return Response.json({ order });
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 5;
  const skip = (page - 1) * limit;

  const totalOrders = await Order.countDocuments({});
  const orders = await Order.find({})
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalPages = Math.ceil(totalOrders / limit) || 1;

  return Response.json({ orders, page, totalPages, totalOrders });
}
