const restaurantCountDocuments = vi.fn();
const restaurantUpdateMany = vi.fn();
const menuItemCountDocuments = vi.fn();
const menuItemUpdateMany = vi.fn();

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    countDocuments: restaurantCountDocuments,
    updateMany: restaurantUpdateMany,
  },
}));

vi.mock('@/models/menuItem', () => ({
  MenuItem: {
    countDocuments: menuItemCountDocuments,
    updateMany: menuItemUpdateMany,
  },
}));

describe('order capacity backfill helper', () => {
  beforeEach(() => {
    restaurantCountDocuments.mockReset();
    restaurantUpdateMany.mockReset();
    menuItemCountDocuments.mockReset();
    menuItemUpdateMany.mockReset();
  });

  it('builds backfill operations for missing and out-of-range capacity fields', async () => {
    const { createOrderCapacityBackfillOperations } = await import('@/libs/orderCapacityBackfill');

    expect(createOrderCapacityBackfillOperations()).toEqual([
      expect.objectContaining({
        label: 'missingMaxItemsPerOrder',
        target: 'restaurants',
        update: { $set: { maxItemsPerOrder: 20 } },
      }),
      expect.objectContaining({
        label: 'lowMaxItemsPerOrder',
        target: 'restaurants',
        update: { $set: { maxItemsPerOrder: 1 } },
      }),
      expect.objectContaining({
        label: 'highMaxItemsPerOrder',
        target: 'restaurants',
        update: { $set: { maxItemsPerOrder: 20 } },
      }),
      expect.objectContaining({
        label: 'missingMaxQuantityPerOrder',
        target: 'menuItems',
        update: { $set: { maxQuantityPerOrder: 20 } },
      }),
      expect.objectContaining({
        label: 'lowMaxQuantityPerOrder',
        target: 'menuItems',
        update: { $set: { maxQuantityPerOrder: 1 } },
      }),
      expect.objectContaining({
        label: 'highMaxQuantityPerOrder',
        target: 'menuItems',
        update: { $set: { maxQuantityPerOrder: 20 } },
      }),
    ]);
  });

  it('counts affected documents during a dry run without mutating data', async () => {
    restaurantCountDocuments
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    menuItemCountDocuments
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(4);

    const { backfillOrderCapacityLimits } = await import('@/libs/orderCapacityBackfill');
    const result = await backfillOrderCapacityLimits();

    expect(result).toEqual({
      dryRun: true,
      restaurants: {
        highMaxItemsPerOrder: 0,
        lowMaxItemsPerOrder: 1,
        missingMaxItemsPerOrder: 2,
      },
      menuItems: {
        highMaxQuantityPerOrder: 4,
        lowMaxQuantityPerOrder: 0,
        missingMaxQuantityPerOrder: 3,
      },
    });
    expect(restaurantUpdateMany).not.toHaveBeenCalled();
    expect(menuItemUpdateMany).not.toHaveBeenCalled();
  });

  it('updates invalid capacity values when dryRun is false', async () => {
    restaurantUpdateMany
      .mockResolvedValueOnce({ modifiedCount: 2 })
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 0 });
    menuItemUpdateMany
      .mockResolvedValueOnce({ modifiedCount: 3 })
      .mockResolvedValueOnce({ modifiedCount: 0 })
      .mockResolvedValueOnce({ modifiedCount: 4 });

    const { backfillOrderCapacityLimits } = await import('@/libs/orderCapacityBackfill');
    const result = await backfillOrderCapacityLimits({ dryRun: false });

    expect(result.dryRun).toBe(false);
    expect(result.restaurants.missingMaxItemsPerOrder).toBe(2);
    expect(result.menuItems.highMaxQuantityPerOrder).toBe(4);
    expect(restaurantCountDocuments).not.toHaveBeenCalled();
    expect(menuItemCountDocuments).not.toHaveBeenCalled();
    expect(restaurantUpdateMany).toHaveBeenCalledTimes(3);
    expect(menuItemUpdateMany).toHaveBeenCalledTimes(3);
  });
});
