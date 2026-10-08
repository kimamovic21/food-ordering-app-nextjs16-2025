export const DEFAULT_MENU_ITEM_STOCK_QUANTITY = 10;
export const MAX_MENU_ITEM_STOCK_QUANTITY = 1000;
export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const MAX_LOW_STOCK_THRESHOLD = 100;

export type MenuItemInventoryStatus = 'untracked' | 'in_stock' | 'low_stock' | 'sold_out';

type InventoryLike = {
  trackInventory?: unknown;
  stockQuantity?: unknown;
  lowStockThreshold?: unknown;
};

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

export const isInventoryTracked = (item: InventoryLike | null | undefined) =>
  item?.trackInventory === true;

export const normalizeMenuItemStockQuantity = (
  value: unknown,
  fallback = DEFAULT_MENU_ITEM_STOCK_QUANTITY
) => clampInteger(value, fallback, 0, MAX_MENU_ITEM_STOCK_QUANTITY);

export const normalizeLowStockThreshold = (
  value: unknown,
  fallback = DEFAULT_LOW_STOCK_THRESHOLD
) => clampInteger(value, fallback, 0, MAX_LOW_STOCK_THRESHOLD);

export const getTrackedStockQuantity = (item: InventoryLike | null | undefined) => {
  if (!isInventoryTracked(item)) {
    return null;
  }

  return normalizeMenuItemStockQuantity(item?.stockQuantity, 0);
};

export const getMenuItemInventoryStatus = (
  item: InventoryLike | null | undefined
): MenuItemInventoryStatus => {
  const stockQuantity = getTrackedStockQuantity(item);

  if (stockQuantity == null) {
    return 'untracked';
  }

  if (stockQuantity <= 0) {
    return 'sold_out';
  }

  const lowStockThreshold = normalizeLowStockThreshold(item?.lowStockThreshold);

  return stockQuantity <= lowStockThreshold ? 'low_stock' : 'in_stock';
};

export const getMenuItemInventoryLabel = (item: InventoryLike | null | undefined) => {
  const stockQuantity = getTrackedStockQuantity(item);

  if (stockQuantity == null) {
    return 'Inventory not tracked';
  }

  if (stockQuantity <= 0) {
    return 'Sold out';
  }

  const lowStockThreshold = normalizeLowStockThreshold(item?.lowStockThreshold);

  return stockQuantity <= lowStockThreshold
    ? `Only ${stockQuantity} left`
    : `${stockQuantity} in stock`;
};

export const buildMenuItemInventoryFields = (data: Record<string, unknown>) => {
  const trackInventory = data.trackInventory === true;

  return {
    trackInventory,
    stockQuantity: trackInventory
      ? normalizeMenuItemStockQuantity(data.stockQuantity, DEFAULT_MENU_ITEM_STOCK_QUANTITY)
      : null,
    lowStockThreshold: normalizeLowStockThreshold(data.lowStockThreshold),
  };
};
