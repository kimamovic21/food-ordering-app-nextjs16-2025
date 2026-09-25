import { mongoConnect } from '@/libs/mongoConnect';
import { getRestaurantOrderingStatus } from '@/libs/restaurantAvailability';
import { Restaurant } from '@/models/restaurant';

vi.mock('@/libs/mongoConnect', () => ({
  mongoConnect: vi.fn(),
}));

vi.mock('@/libs/restaurantAvailability', () => ({
  getRestaurantOrderingStatus: vi.fn(),
}));

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    find: vi.fn(),
  },
}));

const loadRoute = async () => import('@/app/api/restaurants/map/route');

const createRestaurant = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => String(overrides._id || 'restaurant-1') },
  name: 'Pizza House',
  street: 'Main Street',
  city: 'Sarajevo',
  country: 'Bosnia & Herzegovina',
  latitude: 43.8563,
  longitude: 18.4131,
  workingHours: [],
  blockedDates: [],
  isPaused: false,
  ...overrides,
});

const mockRestaurantFind = (restaurants: unknown[]) => {
  const lean = vi.fn().mockResolvedValue(restaurants);
  const sort = vi.fn(() => ({ lean }));
  const select = vi.fn(() => ({ sort }));

  vi.mocked(Restaurant.find).mockReturnValueOnce({ select } as never);

  return { lean, select, sort };
};

describe('/api/restaurants/map route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRestaurantOrderingStatus).mockReturnValue({
      isOpen: true,
      isPaused: false,
      isAcceptingOrders: true,
    } as never);
  });

  it('returns public restaurant map pins with ordering status', async () => {
    const restaurant = createRestaurant();
    const query = mockRestaurantFind([restaurant]);

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mongoConnect).toHaveBeenCalled();
    expect(Restaurant.find).toHaveBeenCalledWith({
      latitude: { $type: 'number' },
      longitude: { $type: 'number' },
    });
    expect(query.sort).toHaveBeenCalledWith({ city: 1, name: 1 });
    expect(getRestaurantOrderingStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurant,
        deliveryLatitude: null,
        deliveryLongitude: null,
      })
    );
    expect(body.restaurants).toEqual([
      {
        _id: 'restaurant-1',
        name: 'Pizza House',
        street: 'Main Street',
        city: 'Sarajevo',
        country: 'Bosnia & Herzegovina',
        latitude: 43.8563,
        longitude: 18.4131,
        isOpen: true,
        isPaused: false,
        isAcceptingOrders: true,
      },
    ]);
  });

  it('filters out restaurants with invalid coordinates', async () => {
    mockRestaurantFind([
      createRestaurant({ _id: 'valid' }),
      createRestaurant({ _id: 'invalid-latitude', latitude: 120 }),
      createRestaurant({ _id: 'invalid-longitude', longitude: -220 }),
    ]);

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.restaurants.map((restaurant: any) => restaurant._id)).toEqual(['valid']);
  });
});
