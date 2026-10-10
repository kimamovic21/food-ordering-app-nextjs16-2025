import {
  buildMenuItemInventoryFields,
  getTrackedAvailableStockQuantity,
  getMenuItemInventoryLabel,
  getMenuItemInventoryStatus,
  normalizeLowStockThreshold,
  normalizeMenuItemStockQuantity,
} from '@/libs/menuItemInventory';

describe('menu item inventory helpers', () => {
  it('keeps inventory disabled by default for existing or untracked items', () => {
    expect(getMenuItemInventoryStatus({})).toBe('untracked');
    expect(getMenuItemInventoryLabel({ trackInventory: false, stockQuantity: 0 })).toBe(
      'Inventory not tracked'
    );
    expect(buildMenuItemInventoryFields({})).toEqual({
      lowStockThreshold: 3,
      stockQuantity: null,
      trackInventory: false,
    });
  });

  it('normalizes stock and low-stock thresholds safely', () => {
    expect(normalizeMenuItemStockQuantity('12.8')).toBe(12);
    expect(normalizeMenuItemStockQuantity('-5')).toBe(0);
    expect(normalizeMenuItemStockQuantity('5000')).toBe(1000);
    expect(normalizeLowStockThreshold('4.9')).toBe(4);
    expect(normalizeLowStockThreshold('200')).toBe(100);
  });

  it('reports low stock and sold out states for tracked items', () => {
    expect(
      getMenuItemInventoryStatus({
        lowStockThreshold: 3,
        stockQuantity: 2,
        trackInventory: true,
      })
    ).toBe('low_stock');
    expect(
      getMenuItemInventoryLabel({
        lowStockThreshold: 3,
        stockQuantity: 2,
        trackInventory: true,
      })
    ).toBe('Only 2 left');
    expect(getMenuItemInventoryStatus({ stockQuantity: 0, trackInventory: true })).toBe('sold_out');
  });

  it('treats reserved checkout stock as unavailable for new carts', () => {
    const item = {
      lowStockThreshold: 3,
      reservedStockQuantity: 3,
      stockQuantity: 5,
      trackInventory: true,
    };

    expect(getTrackedAvailableStockQuantity(item)).toBe(2);
    expect(getMenuItemInventoryStatus(item)).toBe('low_stock');
    expect(getMenuItemInventoryLabel(item)).toBe('Only 2 left');
  });
});
