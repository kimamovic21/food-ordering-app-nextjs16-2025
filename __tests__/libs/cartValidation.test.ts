import { MenuItem } from '@/models/menuItem';
import { Order } from '@/models/order';
import { Restaurant } from '@/models/restaurant';
import {
  getCartItemKey,
  getMenuItemSizePrice,
  normalizeCartSize,
  normalizeDeliveryCoordinate,
  validateCartForOrder,
} from '@/libs/cartValidation';

vi.mock('mongoose', () => {
  class ObjectIdMock {
    value: string;

    constructor(value: string) {
      this.value = value;
    }

    toString() {
      return this.value;
    }

    static isValid(value: unknown) {
      return typeof value === 'string' && value.length > 0 && !value.startsWith('bad-');
    }
  }

  return {
    default: {
      Types: {
        ObjectId: ObjectIdMock,
      },
    },
  };
});

vi.mock('@/models/menuItem', () => ({
  MenuItem: {
    find: vi.fn(),
  },
}));

vi.mock('@/models/order', () => ({
  Order: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    findById: vi.fn(),
  },
}));

const openWorkingHours = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
].map((day) => ({
  closeTime: '23:59',
  day,
  isClosed: false,
  openTime: '00:00',
}));

const createRestaurant = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => 'restaurant-1' },
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
  workingHours: openWorkingHours,
  ...overrides,
});

const createMenuItem = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => 'menu-item-1' },
  adminId: { toString: () => 'admin-1' },
  image: 'https://example.com/pizza.png',
  isAvailable: true,
  maxQuantityPerOrder: 20,
  name: 'Pizza',
  priceLarge: 14.5,
  priceMedium: 11,
  priceSmall: 8,
  priceType: 'triple',
  restaurantId: { toString: () => 'restaurant-1' },
  ...overrides,
});

const createCartItem = (overrides: Record<string, unknown> = {}) => ({
  _id: 'menu-item-1',
  price: 14.5,
  quantity: 1,
  restaurantId: 'restaurant-1',
  size: 'large',
  ...overrides,
});

const mockMenuItems = (items: unknown[]) => {
  vi.mocked(MenuItem.find).mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(items),
    }),
  } as never);
};

const mockRestaurant = (restaurant: Record<string, unknown> | null = createRestaurant()) => {
  vi.mocked(Restaurant.findById).mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(restaurant),
    }),
  } as never);
};

describe('cart validation helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Order.countDocuments).mockResolvedValue(0 as never);
  });

  it('normalizes cart sizes, coordinates, item keys, and size prices', () => {
    expect(normalizeCartSize(' Large ')).toBe('large');
    expect(normalizeCartSize('single')).toBe('single');
    expect(normalizeCartSize('family')).toBeNull();

    expect(normalizeDeliveryCoordinate('43.8563')).toBe(43.8563);
    expect(normalizeDeliveryCoordinate('')).toBeNull();
    expect(normalizeDeliveryCoordinate('not-a-number')).toBeNull();

    expect(getCartItemKey('menu-item-1', 'large')).toBe('menu-item-1:large');
    expect(getCartItemKey('menu-item-1', null)).toBe('menu-item-1:invalid');

    expect(getMenuItemSizePrice(createMenuItem(), 'large')).toEqual({
      price: 14.5,
      size: 'large',
    });
    expect(
      getMenuItemSizePrice(createMenuItem({ priceLarge: null, priceMedium: null }), 'single')
    ).toEqual({ price: 8, size: 'single' });
    expect(getMenuItemSizePrice(createMenuItem({ priceLarge: null }), 'large')).toBeNull();
  });

  it('returns current menu data and detects stale cart prices', async () => {
    mockRestaurant();
    mockMenuItems([createMenuItem()]);

    const result = await validateCartForOrder({
      cartItems: [createCartItem({ price: 1 })],
      deliveryLatitude: 43.01,
      deliveryLongitude: 18.01,
    });

    expect(result.canCheckout).toBe(true);
    expect(result.restaurant).toEqual(
      expect.objectContaining({
        canCheckout: true,
        restaurantName: 'Pizza Hub',
        status: 'valid',
      })
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        name: 'Pizza',
        previousPrice: 1,
        price: 14.5,
        priceChanged: true,
        status: 'valid',
      })
    );
    expect(result.priceChangedItems).toHaveLength(1);
  });

  it('blocks unavailable menu items before restaurant validation', async () => {
    mockMenuItems([createMenuItem({ isAvailable: false })]);

    const result = await validateCartForOrder({
      cartItems: [createCartItem()],
      deliveryLatitude: 43.01,
      deliveryLongitude: 18.01,
    });

    expect(result.canCheckout).toBe(false);
    expect(result.message).toBe('Pizza is currently unavailable.');
    expect(result.blockingItems[0]).toEqual(
      expect.objectContaining({
        isAvailable: false,
        status: 'unavailable',
      })
    );
    expect(Restaurant.findById).not.toHaveBeenCalled();
  });

  it('blocks quantity limits across repeated sizes of the same menu item', async () => {
    mockMenuItems([createMenuItem({ maxQuantityPerOrder: 2 })]);

    const result = await validateCartForOrder({
      cartItems: [
        createCartItem({ quantity: 1, size: 'small' }),
        createCartItem({ quantity: 2, size: 'large' }),
      ],
      deliveryLatitude: 43.01,
      deliveryLongitude: 18.01,
    });

    expect(result.canCheckout).toBe(false);
    expect(result.message).toBe('Pizza is limited to 2 per order. Your cart has 3.');
    expect(result.blockingItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          maxQuantityPerOrder: 2,
          status: 'quantity_limit',
        }),
      ])
    );
    expect(Restaurant.findById).not.toHaveBeenCalled();
  });

  it('blocks checkout when the restaurant is at active order capacity', async () => {
    mockRestaurant(createRestaurant({ activeOrderLimit: 1 }));
    mockMenuItems([createMenuItem({ priceLarge: null, priceMedium: null, priceSmall: 12 })]);
    vi.mocked(Order.countDocuments).mockResolvedValueOnce(1 as never);

    const result = await validateCartForOrder({
      cartItems: [createCartItem({ price: 12, size: 'single' })],
      deliveryLatitude: 43.01,
      deliveryLongitude: 18.01,
    });

    expect(result.canCheckout).toBe(false);
    expect(result.restaurant).toEqual(
      expect.objectContaining({
        activeKitchenOrders: 1,
        activeOrderLimit: 1,
        canCheckout: false,
        isBusy: true,
        status: 'busy',
      })
    );
    expect(result.message).toBe(
      'This restaurant is very busy at the moment. Please wait a little bit and try again. Kitchen is at capacity with 1 active paid order.'
    );
  });
});
