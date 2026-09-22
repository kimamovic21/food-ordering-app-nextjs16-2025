import { mongoConnect } from '@/libs/mongoConnect';
import { getRestaurantRatingSummaries } from '@/libs/reviewSummary';
import { Restaurant } from '@/models/restaurant';

vi.mock('@/libs/mongoConnect', () => ({
  mongoConnect: vi.fn(),
}));

vi.mock('@/libs/reviewSummary', () => ({
  getRestaurantRatingSummaries: vi.fn(),
}));

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    find: vi.fn(),
    distinct: vi.fn(),
  },
}));

const loadRestaurantsRoute = async () => import('@/app/api/restaurants/route');

const createRestaurant = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => String(overrides._id || 'restaurant-1') },
  name: 'Pizza House',
  city: 'Sarajevo',
  country: 'BiH',
  street: 'Main Street',
  postalCode: '71000',
  description: 'A public restaurant listing.',
  images: ['https://example.com/restaurant.jpg'],
  workingHours: [
    {
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
      openTime: '00:00',
      closeTime: '23:59',
      isClosed: false,
    },
  ],
  blockedDates: [],
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

const mockRestaurantFind = (restaurants: unknown[]) => {
  const lean = vi.fn().mockResolvedValue(restaurants);
  const sort = vi.fn().mockReturnValue({ lean });
  const select = vi.fn().mockReturnValue({ sort });

  vi.mocked(Restaurant.find).mockReturnValueOnce({ select } as never);

  return { lean, select, sort };
};

const mockRatingMap = (
  entries: Array<[string, { averageRating: number; ratingCount: number }]>
) => {
  vi.mocked(getRestaurantRatingSummaries).mockResolvedValueOnce(new Map(entries) as never);
};

describe('/api/restaurants public route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Restaurant.distinct).mockResolvedValue([] as never);
    mockRatingMap([]);
  });

  it('searches public restaurant fields and caps the response page size at 30', async () => {
    const restaurant = createRestaurant();
    mockRestaurantFind([restaurant]);
    vi.mocked(getRestaurantRatingSummaries).mockReset();
    mockRatingMap([[String(restaurant._id), { averageRating: 4.5, ratingCount: 12 }]]);

    const { GET } = await loadRestaurantsRoute();
    const res = await GET(
      new Request('http://localhost/api/restaurants?q=Pizza.*&page=1&limit=100') as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Restaurant.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: 'Pizza\\.\\*', $options: 'i' } },
        { city: { $regex: 'Pizza\\.\\*', $options: 'i' } },
        { country: { $regex: 'Pizza\\.\\*', $options: 'i' } },
        { street: { $regex: 'Pizza\\.\\*', $options: 'i' } },
        { postalCode: { $regex: 'Pizza\\.\\*', $options: 'i' } },
        { description: { $regex: 'Pizza\\.\\*', $options: 'i' } },
      ],
    });
    expect(body.restaurants[0]).toEqual(
      expect.objectContaining({
        name: restaurant.name,
        image: restaurant.images[0],
        isAcceptingOrders: true,
        averageRating: 4.5,
        ratingCount: 12,
      })
    );
    expect(body.pagination).toEqual({
      total: 1,
      page: 1,
      pageSize: 30,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(mongoConnect).toHaveBeenCalled();
  });

  it('sorts restaurants by distance when valid customer coordinates are provided', async () => {
    const farRestaurant = createRestaurant({
      _id: 'far',
      name: 'Far Pizza',
      latitude: 44,
      longitude: 19,
    });
    const nearRestaurant = createRestaurant({
      _id: 'near',
      name: 'Near Pizza',
      latitude: 43.8564,
      longitude: 18.4132,
    });
    mockRestaurantFind([farRestaurant, nearRestaurant]);
    vi.mocked(getRestaurantRatingSummaries).mockReset();
    mockRatingMap([]);

    const { GET } = await loadRestaurantsRoute();
    const res = await GET(
      new Request(
        'http://localhost/api/restaurants?latitude=43.8563&longitude=18.4131&page=1&limit=10'
      ) as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.restaurants.map((restaurant: any) => restaurant.name)).toEqual([
      'Near Pizza',
      'Far Pizza',
    ]);
    expect(body.restaurants[0].distanceKm).toBeLessThan(body.restaurants[1].distanceKm);
  });

  it('falls back to normal pagination when coordinates are invalid', async () => {
    const restaurant = createRestaurant();
    const query = mockRestaurantFind([restaurant]);
    vi.mocked(getRestaurantRatingSummaries).mockReset();
    mockRatingMap([]);

    const { GET } = await loadRestaurantsRoute();
    const res = await GET(
      new Request('http://localhost/api/restaurants?latitude=bad&longitude=18.4131') as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(body.restaurants[0].distanceKm).toBeNull();
  });

  it('marks restaurants closed when today is blocked or working hours are closed', async () => {
    const blockedToday = createRestaurant({
      _id: 'blocked',
      name: 'Blocked Today',
      blockedDates: [{ date: new Date() }],
    });
    const closedToday = createRestaurant({
      _id: 'closed',
      name: 'Closed Today',
      workingHours: [
        {
          day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
          openTime: '00:00',
          closeTime: '23:59',
          isClosed: true,
        },
      ],
    });
    mockRestaurantFind([blockedToday, closedToday]);
    vi.mocked(getRestaurantRatingSummaries).mockReset();
    mockRatingMap([]);

    const { GET } = await loadRestaurantsRoute();
    const res = await GET(new Request('http://localhost/api/restaurants') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.restaurants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Blocked Today', isOpen: false }),
        expect.objectContaining({ name: 'Closed Today', isOpen: false }),
      ])
    );
  });

  it('filters by accepting status, rating, minimum order, and delivery radius before pagination', async () => {
    const matchingRestaurant = createRestaurant({
      _id: 'matching',
      name: 'Matching Pizza',
      latitude: 43.8564,
      longitude: 18.4132,
      minimumOrderAmount: 10,
      deliveryRadiusKm: 15,
    });
    const pausedRestaurant = createRestaurant({
      _id: 'paused',
      name: 'Paused Pizza',
      latitude: 43.8564,
      longitude: 18.4132,
      minimumOrderAmount: 10,
      deliveryRadiusKm: 15,
      isPaused: true,
    });
    const lowRatedRestaurant = createRestaurant({
      _id: 'low-rated',
      name: 'Low Rated Pizza',
      latitude: 43.8564,
      longitude: 18.4132,
      minimumOrderAmount: 10,
      deliveryRadiusKm: 15,
    });
    mockRestaurantFind([matchingRestaurant, pausedRestaurant, lowRatedRestaurant]);
    vi.mocked(getRestaurantRatingSummaries).mockReset();
    mockRatingMap([
      ['matching', { averageRating: 4.6, ratingCount: 10 }],
      ['paused', { averageRating: 4.8, ratingCount: 12 }],
      ['low-rated', { averageRating: 3.5, ratingCount: 9 }],
      ['expensive', { averageRating: 4.7, ratingCount: 4 }],
    ]);

    const { GET } = await loadRestaurantsRoute();
    const res = await GET(
      new Request(
        'http://localhost/api/restaurants?status=accepting&minRating=4&maxMinimumOrder=20&delivery=to-me&latitude=43.8563&longitude=18.4131'
      ) as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Restaurant.find).toHaveBeenCalledWith(
      expect.objectContaining({ minimumOrderAmount: { $lte: 20 } })
    );
    expect(body.restaurants.map((restaurant: any) => restaurant.name)).toEqual([
      'Matching Pizza',
    ]);
    expect(body.pagination.total).toBe(1);
  });
});
