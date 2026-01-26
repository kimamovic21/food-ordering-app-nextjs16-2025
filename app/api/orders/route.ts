import { isAdminOrManager } from '@/app/api/auth/[...nextauth]/route';
import { Order } from '@/models/order';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  try {
    const body = await request.json();
    // Validate required fields
    const requiredFields = [
      'email',
      'phone',
      'streetAddress',
      'postalCode',
      'city',
      'country',
      'cartProducts',
      'deliveryFee',
      'total',
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return Response.json({ error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    const order = await Order.create({
      userId: body.userId,
      email: body.email,
      phone: body.phone,
      streetAddress: body.streetAddress,
      postalCode: body.postalCode,
      city: body.city,
      country: body.country,
      cartProducts: body.cartProducts,
      deliveryFee: body.deliveryFee,
      deliveryFeeBreakdown: body.deliveryFeeBreakdown,
      loyaltyDiscount: body.loyaltyDiscount,
      loyaltyDiscountPercentage: body.loyaltyDiscountPercentage,
      loyaltyTier: body.loyaltyTier,
      total: body.total,
      orderPaid: false,
      orderStatus: 'placed',
      courierId: null,
      stripeSessionId: null,
    });

    return Response.json({ order: normalizeOrder(order.toObject()) });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Order creation failed.' }, { status: 500 });
  }
}

const normalizeOrder = (order: any) => ({
  ...order,
  paymentStatus: Boolean(order.orderPaid ?? order.paymentStatus ?? order.paid),
  orderStatus: order.orderStatus || 'placed',
});

export async function GET(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);
  const url = new URL(request.url);
  // Get user session
  const session = await import('@/libs/authOptions')
    .then((m) => m.authOptions)
    .then(async (authOptions) => {
      const { getServerSession } = await import('next-auth/next');
      return getServerSession(authOptions);
    });
  const userEmail = session?.user?.email;
  const id = url.searchParams.get('id');

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await Order.findById(id).populate('courierId', 'name email image').lean();

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow if user is owner, or admin/manager
    if (
      !userEmail ||
      (order.email !== userEmail &&
        !(await import('@/app/api/auth/[...nextauth]/route')
          .then((m) => m.isAdminOrManager())
          .catch(() => false)))
    ) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({ order: normalizeOrder(order) });
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 5;
  const skip = (page - 1) * limit;

  const totalOrders = await Order.countDocuments({});
  const orders = await Order.find({})
    .populate('courierId', 'name email image')
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const normalizedOrders = orders.map(normalizeOrder);

  const totalPages = Math.ceil(totalOrders / limit) || 1;

  return Response.json({ orders: normalizedOrders, page, totalPages, totalOrders });
}

export async function PATCH(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  if (!(await isAdminOrManager())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, orderStatus } = await request.json();

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const allowedStatuses = ['placed', 'processing', 'ready', 'transportation', 'completed'];
  if (!allowedStatuses.includes(orderStatus)) {
    return Response.json({ error: 'Invalid order status' }, { status: 400 });
  }

  // Admin cannot mark order as completed or transportation
  if (orderStatus === 'completed') {
    return Response.json({ error: 'Only courier can mark order as completed' }, { status: 400 });
  }

  if (orderStatus === 'transportation') {
    return Response.json(
      { error: 'Order automatically moves to transportation when courier is assigned' },
      { status: 400 }
    );
  }

  const order = await Order.findById(id);

  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  const hasPaid = Boolean(
    (order as any).orderPaid ?? (order as any).paymentStatus ?? (order as any).paid
  );

  if (!hasPaid) {
    return Response.json(
      { error: 'Cannot update status before payment is completed' },
      { status: 400 }
    );
  }

  (order as any).orderPaid = hasPaid;
  order.orderStatus = orderStatus;
  const savedOrder = await order.save();

  return Response.json({ order: normalizeOrder(savedOrder.toObject()) });
}
