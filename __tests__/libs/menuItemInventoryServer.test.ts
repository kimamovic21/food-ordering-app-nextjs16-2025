import mongoose from 'mongoose';

import { MenuItem } from '@/models/menuItem';

vi.mock('@/models/menuItem', () => ({
  MenuItem: {
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

const mockMenuItemFind = (items: any[]) => {
  const lean = vi.fn().mockResolvedValue(items);
  const select = vi.fn().mockReturnValue({ lean });

  vi.mocked(MenuItem.find).mockReturnValue({ select } as never);

  return { lean, select };
};

const createObjectId = () => new mongoose.Types.ObjectId().toString();

describe('server menu item inventory helpers', () => {
  beforeEach(() => {
    vi.mocked(MenuItem.find).mockReset();
    vi.mocked(MenuItem.updateOne).mockReset();
  });

  it('reserves only available tracked stock for the unpaid Stripe checkout window', async () => {
    const { reserveTrackedInventoryForCheckout } = await import(
      '@/libs/menuItemInventoryServer'
    );
    const menuItemId = createObjectId();
    const expiresAt = new Date('2026-10-10T12:30:00.000Z');

    mockMenuItemFind([
      {
        _id: new mongoose.Types.ObjectId(menuItemId),
        name: 'Four Cheese Pizza',
        reservedStockQuantity: 2,
        stockQuantity: 5,
        trackInventory: true,
      },
    ]);
    vi.mocked(MenuItem.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    const result = await reserveTrackedInventoryForCheckout({
      expiresAt,
      items: [{ productId: menuItemId, quantity: 2 }],
    });

    expect(result).toEqual({
      expiresAt,
      ok: true,
      reserved: true,
      reservedItems: [
        {
          menuItemId,
          menuItemName: 'Four Cheese Pizza',
          quantity: 2,
        },
      ],
      violations: [],
    });
    expect(MenuItem.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: menuItemId,
        trackInventory: true,
        $expr: expect.objectContaining({
          $gte: [expect.any(Object), 2],
        }),
      }),
      expect.objectContaining({
        $inc: { reservedStockQuantity: 2 },
        $set: { stockReservationUpdatedAt: expect.any(Date) },
      })
    );
  });

  it('blocks checkout reservation when existing reservations already consume stock', async () => {
    const { reserveTrackedInventoryForCheckout } = await import(
      '@/libs/menuItemInventoryServer'
    );
    const menuItemId = createObjectId();
    const expiresAt = new Date('2026-10-10T12:30:00.000Z');

    mockMenuItemFind([
      {
        _id: new mongoose.Types.ObjectId(menuItemId),
        name: 'Macchiato Coffee',
        reservedStockQuantity: 4,
        stockQuantity: 5,
        trackInventory: true,
      },
    ]);

    const result = await reserveTrackedInventoryForCheckout({
      expiresAt,
      items: [{ productId: menuItemId, quantity: 2 }],
    });

    expect(result.ok).toBe(false);
    expect(result.reserved).toBe(false);
    expect(result.violations).toEqual([
      {
        menuItemId,
        menuItemName: 'Macchiato Coffee',
        requestedQuantity: 2,
        stockQuantity: 1,
      },
    ]);
    expect(MenuItem.updateOne).not.toHaveBeenCalled();
  });

  it('rolls back earlier reservations when a later atomic reservation fails', async () => {
    const { reserveTrackedInventoryForCheckout } = await import(
      '@/libs/menuItemInventoryServer'
    );
    const firstId = createObjectId();
    const secondId = createObjectId();
    const expiresAt = new Date('2026-10-10T12:30:00.000Z');

    mockMenuItemFind([
      {
        _id: new mongoose.Types.ObjectId(firstId),
        name: 'Cheesecake',
        reservedStockQuantity: 0,
        stockQuantity: 3,
        trackInventory: true,
      },
      {
        _id: new mongoose.Types.ObjectId(secondId),
        name: 'Chicken Pasta',
        reservedStockQuantity: 0,
        stockQuantity: 3,
        trackInventory: true,
      },
    ]);
    vi.mocked(MenuItem.updateOne)
      .mockResolvedValueOnce({ modifiedCount: 1 } as never)
      .mockResolvedValueOnce({ modifiedCount: 0 } as never)
      .mockResolvedValueOnce({ modifiedCount: 1 } as never);

    const result = await reserveTrackedInventoryForCheckout({
      expiresAt,
      items: [
        { productId: firstId, quantity: 1 },
        { productId: secondId, quantity: 1 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.reservedItems).toEqual([]);
    expect(result.violations).toEqual([
      {
        menuItemId: secondId,
        menuItemName: 'Chicken Pasta',
        requestedQuantity: 1,
        stockQuantity: 3,
      },
    ]);
    expect(MenuItem.updateOne).toHaveBeenCalledTimes(3);
    expect(MenuItem.updateOne).toHaveBeenLastCalledWith(
      { _id: firstId, trackInventory: true },
      [
        {
          $set: {
            reservedStockQuantity: expect.objectContaining({
              $max: expect.any(Array),
            }),
            stockReservationUpdatedAt: expect.any(Date),
          },
        },
      ]
    );
  });

  it('releases an order reservation when checkout is canceled or expires', async () => {
    const { releaseOrderInventoryReservation } = await import(
      '@/libs/menuItemInventoryServer'
    );
    const menuItemId = createObjectId();
    const order = {
      inventoryReservationStatus: 'reserved',
      inventoryReservedItems: [
        {
          menuItemId,
          menuItemName: 'Classic Hamburger',
          quantity: 2,
        },
      ],
    };

    vi.mocked(MenuItem.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    const result = await releaseOrderInventoryReservation(order, 'Payment window expired.');

    expect(result).toEqual({
      released: true,
      reservedItems: [
        {
          menuItemId,
          menuItemName: 'Classic Hamburger',
          quantity: 2,
        },
      ],
    });
    expect(order.inventoryReservationStatus).toBe('released');
    expect(order.inventoryReservationReleaseReason).toBe('Payment window expired.');
    expect(order.inventoryReservationReleasedAt).toBeInstanceOf(Date);
    expect(MenuItem.updateOne).toHaveBeenCalledWith(
      { _id: menuItemId, trackInventory: true },
      [
        {
          $set: {
            reservedStockQuantity: expect.objectContaining({
              $max: expect.any(Array),
            }),
            stockReservationUpdatedAt: expect.any(Date),
          },
        },
      ]
    );
  });

  it('captures reserved inventory after Stripe confirms payment', async () => {
    const { applyPaidOrderInventoryAdjustment } = await import(
      '@/libs/menuItemInventoryServer'
    );
    const menuItemId = createObjectId();
    const restaurantId = createObjectId();

    mockMenuItemFind([
      {
        _id: new mongoose.Types.ObjectId(menuItemId),
        lowStockThreshold: 3,
        name: 'Chicken Pasta',
        reservedStockQuantity: 2,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        stockQuantity: 4,
        trackInventory: true,
      },
    ]);
    vi.mocked(MenuItem.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    const result = await applyPaidOrderInventoryAdjustment({
      inventoryReservationStatus: 'reserved',
      inventoryReservedItems: [
        {
          menuItemId,
          menuItemName: 'Chicken Pasta',
          quantity: 2,
        },
      ],
    });

    expect(result).toEqual({
      adjusted: true,
      alerts: [
        {
          lowStockThreshold: 3,
          menuItemId,
          menuItemName: 'Chicken Pasta',
          requestedQuantity: 2,
          restaurantId,
          status: 'low_stock',
          stockQuantity: 2,
        },
      ],
      ok: true,
      violations: [],
    });
    expect(MenuItem.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: menuItemId,
        trackInventory: true,
        $expr: expect.objectContaining({
          $and: expect.any(Array),
        }),
      }),
      expect.objectContaining({
        $inc: {
          reservedStockQuantity: -2,
          stockQuantity: -2,
        },
        $set: {
          stockLastAdjustedAt: expect.any(Date),
          stockReservationUpdatedAt: expect.any(Date),
        },
      })
    );
  });

  it('keeps legacy paid inventory adjustment protected by current reserved stock', async () => {
    const { applyPaidOrderInventoryAdjustment } = await import(
      '@/libs/menuItemInventoryServer'
    );
    const menuItemId = createObjectId();
    const restaurantId = createObjectId();

    mockMenuItemFind([
      {
        _id: new mongoose.Types.ObjectId(menuItemId),
        lowStockThreshold: 3,
        name: 'Pizza Margherita',
        reservedStockQuantity: 4,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        stockQuantity: 5,
        trackInventory: true,
      },
    ]);

    const result = await applyPaidOrderInventoryAdjustment({
      cartProducts: [{ productId: menuItemId, quantity: 2 }],
    });

    expect(result).toEqual({
      adjusted: false,
      alerts: [],
      ok: false,
      violations: [
        {
          menuItemId,
          menuItemName: 'Pizza Margherita',
          requestedQuantity: 2,
          stockQuantity: 1,
        },
      ],
    });
    expect(MenuItem.updateOne).not.toHaveBeenCalled();
  });
});
