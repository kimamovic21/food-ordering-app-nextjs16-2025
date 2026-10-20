import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuItem } from '@/models/menuItem';
import { buildOrderCartSnapshotFromOrderProducts } from '@/libs/orderCartSnapshot';

vi.mock('@/models/menuItem', () => ({ MenuItem: { find: vi.fn() } }));

const itemId = '507f1f77bcf86cd799439011';
const otherItemId = '507f1f77bcf86cd799439012';
const restaurantId = '507f1f77bcf86cd799439013';
const menuItem = (overrides: Record<string, unknown> = {}) => ({
  _id: itemId,
  restaurantId,
  name: 'Pizza',
  description: 'Current description',
  priceType: 'triple',
  priceSmall: 8,
  priceMedium: 10,
  priceLarge: 12,
  maxQuantityPerOrder: 20,
  isAvailable: true,
  trackInventory: true,
  stockQuantity: 5,
  reservedStockQuantity: 0,
  ...overrides,
});
const product = (size: string, quantity: number, overrides: Record<string, unknown> = {}) => ({
  productId: itemId,
  name: 'Old pizza',
  size,
  quantity,
  price: 8,
  ...overrides,
});
const mockMenu = (items: ReturnType<typeof menuItem>[]) => {
  vi.mocked(MenuItem.find).mockReturnValue({
    select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(items) }),
  } as never);
};

describe('reorder shared quantity allocation', () => {
  beforeEach(() => mockMenu([menuItem()]));

  it('shares stock across sizes and preserves current prices and item notes', async () => {
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([
      product('small', 4, { note: 'No onion' }),
      product('large', 4, { note: 'Extra crispy' }),
    ]);

    expect(snapshot.cartItems).toEqual([
      expect.objectContaining({
        size: 'small',
        quantity: 4,
        price: 8,
        stockQuantity: 5,
        note: 'No onion',
      }),
      expect.objectContaining({
        size: 'large',
        quantity: 1,
        price: 12,
        stockQuantity: 5,
        note: 'Extra crispy',
      }),
    ]);
    expect(snapshot.adjustedItems).toEqual([
      expect.objectContaining({
        size: 'large',
        requestedQuantity: 4,
        appliedQuantity: 1,
        reason: 'stock_limit',
      }),
    ]);
    expect(snapshot.priceChangedItems).toEqual([
      expect.objectContaining({ size: 'large', quantity: 1, previousPrice: 8, currentPrice: 12 }),
    ]);
    expect(snapshot.recoverySummary).toMatchObject({
      originalQuantity: 8,
      addedQuantity: 5,
      addedLineCount: 2,
      adjustedItemCount: 1,
      hasChanges: true,
    });
    expect(MenuItem.find).toHaveBeenCalledWith({ _id: { $in: [itemId] } });
  });

  it('skips a later size when earlier sizes use all remaining stock', async () => {
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([
      product('small', 5),
      product('large', 2),
    ]);
    expect(snapshot.cartItems).toHaveLength(1);
    expect(snapshot.skippedItems).toEqual([
      expect.objectContaining({ size: 'large', reason: 'stock_limit' }),
    ]);
    expect(snapshot.adjustedItems).toEqual([]);
    expect(snapshot.recoverySummary).toMatchObject({ addedQuantity: 5, skippedItemCount: 1 });
  });

  it('shares the per-order limit even when inventory tracking is disabled', async () => {
    mockMenu([menuItem({ trackInventory: false, maxQuantityPerOrder: 6 })]);
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([
      product('small', 4),
      product('medium', 4),
      product('large', 1),
    ]);
    expect(snapshot.cartItems.map((item) => item.quantity)).toEqual([4, 2]);
    expect(snapshot.adjustedItems[0]).toMatchObject({
      appliedQuantity: 2,
      reason: 'item_quantity_limit',
    });
    expect(snapshot.skippedItems[0]).toMatchObject({
      size: 'large',
      reason: 'item_quantity_limit',
    });
  });

  it('subtracts reserved stock before allocating across sizes', async () => {
    mockMenu([menuItem({ stockQuantity: 10, reservedStockQuantity: 7 })]);
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([
      product('small', 2),
      product('large', 2),
    ]);
    expect(snapshot.cartItems.map((item) => item.quantity)).toEqual([2, 1]);
    expect(snapshot.cartItems.every((item) => item.stockQuantity === 3)).toBe(true);
  });

  it('records only the final adjustment when both stock and per-order limits apply', async () => {
    mockMenu([menuItem({ stockQuantity: 2, maxQuantityPerOrder: 3 })]);
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([product('small', 10)]);
    expect(snapshot.adjustedItems).toEqual([
      expect.objectContaining({ requestedQuantity: 10, appliedQuantity: 2, reason: 'stock_limit' }),
    ]);
    expect(snapshot.recoverySummary.adjustedItemCount).toBe(1);
  });

  it('does not report an adjustment for an entirely sold-out item', async () => {
    mockMenu([menuItem({ stockQuantity: 0, maxQuantityPerOrder: 2 })]);
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([product('small', 10)]);
    expect(snapshot.cartItems).toEqual([]);
    expect(snapshot.adjustedItems).toEqual([]);
    expect(snapshot.skippedItems[0].reason).toBe('sold_out');
  });

  it('does not consume stock for invalid sizes', async () => {
    mockMenu([menuItem({ priceMedium: null })]);
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([
      product('medium', 5),
      product('large', 5),
    ]);
    expect(snapshot.cartItems).toEqual([expect.objectContaining({ size: 'large', quantity: 5 })]);
    expect(snapshot.skippedItems[0].reason).toBe('invalid_size');
  });

  it('keeps independent budgets for different items and successive requests', async () => {
    mockMenu([menuItem(), menuItem({ _id: otherItemId })]);
    const products = [product('small', 5), product('small', 5, { productId: otherItemId })];
    const first = await buildOrderCartSnapshotFromOrderProducts(products);
    const second = await buildOrderCartSnapshotFromOrderProducts(products);
    expect(first.recoverySummary.addedQuantity).toBe(10);
    expect(second).toEqual(first);
  });

  it('keeps the default shared limit for legacy items without inventory configuration', async () => {
    mockMenu([
      menuItem({
        trackInventory: undefined,
        stockQuantity: undefined,
        maxQuantityPerOrder: undefined,
      }),
    ]);
    const snapshot = await buildOrderCartSnapshotFromOrderProducts([
      product('small', 15),
      product('large', 10),
    ]);
    expect(snapshot.cartItems.map((item) => item.quantity)).toEqual([15, 5]);
  });

  it.each([NaN, Infinity, -5, 0, 1.5])(
    'normalizes malformed historical quantity %s to a positive integer',
    async (quantity) => {
      const snapshot = await buildOrderCartSnapshotFromOrderProducts([product('small', quantity)]);
      expect(snapshot.cartItems[0].quantity).toBe(1);
      expect(snapshot.recoverySummary.originalQuantity).toBe(1);
    }
  );

  it('still rejects items from multiple restaurants', async () => {
    mockMenu([menuItem(), menuItem({ _id: otherItemId, restaurantId: 'another-restaurant' })]);
    await expect(
      buildOrderCartSnapshotFromOrderProducts([
        product('small', 1),
        product('small', 1, { productId: otherItemId }),
      ])
    ).rejects.toThrow('multiple restaurants');
  });
});
