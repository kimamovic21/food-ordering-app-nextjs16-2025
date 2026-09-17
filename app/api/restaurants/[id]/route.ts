import { NextRequest, NextResponse } from 'next/server';
import { mongoConnect } from '@/libs/mongoConnect';
import { notifyWaitingUsersIfRestaurantAcceptingOrders } from '@/libs/restaurantAvailabilityRequests';
import { getRestaurantOrderingCapacityStatus } from '@/libs/restaurantOrderingStatus';
import { getRestaurantRatingSummaries } from '@/libs/reviewSummary';
import { Restaurant } from '@/models/restaurant';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await mongoConnect();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    const restaurant = await Restaurant.findById(id)
      .select(
        'name street city postalCode country latitude longitude contact email webAddress description images workingHours blockedDates tax courierFee minimumOrderAmount averagePreparationMinutes averageDeliveryMinutes activeOrderLimit maxItemsPerOrder deliveryRadiusKm isPaused pauseReason totalEmployees createdAt updatedAt'
      )
      .lean();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const orderingStatus = await getRestaurantOrderingCapacityStatus({ restaurant });
    const ratingMap = await getRestaurantRatingSummaries([restaurant._id]);
    const rating = ratingMap.get(String(restaurant._id));

    await notifyWaitingUsersIfRestaurantAcceptingOrders({
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      isAcceptingOrders: orderingStatus.isAcceptingOrders,
    });

    return NextResponse.json(
      {
        restaurant: {
          ...restaurant,
          isOpen: orderingStatus.isOpen,
          isPaused: orderingStatus.isPaused,
          pauseReason: orderingStatus.pauseReason,
          isAcceptingOrders: orderingStatus.isAcceptingOrders,
          orderingUnavailableReason: orderingStatus.reason,
          deliveryRadiusKm: orderingStatus.deliveryRadiusKm,
          minimumOrderAmount: orderingStatus.minimumOrderAmount,
          activeOrderLimit: orderingStatus.activeOrderLimit,
          maxItemsPerOrder: orderingStatus.maxItemsPerOrder,
          activeKitchenOrders: orderingStatus.activeKitchenOrders,
          capacityMessage: orderingStatus.capacityMessage,
          capacitySlotsRemaining: orderingStatus.capacitySlotsRemaining,
          estimatedPreparationMinutes: orderingStatus.estimatedPreparationMinutes,
          estimatedDeliveryMinutes: orderingStatus.estimatedDeliveryMinutes,
          estimatedTotalMinutes: orderingStatus.estimatedTotalMinutes,
          etaDelayMinutes: orderingStatus.etaDelayMinutes,
          etaMessage: orderingStatus.etaMessage,
          etaTone: orderingStatus.etaTone,
          isBusy: orderingStatus.isBusy,
          isNearCapacity: orderingStatus.isNearCapacity,
          orderingMessage: orderingStatus.orderingMessage,
          averageRating: rating?.averageRating ?? 0,
          ratingCount: rating?.ratingCount ?? 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurant' }, { status: 500 });
  }
}
