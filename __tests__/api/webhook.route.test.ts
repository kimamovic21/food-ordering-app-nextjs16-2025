import { headers } from 'next/headers';
import mongoose from 'mongoose';
import { Order } from '@/models/order';
import { Coupon } from '@/models/coupon';
import { Restaurant } from '@/models/restaurant';
import { MenuItem } from '@/models/menuItem';
import {
  notifyRestaurantAdminsAboutInventoryAlert,
  notifyRestaurantAdminsAboutPaidOrder,
} from '@/libs/notifications';
import { createAuditLog } from '@/libs/auditLog';
import { sendPurchaseReceiptEmail } from '@/app/api/webhook/sendPurchaseReceiptEmail';

const stripeConstructEvent = vi.fn();

vi.mock('stripe', () => ({
  default: class StripeMock {
    webhooks = {
      constructEvent: stripeConstructEvent,
    };
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
    Types: {
      ObjectId: class {
        value: string;

        constructor(value: string) {
          this.value = value;
        }

        toString() {
          return this.value;
        }

        static isValid() {
          return true;
        }
      },
    },
  },
}));

vi.mock('@/models/order', () => ({
  Order: {
    findById: vi.fn(),
  },
}));

vi.mock('@/models/coupon', () => ({
  Coupon: {
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    findById: vi.fn(),
  },
}));

vi.mock('@/models/menuItem', () => ({
  MenuItem: {
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('@/libs/notifications', () => ({
  notifyRestaurantAdminsAboutInventoryAlert: vi.fn(),
  notifyRestaurantAdminsAboutPaidOrder: vi.fn(),
}));

vi.mock('@/libs/auditLog', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/app/api/webhook/sendPurchaseReceiptEmail', () => ({
  sendPurchaseReceiptEmail: vi.fn(),
}));

const loadWebhookRoute = async () => {
  const mod = await import('@/app/api/webhook/route');
  return mod.POST;
};

const createMenuItemFindQuery = (items: unknown[]) =>
  ({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(items),
    }),
  }) as never;

