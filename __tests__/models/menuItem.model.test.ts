import { describe, it, expect } from 'vitest';
import { MenuItem } from '@/models/menuItem';

describe('MenuItem model validation', () => {
  it('requires required fields', async () => {
    const m: any = new MenuItem({});
    await expect(m.validate()).rejects.toBeTruthy();
  });

  it('accepts minimal valid menu item', async () => {
    const data: any = {
      image: 'http://x.png',
      name: 'Burger',
      description: 'Tasty',
      category: '507f1f77bcf86cd799439011',
      adminId: '507f1f77bcf86cd799439011',
      restaurantId: '507f1f77bcf86cd799439011',
    };
    const m: any = new MenuItem(data);
    await expect(m.validate()).resolves.toBeUndefined();
    expect(m.maxQuantityPerOrder).toBe(20);
    expect(m.trackInventory).toBe(false);
    expect(m.stockQuantity).toBeNull();
    expect(m.lowStockThreshold).toBe(3);
  });

  it('rejects invalid priceType', async () => {
    const data: any = {
      image: 'http://x.png',
      name: 'Burger',
      description: 'Tasty',
      category: '507f1f77bcf86cd799439011',
      adminId: '507f1f77bcf86cd799439011',
      restaurantId: '507f1f77bcf86cd799439011',
      priceType: 'quad',
    };
    const m: any = new MenuItem(data);
    await expect(m.validate()).rejects.toBeTruthy();
  });

  it('rejects menu item quantity limits above the courier-safe maximum', async () => {
    const data: any = {
      image: 'http://x.png',
      name: 'Burger',
      description: 'Tasty',
      category: '507f1f77bcf86cd799439011',
      adminId: '507f1f77bcf86cd799439011',
      restaurantId: '507f1f77bcf86cd799439011',
      maxQuantityPerOrder: 21,
    };
    const m: any = new MenuItem(data);
    await expect(m.validate()).rejects.toBeTruthy();
  });

  it('rejects tracked stock above the inventory maximum', async () => {
    const data: any = {
      image: 'http://x.png',
      name: 'Burger',
      description: 'Tasty',
      category: '507f1f77bcf86cd799439011',
      adminId: '507f1f77bcf86cd799439011',
      restaurantId: '507f1f77bcf86cd799439011',
      stockQuantity: 1001,
      trackInventory: true,
    };
    const m: any = new MenuItem(data);
    await expect(m.validate()).rejects.toBeTruthy();
  });
});
