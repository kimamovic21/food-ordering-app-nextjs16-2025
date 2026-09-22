import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { mongoConnect } from '@/libs/mongoConnect';
import { getRestaurantOrderingCapacityStatus } from '@/libs/restaurantOrderingStatus';
import { getRestaurantRatingSummaries } from '@/libs/reviewSummary';
import { Coupon } from '@/models/coupon';
import { MenuItem } from '@/models/menuItem';
import { Order } from '@/models/order';
import { Restaurant } from '@/models/restaurant';
import { User } from '@/models/user';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/libs/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/libs/mongoConnect', () => ({
  mongoConnect: vi.fn(),
}));

vi.mock('@/libs/restaurantOrderingStatus', () => ({
  getRestaurantOrderingCapacityStatus: vi.fn(),
}));

vi.mock('@/libs/reviewSummary', () => ({
  getRestaurantRatingSummaries: vi.fn(),
}));

vi.mock('@/models/coupon', () => ({
  Coupon: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('@/models/menuItem', () => ({
  MenuItem: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('@/models/order', () => ({
  Order: {
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    findById: vi.fn(),
  },
}));

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

const loadRoute = async () => import('@/app/api/admin/restaurants/[id]/route');

const restaurantObjectId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
const ownerObjectId = new mongoose.Types.ObjectId('507f191e810c19729de860ea');

const workingHours = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
].map((day) => ({
  day,
  openTime: '09:00',
  closeTime: '21:00',
  isClosed: false,
}));

const mockActor = (actor: Record<string, unknown> | null) => {
  const lean = vi.fn().mockResolvedValueOnce(actor);
  const select = vi.fn(() => ({ lean }));

  vi.mocked(User.findOne).mockReturnValueOnce({ select } as never);

  return { lean, select };
};

const mockRestaurant = (restaurant: Record<string, unknown> | null) => {
  const lean = vi.fn().mockResolvedValueOnce(restaurant);
  const populate = vi.fn(() => ({ lean }));
  const select = vi.fn(() => ({ populate }));

  vi.mocked(Restaurant.findById).mockReturnValueOnce({ select } as never);

  return { lean, populate, select };
};

const mockLastOrder = (value: Record<string, unknown> | null) => {
  const lean = vi.fn().mockResolvedValueOnce(value);
  const select = vi.fn(() => ({ lean }));
  const sort = vi.fn(() => ({ select }));

  vi.mocked(Order.findOne).mockReturnValueOnce({ sort } as never);

  return { lean, select, sort };
};

const restaurantFixture = {
  _id: restaurantObjectId,
  ownerId: {
    _id: ownerObjectId,
    name: 'Restaurant Owner',
    email: 'owner@example.com',
    phone: '+38761123456',
    image: 'https://example.com/owner.jpg',
    role: 'admin',
    city: 'Sarajevo',
    country: 'Bosnia & Herzegovina',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
  },
  name: 'Pizza Hub Admin View',
  street: 'Main Street 1',
  city: 'Sarajevo',
  postalCode: '71000',
  country: 'Bosnia & Herzegovina',
  latitude: 43.8563,
  longitude: 18.4131,
  contact: '+38761111111',
  email: 'restaurant@example.com',
  webAddress: 'https://example.com',
  description: 'A restaurant used for admin detail tests.',
  tax: 17,
  courierFee: 5,
  minimumOrderAmount: 10,
  averagePreparationMinutes: 25,
  averageDeliveryMinutes: 20,
  activeOrderLimit: 10,
  maxItemsPerOrder: 20,
  deliveryRadiusKm: 10,
  isPaused: false,
  pauseReason: '',
  workingHours,
  blockedDates: [{ date: new Date('2026-09-30T00:00:00.000Z'), reason: 'Maintenance' }],
  totalEmployees: 8,
  images: ['https://example.com/restaurant-1.jpg', 'https://example.com/restaurant-2.jpg'],
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:00:00.000Z'),
};

const orderingStatusFixture = {
  activeKitchenOrders: 3,
  activeOrderLimit: 10,
  capacityMessage: '7 active order slots available.',
  capacitySlotsRemaining: 7,
  estimatedDeliveryMinutes: 20,
  estimatedPreparationMinutes: 30,
  estimatedTotalMinutes: 50,
  etaDelayMinutes: 5,
  etaMessage: 'About 50 minutes total.',
  etaTone: 'moderate',
  isAcceptingOrders: true,
  isAtCapacity: false,
  isBusy: false,
  isNearCapacity: true,
  isOpen: true,
  isPaused: false,
  maxItemsPerOrder: 20,
  minimumOrderAmount: 10,
  orderingMessage: 'Restaurant is accepting orders.',
  pauseReason: '',
  reason: null,
  shouldSuggestPause: false,
};

describe('GET /api/admin/restaurants/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    delete process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    vi.mocked(getRestaurantOrderingCapacityStatus).mockResolvedValue(
      orderingStatusFixture as never
    );
    vi.mocked(getRestaurantRatingSummaries).mockResolvedValue(new Map() as never);
  });

  it('requires an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);

    const { GET } = await loadRoute();
    const response = await GET({} as never, {
      params: Promise.resolve({ id: restaurantObjectId.toString() }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mongoConnect).toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('blocks admins who are not the configured super admin', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    mockActor({ email: 'admin@example.com', role: 'admin' });

    const { GET } = await loadRoute();
    const response = await GET({} as never, {
      params: Promise.resolve({ id: restaurantObjectId.toString() }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Only super admin can view restaurants' });
    expect(Restaurant.findById).not.toHaveBeenCalled();
  });

  it('rejects invalid restaurant ids', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);
    mockActor({ email: 'super@example.com', role: 'admin' });

    const { GET } = await loadRoute();
    const response = await GET({} as never, {
      params: Promise.resolve({ id: 'bad-id' }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid restaurant ID' });
    expect(Restaurant.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when the restaurant does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);
    mockActor({ email: 'super@example.com', role: 'admin' });
    mockRestaurant(null);

    const { GET } = await loadRoute();
    const response = await GET({} as never, {
      params: Promise.resolve({ id: restaurantObjectId.toString() }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Restaurant not found' });
  });

  it('returns superadmin restaurant details with operational summaries', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);
    mockActor({ email: 'super@example.com', role: 'admin' });
    const restaurantQuery = mockRestaurant(restaurantFixture);
    vi.mocked(getRestaurantRatingSummaries).mockResolvedValueOnce(
      new Map([[restaurantObjectId.toString(), { averageRating: 4.75, ratingCount: 8 }]]) as never
    );
    vi.mocked(MenuItem.countDocuments)
      .mockResolvedValueOnce(12 as never)
      .mockResolvedValueOnce(9 as never);
    vi.mocked(Order.countDocuments)
      .mockResolvedValueOnce(20 as never)
      .mockResolvedValueOnce(3 as never)
      .mockResolvedValueOnce(12 as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce(1 as never)
      .mockResolvedValueOnce(4 as never);
    vi.mocked(Order.aggregate)
      .mockResolvedValueOnce([{ totalRevenue: 123.456 }] as never)
      .mockResolvedValueOnce([{ todayRevenue: 45.678 }] as never);
    mockLastOrder({ createdAt: new Date('2026-09-20T12:00:00.000Z') });
    vi.mocked(Coupon.countDocuments)
      .mockResolvedValueOnce(5 as never)
      .mockResolvedValueOnce(3 as never)
      .mockResolvedValueOnce(2 as never);

    const { GET } = await loadRoute();
    const response = await GET({} as never, {
      params: Promise.resolve({ id: restaurantObjectId.toString() }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Restaurant.findById).toHaveBeenCalledWith(restaurantObjectId.toString());
    expect(restaurantQuery.populate).toHaveBeenCalledWith(
      'ownerId',
      'name email phone image role city country createdAt'
    );
    expect(getRestaurantOrderingCapacityStatus).toHaveBeenCalledWith({
      restaurant: restaurantFixture,
    });
    expect(body.restaurant).toEqual(
      expect.objectContaining({
        _id: restaurantObjectId.toString(),
        averageRating: 4.75,
        imageCount: 2,
        isAcceptingOrders: true,
        name: 'Pizza Hub Admin View',
        primaryImage: 'https://example.com/restaurant-1.jpg',
      })
    );
    expect(body.restaurant.owner).toEqual(
      expect.objectContaining({
        _id: ownerObjectId.toString(),
        email: 'owner@example.com',
        name: 'Restaurant Owner',
      })
    );
    expect(body.operationalSummary).toEqual(
      expect.objectContaining({
        activeKitchenOrders: 3,
        capacitySlotsRemaining: 7,
        estimatedTotalMinutes: 50,
        etaTone: 'moderate',
      })
    );
    expect(body.menuSummary).toEqual({ available: 9, total: 12, unavailable: 3 });
    expect(body.orderSummary).toEqual(
      expect.objectContaining({
        active: 3,
        canceled: 2,
        completed: 12,
        todayOrders: 4,
        todayRevenue: 45.68,
        total: 20,
        totalRevenue: 123.46,
        unpaid: 1,
      })
    );
    expect(body.couponSummary).toEqual({ active: 3, public: 2, total: 5 });

    const revenuePipeline = vi.mocked(Order.aggregate).mock.calls[0]?.[0] as Array<{
      $match?: { restaurantId?: unknown };
    }>;
    expect(String(revenuePipeline[0]?.$match?.restaurantId)).toBe(restaurantObjectId.toString());
  });
});
