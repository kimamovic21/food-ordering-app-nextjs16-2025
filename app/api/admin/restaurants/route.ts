import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/libs/authOptions';
import { mongoConnect } from '@/libs/mongoConnect';
import { getRestaurantOrderingStatus } from '@/libs/restaurantAvailability';
import { getRestaurantRatingSummaries } from '@/libs/reviewSummary';
import { Restaurant } from '@/models/restaurant';
import { User } from '@/models/user';

const ADMIN_RESTAURANT_SELECT =
  'ownerId name street city postalCode country latitude longitude contact email webAddress description tax courierFee minimumOrderAmount averagePreparationMinutes averageDeliveryMinutes activeOrderLimit maxItemsPerOrder deliveryRadiusKm isPaused pauseReason workingHours blockedDates totalEmployees images createdAt updatedAt';

const statusFilters = ['all', 'accepting', 'open', 'closed', 'paused'] as const;
const imageFilters = ['all', 'with-images', 'missing-images'] as const;
const capacityFilters = ['all', 'small', 'medium', 'large'] as const;
const blockedDateFilters = ['all', 'yes', 'no'] as const;
const sortOptions = [
  'newest',
  'updated',
  'oldest',
  'name',
  'rating',
  'minimum-order',
  'capacity',
] as const;

type AdminRestaurantStatusFilter = (typeof statusFilters)[number];
type AdminRestaurantImageFilter = (typeof imageFilters)[number];
type AdminRestaurantCapacityFilter = (typeof capacityFilters)[number];
type AdminRestaurantBlockedDateFilter = (typeof blockedDateFilters)[number];
type AdminRestaurantSort = (typeof sortOptions)[number];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
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
      { email: { $regex: safeQuery, $options: 'i' } },
      { contact: { $regex: safeQuery, $options: 'i' } },
    ],
  };
};