describe('POST /api/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SK = 'sk_test_webhook';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook';

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn((name: string) => (name === 'stripe-signature' ? 'sig_test_1' : null)),
    } as never);

    vi.mocked(sendPurchaseReceiptEmail).mockResolvedValue({ sent: true } as never);

    vi.mocked(Restaurant.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: 'Test Restaurant',
          email: 'restaurant@example.com',
          contact: '+123456',
          street: 'Street 1',
          city: 'Sarajevo',
          postalCode: '71000',
          country: 'BiH',
        }),
      }),
    } as never);

    vi.mocked(MenuItem.find).mockImplementation((query?: any) => {
      if (query?.trackInventory === true) {
        return createMenuItemFindQuery([]);
      }

      return createMenuItemFindQuery([
        {
          _id: { toString: () => 'menu-item-1' },
          image: 'https://example.com/item.jpg',
        },
      ]);
    });
    vi.mocked(MenuItem.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    stripeConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_webhook_1',
          metadata: {
            orderId: 'order-1',
          },
        },
      },
    });
  });

  it('returns 400 when stripe signature header is missing', async () => {
    vi.mocked(headers).mockResolvedValueOnce({
      get: vi.fn(() => null),
    } as never);

    const POST = await loadWebhookRoute();
    const response = await POST(new Request('http://localhost/api/webhook', { method: 'POST' }));

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain('Missing Stripe signature');
    expect(Order.findById).not.toHaveBeenCalled();
  });

  it('returns 400 when stripe signature verification fails', async () => {
    stripeConstructEvent.mockImplementationOnce(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    const POST = await loadWebhookRoute();
    const response = await POST(
      new Request('http://localhost/api/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain('Webhook Error');
    expect(Order.findById).not.toHaveBeenCalled();
  });

  it('ignores duplicate checkout.session.completed events for side effects', async () => {
    const orderDocument = {
      _id: { toString: () => 'order-1' },
      restaurantId: 'restaurant-1',
      email: 'customer@example.com',
      couponId: 'coupon-1',
      couponDiscountAmount: 3,
      cartProducts: [
        {
          productId: 'menu-item-1',
          name: 'Pizza',
          size: 'Large',
          quantity: 1,
          price: 12,
        },
      ],
      taxAmount: 1,
      deliveryFee: 2,
      specialInstructions: 'Cut pizza into small slices.',
      total: 15,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      orderPaid: false,
      paid: false,
      orderStatus: '',
      stripeSessionId: null,
      receiptEmailSentAt: null,
      save: vi.fn(async function save(this: Record<string, unknown>) {
        if (this.paid) {
          this.receiptEmailSentAt = this.receiptEmailSentAt || new Date('2026-01-01T00:01:00.000Z');
        }
      }),
    };

    vi.mocked(Order.findById).mockResolvedValue(orderDocument as never);

    const POST = await loadWebhookRoute();

    await POST(
      new Request('http://localhost/api/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    await POST(
      new Request('http://localhost/api/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(orderDocument.paid).toBe(true);
    expect(orderDocument.orderPaid).toBe(true);
    expect(orderDocument.stripeSessionId).toBe('cs_test_webhook_1');

    expect(notifyRestaurantAdminsAboutPaidOrder).toHaveBeenCalledTimes(1);
    expect(Coupon.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(sendPurchaseReceiptEmail).toHaveBeenCalledTimes(1);
    expect(sendPurchaseReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        specialInstructions: 'Cut pizza into small slices.',
      })
    );
  });

  it('decrements tracked menu item inventory once when a checkout payment is confirmed', async () => {
    vi.mocked(MenuItem.find).mockImplementation((query?: any) => {
      if (query?.trackInventory === true) {
        return createMenuItemFindQuery([
          {
            _id: { toString: () => 'menu-item-1' },
            lowStockThreshold: 3,
            name: 'Pizza',
            restaurantId: { toString: () => 'restaurant-1' },
            stockQuantity: 5,
            trackInventory: true,
          },
        ]);
      }

      return createMenuItemFindQuery([
        {
          _id: { toString: () => 'menu-item-1' },
          image: 'https://example.com/item.jpg',
        },
      ]);
    });

    const orderDocument = {
      _id: { toString: () => 'order-1' },
      restaurantId: 'restaurant-1',
      email: 'customer@example.com',
      cartProducts: [
        {
          productId: 'menu-item-1',
          name: 'Pizza',
          size: 'Large',
          quantity: 2,
          price: 12,
        },
      ],
      taxAmount: 1,
      deliveryFee: 2,
      total: 27,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      orderPaid: false,
      paid: false,
      orderStatus: '',
      stripeSessionId: null,
      receiptEmailSentAt: null,
      inventoryAdjustedAt: null,
      save: vi.fn(async function save(this: Record<string, unknown>) {
        if (this.paid) {
          this.receiptEmailSentAt = this.receiptEmailSentAt || new Date('2026-01-01T00:01:00.000Z');
        }
      }),
    };

    vi.mocked(Order.findById).mockResolvedValue(orderDocument as never);

    const POST = await loadWebhookRoute();
    const response = await POST(
      new Request('http://localhost/api/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(200);
    expect(MenuItem.updateOne).toHaveBeenCalledWith(
      {
        _id: 'menu-item-1',
        stockQuantity: { $gte: 2 },
        trackInventory: true,
      },
      {
        $inc: { stockQuantity: -2 },
        $set: { stockLastAdjustedAt: expect.any(Date) },
      }
    );
    expect(orderDocument.inventoryAdjustedAt).toBeInstanceOf(Date);
    expect(orderDocument.orderStatus).toBe('processing');
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'menu_item.inventory_alert',
        entityId: 'menu-item-1',
        entityType: 'menu_item',
        metadata: expect.objectContaining({
          inventoryStatus: 'low_stock',
          lowStockThreshold: 3,
          stockQuantity: 3,
        }),
        restaurantId: 'restaurant-1',
      })
    );
    expect(notifyRestaurantAdminsAboutInventoryAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        lowStockThreshold: 3,
        menuItemId: 'menu-item-1',
        menuItemName: 'Pizza',
        restaurantId: 'restaurant-1',
        status: 'low_stock',
        stockQuantity: 3,
      })
    );
    expect(notifyRestaurantAdminsAboutPaidOrder).toHaveBeenCalledTimes(1);
  });

  it('marks a paid order for refund review when inventory disappears before webhook confirmation', async () => {
    vi.mocked(MenuItem.find).mockImplementation((query?: any) => {
      if (query?.trackInventory === true) {
        return createMenuItemFindQuery([
          {
            _id: { toString: () => 'menu-item-1' },
            name: 'Pizza',
            stockQuantity: 0,
            trackInventory: true,
          },
        ]);
      }

      return createMenuItemFindQuery([]);
    });

    const orderDocument = {
      _id: { toString: () => 'order-1' },
      restaurantId: 'restaurant-1',
      email: 'customer@example.com',
      cartProducts: [
        {
          productId: 'menu-item-1',
          name: 'Pizza',
          size: 'Large',
          quantity: 1,
          price: 12,
        },
      ],
      total: 12,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      orderPaid: false,
      paid: false,
      orderStatus: '',
      stripeSessionId: null,
      save: vi.fn(),
    };

    vi.mocked(Order.findById).mockResolvedValue(orderDocument as never);

    const POST = await loadWebhookRoute();
    const response = await POST(
      new Request('http://localhost/api/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(200);
    expect(orderDocument.orderPaid).toBe(true);
    expect(orderDocument.paid).toBe(true);
    expect(orderDocument.orderStatus).toBe('canceled');
    expect((orderDocument as any).refundStatus).toBe('review_required');
    expect((orderDocument as any).canceledBy).toBe('system');
    expect((orderDocument as any).inventoryAdjustmentError).toContain('Pizza has only 0 left');
    expect(MenuItem.updateOne).not.toHaveBeenCalled();
    expect(notifyRestaurantAdminsAboutPaidOrder).not.toHaveBeenCalled();
    expect(sendPurchaseReceiptEmail).not.toHaveBeenCalled();
  });

  it('returns success and does not mutate orders when metadata.orderId is missing', async () => {
    stripeConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_webhook_2',
          metadata: {},
        },
      },
    });

    const POST = await loadWebhookRoute();

    const response = await POST(
      new Request('http://localhost/api/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(Order.findById).not.toHaveBeenCalled();
    expect(mongoose.connect).not.toHaveBeenCalled();
  });
});
