import { NextResponse } from 'next/server';
import { mongoConnect } from '@/libs/mongoConnect';
import { getRestaurantOrderingStatus } from '@/libs/restaurantAvailability';
import { Restaurant } from '@/models/restaurant';
import type { RestaurantMapPin, RestaurantMapResponse } from '@/types/restaurant';

const RESTAURANT_MAP_SELECT =
  'name street city country latitude longitude workingHours blockedDates isPaused pauseReason deliveryRadiusKm';

const isValidCoordinate = (latitude: unknown, longitude: unknown) =>
  typeof latitude === 'number' &&
  typeof longitude === 'number' &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

export async function GET() {
  try {
    await mongoConnect();

    const restaurants = await Restaurant.find({
      latitude: { $type: 'number' },
      longitude: { $type: 'number' },
    })
      .select(RESTAURANT_MAP_SELECT)
      .sort({ city: 1, name: 1 })
      .lean();

    const now = new Date();
    const pins: RestaurantMapPin[] = restaurants
      .filter((restaurant) => isValidCoordinate(restaurant.latitude, restaurant.longitude))
      .map((restaurant) => {
        const orderingStatus = getRestaurantOrderingStatus({
          restaurant,
          deliveryLatitude: null,
          deliveryLongitude: null,
          now,
        });

        return {
          _id: restaurant._id.toString(),
          name: restaurant.name,
          street: restaurant.street,
          city: restaurant.city,
          country: restaurant.country,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          isOpen: orderingStatus.isOpen,
          isPaused: orderingStatus.isPaused,
          isAcceptingOrders: orderingStatus.isAcceptingOrders,
        };
      });

    return NextResponse.json({ restaurants: pins } satisfies RestaurantMapResponse, {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching restaurant map pins:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurant locations' }, { status: 500 });
  }
}