const getCapacityBucket = (activeOrderLimit: unknown) => {
  const limit = Number(activeOrderLimit || 0);
  if (limit <= 10) return 'small';
  if (limit <= 30) return 'medium';
  return 'large';
};

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const requestedLimit = parsePositiveInt(searchParams.get('limit'), 10);
    const limit = Math.min(requestedLimit, 50);
    const query = (searchParams.get('q') || '').trim();
    const ownerQuery = (searchParams.get('owner') || '').trim();
    const city = (searchParams.get('city') || '').trim();
    const country = (searchParams.get('country') || '').trim();
    const status = parseEnum<AdminRestaurantStatusFilter>(
      searchParams.get('status'),
      statusFilters,
      'all'
    );
    const imageStatus = parseEnum<AdminRestaurantImageFilter>(
      searchParams.get('imageStatus'),
      imageFilters,
      'all'
    );
    const capacity = parseEnum<AdminRestaurantCapacityFilter>(
      searchParams.get('capacity'),
      capacityFilters,
      'all'
    );
    const blockedDates = parseEnum<AdminRestaurantBlockedDateFilter>(
      searchParams.get('blockedDates'),
      blockedDateFilters,
      'all'
    );
    const sort = parseEnum<AdminRestaurantSort>(searchParams.get('sort'), sortOptions, 'newest');
    const minRating = parseMinRating(searchParams.get('minRating'));
    const maxMinimumOrder = parseMaxMoney(searchParams.get('maxMinimumOrder'));

    const filter: Record<string, unknown> = {
      ...createTextSearchFilter(query),
    };
    const andFilters: Record<string, unknown>[] = [];

    if (city) {
      filter.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
    }

    if (country) {
      filter.country = { $regex: `^${escapeRegex(country)}$`, $options: 'i' };
    }

    if (maxMinimumOrder !== null) {
      filter.minimumOrderAmount = { $lte: maxMinimumOrder };
    }

    if (imageStatus === 'with-images') {
      filter['images.0'] = { $exists: true };
    }

    if (imageStatus === 'missing-images') {
      andFilters.push({
        $or: [{ images: { $exists: false } }, { images: { $size: 0 } }],
      });
    }

    if (blockedDates === 'yes') {
      filter['blockedDates.0'] = { $exists: true };
    }

    if (blockedDates === 'no') {
      andFilters.push({
        $or: [{ blockedDates: { $exists: false } }, { blockedDates: { $size: 0 } }],
      });
    }

    const ownerFilter = ownerQuery
      ? {
          $or: [
            { name: { $regex: escapeRegex(ownerQuery), $options: 'i' } },
            { email: { $regex: escapeRegex(ownerQuery), $options: 'i' } },
          ],
        }
      : {};

    const ownerIds = ownerQuery
      ? await User.find(ownerFilter).select('_id').lean().then((owners) => owners.map((owner) => owner._id))
      : [];

    if (ownerQuery) {
      filter.ownerId = { $in: ownerIds };
    }

    if (andFilters.length > 0) {
      filter.$and = andFilters;
    }

    const [restaurants, cities, countries] = await Promise.all([
      Restaurant.find(filter)
        .select(ADMIN_RESTAURANT_SELECT)
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      Restaurant.distinct('city'),
      Restaurant.distinct('country'),
    ]);

    const now = new Date();
    const ratingMap = await getRestaurantRatingSummaries(
      restaurants.map((restaurant) => restaurant._id)
    );

    const enrichedRestaurants = restaurants.map((restaurant) => {
      const orderingStatus = getRestaurantOrderingStatus({ restaurant, now });
      const rating = ratingMap.get(String(restaurant._id));
      const images = Array.isArray(restaurant.images) ? restaurant.images : [];
      const owner =
        typeof restaurant.ownerId === 'object' && restaurant.ownerId
          ? {
              _id: String((restaurant.ownerId as any)._id),
              name: String((restaurant.ownerId as any).name || 'Unknown owner'),
              email: String((restaurant.ownerId as any).email || ''),
            }
          : null;

      return {
        _id: String(restaurant._id),
        owner,
        name: String(restaurant.name || 'Restaurant'),
        street: String(restaurant.street || ''),
        city: String(restaurant.city || ''),
        postalCode: String(restaurant.postalCode || ''),
        country: String(restaurant.country || ''),
        latitude: Number(restaurant.latitude || 0),
        longitude: Number(restaurant.longitude || 0),
        contact: String(restaurant.contact || ''),
        email: String(restaurant.email || ''),
        webAddress: String(restaurant.webAddress || ''),
        description: String(restaurant.description || ''),
        tax: Number(restaurant.tax || 0),
        courierFee: Number(restaurant.courierFee || 0),
        minimumOrderAmount: Number(restaurant.minimumOrderAmount || 10),
        averagePreparationMinutes: Number(restaurant.averagePreparationMinutes || 25),
        averageDeliveryMinutes: Number(restaurant.averageDeliveryMinutes || 20),
        activeOrderLimit: Number(restaurant.activeOrderLimit || 10),
        maxItemsPerOrder: Number(restaurant.maxItemsPerOrder || 20),
        deliveryRadiusKm: Number(restaurant.deliveryRadiusKm || 10),
        isPaused: Boolean(restaurant.isPaused),
        pauseReason: String(restaurant.pauseReason || ''),
        workingHours: Array.isArray(restaurant.workingHours) ? restaurant.workingHours : [],
        blockedDates: Array.isArray(restaurant.blockedDates) ? restaurant.blockedDates : [],
        totalEmployees: Number(restaurant.totalEmployees || 1),
        images,
        imageCount: images.length,
        primaryImage: images[0] || null,
        isOpen: orderingStatus.isOpen,
        isAcceptingOrders: orderingStatus.isAcceptingOrders,
        averageRating: rating?.averageRating ?? 0,
        ratingCount: rating?.ratingCount ?? 0,
        createdAt: restaurant.createdAt ? new Date(restaurant.createdAt).toISOString() : undefined,
        updatedAt: restaurant.updatedAt ? new Date(restaurant.updatedAt).toISOString() : undefined,
      };
    });

    const filteredRestaurants = enrichedRestaurants.filter((restaurant) => {
      if (status === 'accepting' && !restaurant.isAcceptingOrders) return false;
      if (status === 'open' && !restaurant.isOpen) return false;
      if (status === 'closed' && restaurant.isOpen) return false;
      if (status === 'paused' && !restaurant.isPaused) return false;
      if (capacity !== 'all' && getCapacityBucket(restaurant.activeOrderLimit) !== capacity) {
        return false;
      }
      if (minRating > 0 && restaurant.averageRating < minRating) return false;
      return true;
    });

    const sortedRestaurants = [...filteredRestaurants].sort((left, right) => {
      if (sort === 'name') {
        return left.name.localeCompare(right.name);
      }

      if (sort === 'rating') {
        if (right.averageRating !== left.averageRating) {
          return right.averageRating - left.averageRating;
        }

        return right.ratingCount - left.ratingCount;
      }

      if (sort === 'minimum-order') {
        return left.minimumOrderAmount - right.minimumOrderAmount;
      }

      if (sort === 'capacity') {
        return right.activeOrderLimit - left.activeOrderLimit;
      }

      if (sort === 'oldest') {
        return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
      }

      if (sort === 'updated') {
        return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
      }

      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });

    const total = sortedRestaurants.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedRestaurants = sortedRestaurants.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching admin restaurants:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}
