import { NextRequest, NextResponse } from 'next/server';
import { mongoConnect } from '@/libs/mongoConnect';
import { getRestaurantOrderingStatus } from '@/libs/restaurantAvailability';
import { getRestaurantRatingSummaries } from '@/libs/reviewSummary';
import { Restaurant } from '@/models/restaurant';

const RESTAURANT_SELECT =
  'name city country street postalCode description images workingHours blockedDates createdAt latitude longitude isPaused pauseReason deliveryRadiusKm minimumOrderAmount averagePreparationMinutes averageDeliveryMinutes activeOrderLimit maxItemsPerOrder';

const statusFilters = ['all', 'accepting', 'open', 'closed', 'paused'] as const;
const sortOptions = ['smart', 'nearest', 'rating', 'newest', 'name', 'minimum-order'] as const;
const deliveryFilters = ['all', 'to-me'] as const;

type PublicRestaurantStatusFilter = (typeof statusFilters)[number];
type PublicRestaurantSort = (typeof sortOptions)[number];
type PublicRestaurantDeliveryFilter = (typeof deliveryFilters)[number];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const parseCoordinate = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidCoordinatePair = (latitude: number | null, longitude: number | null) => {
  if (latitude === null || longitude === null) {
    return false;
  }

  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

const parseEnum = <TValue extends string>(
  value: string | null,
  allowedValues: readonly TValue[],
  fallback: TValue
) => (value && allowedValues.includes(value as TValue) ? (value as TValue) : fallback);

const parseMinRating = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(5, parsed);
};

const parseMaxMoney = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const normalizeDistinctStrings = (values: unknown[]) =>
  values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

const createTextSearchFilter = (query: string) => {
  if (!query) {
    return {};
  }

  const safeQuery = escapeRegex(query);

  return {
    $or: [
      { name: { $regex: safeQuery, $options: 'i' } },
      { city: { $regex: safeQuery, $options: 'i' } },
      { country: { $regex: safeQuery, $options: 'i' } },
      { street: { $regex: safeQuery, $options: 'i' } },
      { postalCode: { $regex: safeQuery, $options: 'i' } },
      { description: { $regex: safeQuery, $options: 'i' } },
    ],
  };
};

const compareNullableDistance = (left: number | null, right: number | null) => {
  const leftDistance = left ?? Number.POSITIVE_INFINITY;
  const rightDistance = right ?? Number.POSITIVE_INFINITY;
  return leftDistance - rightDistance;
};

