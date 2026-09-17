import { NextRequest, NextResponse } from 'next/server';
import { mongoConnect } from '@/libs/mongoConnect';
import { notifyWaitingUsersIfRestaurantAcceptingOrders } from '@/libs/restaurantAvailabilityRequests';
import { getRestaurantOrderingCapacityStatus } from '@/libs/restaurantOrderingStatus';
import { getRestaurantRatingSummaries } from '@/libs/reviewSummary';
import { Restaurant } from '@/models/restaurant';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await mongoConnect();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    const restaurant = await Restaurant.findById(id);

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
          _id: restaurant._id,
          name: restaurant.name,
          street: restaurant.street,
          city: restaurant.city,
          postalCode: restaurant.postalCode,
          country: restaurant.country,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          contact: restaurant.contact,
          email: restaurant.email,
          webAddress: restaurant.webAddress,
          description: restaurant.description,
          images: restaurant.images,
          tax: restaurant.tax,
          courierFee: restaurant.courierFee,
          minimumOrderAmount: orderingStatus.minimumOrderAmount,
          averagePreparationMinutes: restaurant.averagePreparationMinutes,
          averageDeliveryMinutes: restaurant.averageDeliveryMinutes,
          activeOrderLimit: orderingStatus.activeOrderLimit,
          maxItemsPerOrder: orderingStatus.maxItemsPerOrder,
          deliveryRadiusKm: orderingStatus.deliveryRadiusKm,
          activeKitchenOrders: orderingStatus.activeKitchenOrders,
          isBusy: orderingStatus.isBusy,
          isPaused: orderingStatus.isPaused,
          pauseReason: orderingStatus.pauseReason,
          isAcceptingOrders: orderingStatus.isAcceptingOrders,
          orderingUnavailableReason: orderingStatus.reason,
          workingHours: restaurant.workingHours,
          blockedDates: restaurant.blockedDates,
          isOpen: orderingStatus.isOpen,
          averageRating: rating?.averageRating ?? 0,
          ratingCount: rating?.ratingCount ?? 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurant' }, { status: 500 });
  }
}
