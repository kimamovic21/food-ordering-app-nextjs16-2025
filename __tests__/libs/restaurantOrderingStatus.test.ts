import { Order } from '@/models/order';
import { buildCourierReadinessSnapshot } from '@/libs/courierReadiness';
import {
  getRestaurantActiveKitchenOrdersQuery,
  getRestaurantCartValidationMessage,
  getRestaurantCartValidationStatus,
  getRestaurantOrderingCapacityStatus,
  RESTAURANT_BUSY_MESSAGE,
} from '@/libs/restaurantOrderingStatus';

vi.mock('@/models/order', () => ({
  Order: {
    countDocuments: vi.fn(),
  },
}));

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
  openTime: '00:00',
  closeTime: '23:59',
  isClosed: false,
}));

const createRestaurant = (overrides: Record<string, unknown> = {}) => ({
  _id: 'restaurant-1',
  activeOrderLimit: 10,
  blockedDates: [],
  deliveryRadiusKm: 10,
  isPaused: false,
  latitude: 43,
  longitude: 18,
  maxItemsPerOrder: 20,
  minimumOrderAmount: 10,
  name: 'Pizza Hub',
  pauseReason: '',
  workingHours,
  ...overrides,
});

describe('restaurant ordering capacity status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Order.countDocuments).mockResolvedValue(0 as never);
  });

  it('counts paid active kitchen orders with the shared query', async () => {
    vi.mocked(Order.countDocuments).mockResolvedValueOnce(2 as never);

    const status = await getRestaurantOrderingCapacityStatus({
      restaurant: createRestaurant({ activeOrderLimit: 2 }),
      now: new Date('2026-09-14T12:00:00.000Z'),
    });

    expect(Order.countDocuments).toHaveBeenCalledWith(
      getRestaurantActiveKitchenOrdersQuery('restaurant-1')
    );
    expect(status).toEqual(
      expect.objectContaining({
        activeKitchenOrders: 2,
        activeOrderLimit: 2,
        capacitySlotsRemaining: 0,
        estimatedPreparationMinutes: 45,
        estimatedTotalMinutes: 65,
        etaDelayMinutes: 20,
        etaTone: 'at_capacity',
        isAcceptingOrders: false,
        isBusy: true,
        reason: `${RESTAURANT_BUSY_MESSAGE} Kitchen is at capacity with 2 active paid orders.`,
      })
    );
  });

  it('builds cart validation status and messages from the centralized status', async () => {
    const orderingStatus = await getRestaurantOrderingCapacityStatus({
      restaurant: createRestaurant({ maxItemsPerOrder: 2, minimumOrderAmount: 20 }),
      activeKitchenOrders: 0,
      deliveryLatitude: 43.01,
      deliveryLongitude: 18.01,
      now: new Date('2026-09-14T12:00:00.000Z'),
    });

    expect(Order.countDocuments).not.toHaveBeenCalled();
    expect(orderingStatus.estimatedPreparationMinutes).toBe(25);
    expect(orderingStatus.estimatedDeliveryMinutes).toBe(20);
    expect(orderingStatus.estimatedTotalMinutes).toBe(45);

    const orderLimitStatus = getRestaurantCartValidationStatus({
      orderingStatus,
      subtotal: 30,
      totalCartQuantity: 3,
    });

    expect(orderLimitStatus).toBe('order_quantity_limit');
    expect(
      getRestaurantCartValidationMessage({
        orderingStatus,
        restaurantStatus: orderLimitStatus,
        totalCartQuantity: 3,
      })
    ).toBe('This restaurant accepts up to 2 items in one order. Your cart has 3 items.');

    expect(
      getRestaurantCartValidationStatus({
        orderingStatus,
        subtotal: 12,
        totalCartQuantity: 1,
      })
    ).toBe('below_minimum');
  });

  it('adds courier readiness delay to delivery ETA without blocking checkout', async () => {
    const orderingStatus = await getRestaurantOrderingCapacityStatus({
      restaurant: createRestaurant(),
      activeKitchenOrders: 0,
      courierReadiness: buildCourierReadinessSnapshot({
        activeKitchenOrders: 0,
        availableCouriers: 0,
        totalCouriers: 2,
      }),
      deliveryLatitude: 43.01,
      deliveryLongitude: 18.01,
      now: new Date('2026-09-14T12:00:00.000Z'),
    });

    expect(orderingStatus).toEqual(
      expect.objectContaining({
        availableCouriers: 0,
        courierReadinessDelayMinutes: 15,
        courierReadinessTone: 'unavailable',
        estimatedDeliveryMinutes: 35,
        estimatedTotalMinutes: 60,
        etaDelayMinutes: 15,
        etaTone: 'busy',
        isAcceptingOrders: true,
        isCourierReady: false,
        totalCouriers: 2,
      })
    );
    expect(orderingStatus.etaMessage).toContain('No courier is currently available');
    expect(
      getRestaurantCartValidationStatus({
        orderingStatus,
        subtotal: 30,
        totalCartQuantity: 1,
      })
    ).toBe('valid');
  });
});