export async function GET(req: NextRequest) {
  try {
    await mongoConnect();

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const requestedLimit = parsePositiveInt(searchParams.get('limit'), 9);
    const limit = Math.min(requestedLimit, 30);
    const query = (searchParams.get('q') || '').trim();
    const city = (searchParams.get('city') || '').trim();
    const country = (searchParams.get('country') || '').trim();
    const status = parseEnum<PublicRestaurantStatusFilter>(
      searchParams.get('status'),
      statusFilters,
      'all'
    );
    const sort = parseEnum<PublicRestaurantSort>(searchParams.get('sort'), sortOptions, 'smart');
    const delivery = parseEnum<PublicRestaurantDeliveryFilter>(
      searchParams.get('delivery'),
      deliveryFilters,
      'all'
    );
    const minRating = parseMinRating(searchParams.get('minRating'));
    const maxMinimumOrder = parseMaxMoney(searchParams.get('maxMinimumOrder'));
    const latitude = parseCoordinate(searchParams.get('latitude'));
    const longitude = parseCoordinate(searchParams.get('longitude'));
    const hasValidLocation = isValidCoordinatePair(latitude, longitude);

    const filter: Record<string, unknown> = {
      ...createTextSearchFilter(query),
    };

    if (city) {
      filter.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
    }

    if (country) {
      filter.country = { $regex: `^${escapeRegex(country)}$`, $options: 'i' };
    }

    if (maxMinimumOrder !== null) {
      filter.minimumOrderAmount = { $lte: maxMinimumOrder };
    }

    const [restaurants, cities, countries] = await Promise.all([
      Restaurant.find(filter).select(RESTAURANT_SELECT).sort({ createdAt: -1 }).lean(),
      Restaurant.distinct('city'),
      Restaurant.distinct('country'),
    ]);

    const now = new Date();
    const ratingMap = await getRestaurantRatingSummaries(
      restaurants.map((restaurant) => restaurant._id)
    );

    const enrichedRestaurants = restaurants.map((restaurant) => {
      const orderingStatus = getRestaurantOrderingStatus({
        restaurant,
        deliveryLatitude: hasValidLocation ? latitude : null,
        deliveryLongitude: hasValidLocation ? longitude : null,
        now,
      });
      const rating = ratingMap.get(String(restaurant._id));

      return {
        _id: restaurant._id,
        name: restaurant.name,
        city: restaurant.city,
        country: restaurant.country,
        street: restaurant.street,
        description: restaurant.description,
        image: Array.isArray(restaurant.images) ? restaurant.images[0] || null : null,
        isOpen: orderingStatus.isOpen,
        isPaused: orderingStatus.isPaused,
        isAcceptingOrders: orderingStatus.isAcceptingOrders,
        distanceKm: orderingStatus.distanceKm,
        deliveryRadiusKm: orderingStatus.deliveryRadiusKm,
        minimumOrderAmount: Number(restaurant.minimumOrderAmount || 10),
        averagePreparationMinutes: Number(restaurant.averagePreparationMinutes || 25),
        averageDeliveryMinutes: Number(restaurant.averageDeliveryMinutes || 20),
        averageRating: rating?.averageRating ?? 0,
        ratingCount: rating?.ratingCount ?? 0,
        isWithinDeliveryRadius: orderingStatus.isWithinDeliveryRadius,
        createdAt: restaurant.createdAt,
      };
    });

    const filteredRestaurants = enrichedRestaurants.filter((restaurant) => {
      if (status === 'accepting' && !restaurant.isAcceptingOrders) return false;
      if (status === 'open' && !restaurant.isOpen) return false;
      if (status === 'closed' && restaurant.isOpen) return false;
      if (status === 'paused' && !restaurant.isPaused) return false;
      if (delivery === 'to-me' && restaurant.isWithinDeliveryRadius !== true) return false;
      if (minRating > 0 && restaurant.averageRating < minRating) return false;
      return true;
    });

    const sortedRestaurants = [...filteredRestaurants].sort((left, right) => {
      if (sort === 'name') {
        return String(left.name).localeCompare(String(right.name));
      }

      if (sort === 'rating') {
        if (right.averageRating !== left.averageRating) {
          return right.averageRating - left.averageRating;
        }

        return right.ratingCount - left.ratingCount;
      }

      if (sort === 'minimum-order') {
        if (left.minimumOrderAmount !== right.minimumOrderAmount) {
          return left.minimumOrderAmount - right.minimumOrderAmount;
        }

        return String(left.name).localeCompare(String(right.name));
      }

      if (sort === 'nearest') {
        const distanceSort = compareNullableDistance(left.distanceKm, right.distanceKm);
        return distanceSort || String(left.name).localeCompare(String(right.name));
      }

      if (sort === 'newest') {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      if (left.isAcceptingOrders !== right.isAcceptingOrders) {
        return left.isAcceptingOrders ? -1 : 1;
      }

      if (hasValidLocation) {
        const distanceSort = compareNullableDistance(left.distanceKm, right.distanceKm);
        if (distanceSort) return distanceSort;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    const total = sortedRestaurants.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedRestaurants = sortedRestaurants
      .slice((page - 1) * limit, page * limit)
      .map(
        ({
          createdAt: _createdAt,
          isWithinDeliveryRadius: _isWithinDeliveryRadius,
          ...restaurant
        }) => restaurant
      );

    return NextResponse.json(
      {
        restaurants: paginatedRestaurants,
        filterOptions: {
          cities: normalizeDistinctStrings(cities),
          countries: normalizeDistinctStrings(countries),
        },
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}
