import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/libs/authOptions';
import { mongoConnect } from '@/libs/mongoConnect';
import { getRestaurantOrderingCapacityStatus } from '@/libs/restaurantOrderingStatus';
import { getRestaurantRatingSummaries } from '@/libs/reviewSummary';
import { Coupon } from '@/models/coupon';
import { MenuItem } from '@/models/menuItem';
import { Order } from '@/models/order';
import { Restaurant } from '@/models/restaurant';
import { User } from '@/models/user';

const ACTIVE_ORDER_STATUSES = ['placed', 'processing', 'ready', 'transportation', 'delivered'];

const RESTAURANT_SELECT =
  'ownerId name street city postalCode country latitude longitude contact email webAddress description tax courierFee minimumOrderAmount averagePreparationMinutes averageDeliveryMinutes activeOrderLimit maxItemsPerOrder deliveryRadiusKm isPaused pauseReason workingHours blockedDates totalEmployees images createdAt updatedAt';

const getTodayDateRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { end, start };
};

const getPaidOrderFilter = (restaurantId: mongoose.Types.ObjectId) => ({
  restaurantId,
  orderStatus: { $ne: 'canceled' },
  $or: [{ paid: true }, { orderPaid: true }],
});

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await mongoConnect();
    const session = await getServerSession(authOptions);
    const actorEmail = session?.user?.email;
    const superAdminEmail =
      process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

    if (!actorEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actor = await User.findOne({ email: actorEmail }).select('email role').lean();

    if (!actor || actor.role !== 'admin' || !superAdminEmail || actor.email !== superAdminEmail) {
      return NextResponse.json({ error: 'Only super admin can view restaurants' }, { status: 403 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    const restaurant = await Restaurant.findById(id)
      .select(RESTAURANT_SELECT)
      .populate('ownerId', 'name email phone image role city country createdAt')
      .lean();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const { end, start } = getTodayDateRange();
    const restaurantId = String(restaurant._id);
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const paidOrderFilter = getPaidOrderFilter(restaurantObjectId);

    const [
      orderingStatus,
      ratingMap,
      totalMenuItems,
      availableMenuItems,
      totalOrders,
      activeOrders,
      completedOrders,
      canceledOrders,
      unpaidOrders,
      todayOrders,
      revenueResult,
      todayRevenueResult,
      lastOrder,
      totalCoupons,
      activeCoupons,
      publicCoupons,
    ] = await Promise.all([
      getRestaurantOrderingCapacityStatus({ restaurant, includeCourierReadiness: true }),
      getRestaurantRatingSummaries([restaurant._id]),
      MenuItem.countDocuments({ restaurantId: restaurantObjectId }),
      MenuItem.countDocuments({ restaurantId: restaurantObjectId, isAvailable: true }),
      Order.countDocuments({ restaurantId: restaurantObjectId }),
      Order.countDocuments({
        restaurantId: restaurantObjectId,
        orderStatus: { $in: ACTIVE_ORDER_STATUSES },
      }),
      Order.countDocuments({ restaurantId: restaurantObjectId, orderStatus: 'completed' }),
      Order.countDocuments({ restaurantId: restaurantObjectId, orderStatus: 'canceled' }),
      Order.countDocuments({
        restaurantId: restaurantObjectId,
        orderStatus: { $ne: 'canceled' },
        $or: [{ paid: false }, { orderPaid: false }],
      }),
      Order.countDocuments({
        restaurantId: restaurantObjectId,
        createdAt: { $gte: start, $lt: end },
      }),
      Order.aggregate([
        { $match: paidOrderFilter },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...paidOrderFilter,
            createdAt: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: null, todayRevenue: { $sum: '$total' } } },
      ]),
      Order.findOne({ restaurantId: restaurantObjectId })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean(),
      Coupon.countDocuments({ restaurantId: restaurantObjectId }),
      Coupon.countDocuments({ restaurantId: restaurantObjectId, isActive: true }),
      Coupon.countDocuments({ restaurantId: restaurantObjectId, isPublic: true }),
    ]);

    const rating = ratingMap.get(restaurantId);
    const images = Array.isArray(restaurant.images) ? restaurant.images : [];
    const owner =
      typeof restaurant.ownerId === 'object' && restaurant.ownerId
        ? {
            _id: String((restaurant.ownerId as any)._id),
            name: String((restaurant.ownerId as any).name || 'Unknown owner'),
            email: String((restaurant.ownerId as any).email || ''),
            phone: String((restaurant.ownerId as any).phone || ''),
            image: String((restaurant.ownerId as any).image || ''),
            role: String((restaurant.ownerId as any).role || ''),
            city: String((restaurant.ownerId as any).city || ''),
            country: String((restaurant.ownerId as any).country || ''),
            createdAt: (restaurant.ownerId as any).createdAt
              ? new Date((restaurant.ownerId as any).createdAt).toISOString()
              : undefined,
          }
        : null;

    return NextResponse.json({
      restaurant: {
        ...restaurant,
        _id: restaurantId,
        owner,
        images,
        imageCount: images.length,
        primaryImage: images[0] || null,
        isOpen: orderingStatus.isOpen,
        isPaused: orderingStatus.isPaused,
        pauseReason: orderingStatus.pauseReason,
        isAcceptingOrders: orderingStatus.isAcceptingOrders,
        averageRating: rating?.averageRating ?? 0,
        ratingCount: rating?.ratingCount ?? 0,
        createdAt: restaurant.createdAt ? new Date(restaurant.createdAt).toISOString() : undefined,
        updatedAt: restaurant.updatedAt ? new Date(restaurant.updatedAt).toISOString() : undefined,
      },
      operationalSummary: {
        activeKitchenOrders: orderingStatus.activeKitchenOrders,
        activeOrderLimit: orderingStatus.activeOrderLimit,
        availableCouriers: orderingStatus.availableCouriers,
        capacitySlotsRemaining: orderingStatus.capacitySlotsRemaining,
        courierReadinessDelayMinutes: orderingStatus.courierReadinessDelayMinutes,
        courierReadinessMessage: orderingStatus.courierReadinessMessage,
        courierReadinessTone: orderingStatus.courierReadinessTone,
        isAtCapacity: orderingStatus.isAtCapacity,
        isBusy: orderingStatus.isBusy,
        isCourierReady: orderingStatus.isCourierReady,
        isNearCapacity: orderingStatus.isNearCapacity,
        shouldSuggestPause: orderingStatus.shouldSuggestPause,
        capacityMessage: orderingStatus.capacityMessage,
        estimatedPreparationMinutes: orderingStatus.estimatedPreparationMinutes,
        estimatedDeliveryMinutes: orderingStatus.estimatedDeliveryMinutes,
        estimatedTotalMinutes: orderingStatus.estimatedTotalMinutes,
        etaDelayMinutes: orderingStatus.etaDelayMinutes,
        etaMessage: orderingStatus.etaMessage,
        etaTone: orderingStatus.etaTone,
        orderingMessage: orderingStatus.orderingMessage,
        orderingUnavailableReason: orderingStatus.reason,
        totalCouriers: orderingStatus.totalCouriers,
      },
      menuSummary: {
        total: totalMenuItems,
        available: availableMenuItems,
        unavailable: Math.max(0, totalMenuItems - availableMenuItems),
      },
      orderSummary: {
        total: totalOrders,
        active: activeOrders,
        completed: completedOrders,
        canceled: canceledOrders,
        unpaid: unpaidOrders,
        todayOrders,
        totalRevenue: Number((revenueResult?.[0]?.totalRevenue || 0).toFixed(2)),
        todayRevenue: Number((todayRevenueResult?.[0]?.todayRevenue || 0).toFixed(2)),
        lastOrderAt: lastOrder?.createdAt ? new Date(lastOrder.createdAt).toISOString() : null,
      },
      couponSummary: {
        total: totalCoupons,
        active: activeCoupons,
        public: publicCoupons,
      },
    });
  } catch (error) {
    console.error('Error fetching admin restaurant details:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurant' }, { status: 500 });
  }
}
