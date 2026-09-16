import { describe, it, expect } from 'vitest';
import { Order } from '@/models/order';

const hasIndex = (expectedIndex: Record<string, 1 | -1>) =>
  Order.schema.indexes().some(([index]) =>
    Object.entries(expectedIndex).every(([key, value]) => index[key] === value)
  );

describe('Order model validation', () => {
  it('rejects creation when required fields are missing', async () => {
    const o: any = new Order({});
    await expect(o.validate()).rejects.toBeTruthy();
  });

  it('rejects invalid taxPercentage values', async () => {
    const data: any = {
      email: 'a@b.com',
      phone: '123',
      streetAddress: 'addr',
      postalCode: '00000',
      city: 'C',
      country: 'X',
      cartProducts: [
        {
          productId: '507f1f77bcf86cd799439011',
          name: 'X',
          size: 'M',
          quantity: 1,
          price: 10,
          restaurantId: '507f1f77bcf86cd799439011',
        },
      ],
      restaurantId: '507f1f77bcf86cd799439011',
      taxPercentage: 200,
      deliveryFee: 5,
      total: 10,
    };

    const o: any = new Order(data);
    await expect(o.validate()).rejects.toBeTruthy();
  });

  it('validates a minimal valid order', async () => {
    const data: any = {
      email: 'a@b.com',
      phone: '123',
      streetAddress: 'addr',
      postalCode: '00000',
      city: 'C',
      country: 'X',
      cartProducts: [
        {
          productId: '507f1f77bcf86cd799439011',
          name: 'X',
          size: 'M',
          quantity: 1,
          price: 10,
          restaurantId: '507f1f77bcf86cd799439011',
        },
      ],
      restaurantId: '507f1f77bcf86cd799439011',
      taxPercentage: 10,
      deliveryFee: 5,
      total: 10,
    };

    const o: any = new Order(data);
    await expect(o.validate()).resolves.toBeUndefined();
  });

  it('rejects overly long special instructions', async () => {
    const data: any = {
      email: 'a@b.com',
      phone: '123',
      streetAddress: 'addr',
      postalCode: '00000',
      city: 'C',
      country: 'X',
      specialInstructions: 'x'.repeat(501),
      cartProducts: [
        {
          productId: '507f1f77bcf86cd799439011',
          name: 'X',
          size: 'M',
          quantity: 1,
          price: 10,
          restaurantId: '507f1f77bcf86cd799439011',
        },
      ],
      restaurantId: '507f1f77bcf86cd799439011',
      taxPercentage: 10,
      deliveryFee: 5,
      total: 10,
    };

    const o: any = new Order(data);
    await expect(o.validate()).rejects.toBeTruthy();
  });

  it('keeps compound indexes for high-traffic order queries', () => {
    expect(hasIndex({ userId: 1, orderStatus: 1, createdAt: -1 })).toBe(true);
    expect(hasIndex({ restaurantId: 1, orderStatus: 1, createdAt: -1 })).toBe(true);
    expect(hasIndex({ courierId: 1, orderStatus: 1, createdAt: -1 })).toBe(true);
    expect(hasIndex({ restaurantId: 1, orderPaid: 1, orderStatus: 1, createdAt: -1 })).toBe(true);
    expect(hasIndex({ userId: 1, restaurantId: 1, checkoutFingerprint: 1, createdAt: -1 })).toBe(
      true
    );
    expect(hasIndex({ courierAssignmentStatus: 1, courierAssignedAt: 1 })).toBe(true);
    expect(hasIndex({ orderStatus: 1, readyAt: 1, courierId: 1 })).toBe(true);
    expect(hasIndex({ createdAt: -1 })).toBe(true);
  });
});
