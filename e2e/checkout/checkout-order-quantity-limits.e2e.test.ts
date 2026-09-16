import mongoose from 'mongoose';
import { AuditLog } from '@/models/auditLog';
import { Category } from '@/models/category';
import { MenuItem } from '@/models/menuItem';
import { Order } from '@/models/order';
import { Restaurant } from '@/models/restaurant';
import { User } from '@/models/user';

const stripeCreateSession = vi.hoisted(() => vi.fn());

let activeSession: any = null;

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => activeSession),
}));

vi.mock('stripe', () => ({
  default: class StripeMock {
    checkout = {
      sessions: {
        create: stripeCreateSession,
      },
    };
  },
}));

vi.mock('@/libs/notifications', () => ({
  notifyOrderPlaced: vi.fn(),
}));

const weekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const alwaysOpenWorkingHours = weekdays.map((day) => ({
  day,
  openTime: '00:00',
  closeTime: '23:59',
  isClosed: false,
}));

describe('E2E: checkout order quantity limits', () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customerEmail = `e2e-quantity-limit-customer-${runId}@example.com`;
  const adminEmail = `e2e-quantity-limit-admin-${runId}@example.com`;
  let restaurant: any;
  let menuItem: any;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URL as string);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    activeSession = null;
    process.env.STRIPE_SK = 'sk_test_quantity_limit';
  });

  afterAll(async () => {
    if (restaurant?._id) {
      await AuditLog.deleteMany({ restaurantId: restaurant._id });
      await Order.deleteMany({ restaurantId: restaurant._id });
    }

    await Order.deleteMany({ email: customerEmail });
    await MenuItem.deleteMany({ name: /^E2E Quantity Limit/i });
    await Category.deleteMany({ name: /^E2E Quantity Limit/i });
    await Restaurant.deleteMany({ name: /^E2E Quantity Limit/i });
    await User.deleteMany({ email: { $in: [customerEmail, adminEmail] } });
  });

  it('rejects checkout before order creation when the cart exceeds restaurant item capacity', async () => {
    const customer = await User.create({
      name: 'Quantity Limit Customer',
      email: customerEmail,
      password: 'x',
      provider: 'credentials',
      role: 'user',
    });

    const admin = await User.create({
      name: 'Quantity Limit Admin',
      email: adminEmail,
      password: 'x',
      provider: 'credentials',
      role: 'admin',
    });

    restaurant = await Restaurant.create({
      ownerId: admin._id,
      name: `E2E Quantity Limit Restaurant ${runId}`,
      street: '1',
      city: 'Sarajevo',
      postalCode: '71000',
      country: 'BiH',
      latitude: 43.8563,
      longitude: 18.4131,
      contact: '+38761111222',
      email: `quantity-limit-${runId}@example.com`,
      description: 'Restaurant for checkout quantity limit testing.',
      tax: 10,
      courierFee: 5,
      minimumOrderAmount: 1,
      activeOrderLimit: 10,
      maxItemsPerOrder: 2,
      workingHours: alwaysOpenWorkingHours,
    });

    admin.restaurantId = restaurant._id;
    await admin.save();

    const category = await Category.create({
      name: `E2E Quantity Limit Pizza ${runId}`,
    });

    menuItem = await MenuItem.create({
      restaurantId: restaurant._id,
      adminId: admin._id,
      name: `E2E Quantity Limit Pizza ${runId}`,
      category: category._id,
      description: 'A menu item used to verify restaurant quantity limits.',
      priceType: 'single',
      priceSmall: 12,
      priceMedium: null,
      priceLarge: null,
      sizes: [{ size: 'single', price: 12 }],
      prices: [12],
      image: 'https://example.com/quantity-limit-pizza.jpg',
      isAvailable: true,
      maxQuantityPerOrder: 20,
    });

    activeSession = { user: { email: customer.email, role: 'user' } };
    const { POST: Checkout } = await import('@/app/api/checkout/route');
    const checkoutResp = await Checkout(
      new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          phone: '+38761123456',
          streetAddress: 'Street 1',
          postalCode: '71000',
          city: 'Sarajevo',
          country: 'BiH',
          deliveryLatitude: 43.8563,
          deliveryLongitude: 18.4131,
          loyaltyDiscountPercentage: 0,
          cartItems: [
            {
              _id: menuItem._id.toString(),
              name: menuItem.name,
              size: 'single',
              price: 12,
              quantity: 3,
              restaurantId: restaurant._id.toString(),
            },
          ],
        }),
      })
    );
    const checkoutBody = await checkoutResp.json();

    expect(checkoutResp.status).toBe(400);
    expect(checkoutBody).toEqual({
      error: 'This restaurant accepts up to 2 items in one order. Your cart has 3 items.',
    });
    expect(stripeCreateSession).not.toHaveBeenCalled();
    await expect(Order.findOne({ email: customer.email })).resolves.toBeNull();

    const auditLog = await AuditLog.findOne({
      action: 'checkout.blocked',
      restaurantId: restaurant._id,
      'metadata.reason': 'restaurant_item_limit_exceeded',
    }).lean();

    expect(auditLog).toEqual(
      expect.objectContaining({
        actorEmail: customer.email,
        entityType: 'checkout',
      })
    );
  });
});
