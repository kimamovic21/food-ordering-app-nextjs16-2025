import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { mongoConnect } from '@/libs/mongoConnect';
import { notifyWaitingUsersIfRestaurantAcceptingOrders } from '@/libs/restaurantAvailabilityRequests';
import { getRestaurantOrderingCapacityStatus } from '@/libs/restaurantOrderingStatus';
import { Restaurant } from '@/models/restaurant';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await mongoConnect();

  const { id } = await context.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid restaurant ID' }, { status: 400 });
  }

  const restaurant = await Restaurant.findById(id)
    .select(
      'name workingHours blockedDates deliveryRadiusKm isPaused pauseReason activeOrderLimit maxItemsPerOrder minimumOrderAmount averagePreparationMinutes averageDeliveryMinutes'
    )
    .lean();

  if (!restaurant) {
    return Response.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const orderingStatus = await getRestaurantOrderingCapacityStatus({ restaurant });

  await notifyWaitingUsersIfRestaurantAcceptingOrders({
    restaurantId: restaurant._id,
    restaurantName: restaurant.name,
    isAcceptingOrders: orderingStatus.isAcceptingOrders,
  });

  return Response.json({
    restaurantId: String(restaurant._id),
    restaurantName: restaurant.name,
    isOpen: orderingStatus.isOpen,
    isPaused: orderingStatus.isPaused,
    isBusy: orderingStatus.isBusy,
    isAcceptingOrders: orderingStatus.isAcceptingOrders,
    activeKitchenOrders: orderingStatus.activeKitchenOrders,
    activeOrderLimit: orderingStatus.activeOrderLimit,
    capacityMessage: orderingStatus.capacityMessage,
    capacitySlotsRemaining: orderingStatus.capacitySlotsRemaining,
    estimatedPreparationMinutes: orderingStatus.estimatedPreparationMinutes,
    estimatedDeliveryMinutes: orderingStatus.estimatedDeliveryMinutes,
    estimatedTotalMinutes: orderingStatus.estimatedTotalMinutes,
    etaDelayMinutes: orderingStatus.etaDelayMinutes,
    etaMessage: orderingStatus.etaMessage,
    etaTone: orderingStatus.etaTone,
    maxItemsPerOrder: orderingStatus.maxItemsPerOrder,
    orderingMessage: orderingStatus.orderingMessage,
    reason: orderingStatus.reason,
  });
}
