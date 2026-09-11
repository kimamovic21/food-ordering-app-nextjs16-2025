import { authOptions } from '@/libs/authOptions';
import { AdminUserDeletionError, deleteUserAsSuperAdmin } from '@/libs/adminUserDeletion';
import { User } from '@/models/user';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';

const activeOrderStatuses = ['placed', 'processing', 'ready', 'transportation', 'delivered'];

const getUserOrderActivitySummary = async ({
  userId,
  email,
}: {
  userId: unknown;
  email?: string | null;
}) => {
  const { Order } = await import('@/models/order');
  const userOrderFilter = {
    $or: [{ userId }, ...(email ? [{ email }] : [])],
  };

  const [
    totalOrders,
    completedOrders,
    canceledOrders,
    activeOrders,
    unpaidOrders,
    spentResult,
    lastOrder,
  ] = await Promise.all([
    Order.countDocuments(userOrderFilter),
    Order.countDocuments({ ...userOrderFilter, orderStatus: 'completed' }),
    Order.countDocuments({ ...userOrderFilter, orderStatus: 'canceled' }),
    Order.countDocuments({ ...userOrderFilter, orderStatus: { $in: activeOrderStatuses } }),
    Order.countDocuments({
      $and: [
        userOrderFilter,
        { orderStatus: { $ne: 'canceled' } },
        { $or: [{ paid: false }, { orderPaid: false }] },
      ],
    }),
    Order.aggregate([
      {
        $match: {
          $and: [
            userOrderFilter,
            { orderStatus: { $ne: 'canceled' } },
            { $or: [{ paid: true }, { orderPaid: true }] },
          ],
        },
      },
      { $group: { _id: null, totalSpent: { $sum: '$total' } } },
    ]),
    Order.findOne(userOrderFilter).sort({ createdAt: -1 }).select('createdAt').lean(),
  ]);

  const totalSpent = Number(spentResult?.[0]?.totalSpent || 0);

  return {
    totalOrders,
    completedOrders,
    canceledOrders,
    activeOrders,
    unpaidOrders,
    totalSpent: Number(totalSpent.toFixed(2)),
    lastOrderAt: lastOrder?.createdAt ? new Date(lastOrder.createdAt).toISOString() : null,
  };
};

export async function GET(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email;
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  if (!actorEmail) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actor = await User.findOne({ email: actorEmail }).select('email role').lean();

  if (!actor || actor.role !== 'admin' || !superAdminEmail || actor.email !== superAdminEmail) {
    return Response.json({ error: 'Only super admin can view users' }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await User.findById(id)
      .select(
        '-password -emailVerificationTokenHash -emailVerificationTokenExpiresAt -passwordResetTokenHash -passwordResetTokenExpiresAt'
      )
      .populate('restaurantId', 'name')
      .lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const activitySummary = await getUserOrderActivitySummary({
      userId: user._id,
      email: user.email,
    });

    return Response.json({ user: { ...user, activitySummary } });
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 5;
  const skip = (page - 1) * limit;

  const totalUsers = await User.countDocuments({});
  const users = await User.find(
    {},
    'name email image city country phone postalCode streetAddress role'
  )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalUsers / limit) || 1;

  return Response.json({ users, page, totalPages, totalUsers });
}

export async function DELETE(request: Request) {
  await mongoose.connect(process.env.MONGODB_URL as string);

  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email;
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  if (!actorEmail) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actor = await User.findOne({ email: actorEmail });

  if (!actor || actor.role !== 'admin' || !superAdminEmail || actor.email !== superAdminEmail) {
    return Response.json({ error: 'Only super admin can delete users' }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const summary = await deleteUserAsSuperAdmin({
      targetUserId: id,
      actor,
      superAdminEmail,
    });

    return Response.json({
      message: 'User deleted successfully',
      summary,
    });
  } catch (error) {
    if (error instanceof AdminUserDeletionError) {
      return Response.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.status }
      );
    }

    console.error('Error deleting user as super admin:', error);
    return Response.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
