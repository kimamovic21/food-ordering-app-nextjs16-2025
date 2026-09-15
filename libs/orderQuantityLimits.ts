export const MIN_ITEMS_PER_ORDER_LIMIT = 1;
export const DEFAULT_ITEMS_PER_ORDER_LIMIT = 20;
export const MAX_ITEMS_PER_ORDER_LIMIT = 20;

export const MIN_MENU_ITEM_QUANTITY_LIMIT = 1;
export const DEFAULT_MENU_ITEM_QUANTITY_LIMIT = 20;
export const MAX_MENU_ITEM_QUANTITY_LIMIT = 20;

type QuantityLimitCartItem = {
  _id?: unknown;
  name?: string;
  quantity?: unknown;
  maxQuantityPerOrder?: unknown;
};

export type CartQuantityLimitViolation =
  | {
      type: 'order_quantity_limit';
      totalQuantity: number;
      maxItemsPerOrder: number;
      message: string;
    }
  | {
      type: 'item_quantity_limit';
      itemId: string;
      itemName: string;
      itemQuantity: number;
      maxQuantityPerOrder: number;
      message: string;
    };

const clampInteger = (value: unknown, defaultValue: number, min: number, max: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

export const normalizeItemsPerOrderLimit = (value: unknown) =>
  clampInteger(
    value,
    DEFAULT_ITEMS_PER_ORDER_LIMIT,
    MIN_ITEMS_PER_ORDER_LIMIT,
    MAX_ITEMS_PER_ORDER_LIMIT
  );

export const normalizeMenuItemQuantityLimit = (value: unknown) =>
  clampInteger(
    value,
    DEFAULT_MENU_ITEM_QUANTITY_LIMIT,
    MIN_MENU_ITEM_QUANTITY_LIMIT,
    MAX_MENU_ITEM_QUANTITY_LIMIT
  );

const getQuantity = (value: unknown) => Math.max(1, Math.floor(Number(value) || 1));

export const getCartTotalQuantity = (cartItems: Array<{ quantity?: unknown }>) =>
  cartItems.reduce((total, item) => total + getQuantity(item.quantity), 0);

export const getCartQuantityForMenuItem = (
  cartItems: Array<{ _id?: unknown; quantity?: unknown }>,
  menuItemId: unknown
) => {
  const targetId = String(menuItemId || '');

  if (!targetId) {
    return 0;
  }

  return cartItems.reduce((total, item) => {
    if (String(item._id || '') !== targetId) {
      return total;
    }

    return total + getQuantity(item.quantity);
  }, 0);
};

export const validateCartQuantityLimits = ({
  cartItems,
  maxItemsPerOrder,
}: {
  cartItems: QuantityLimitCartItem[];
  maxItemsPerOrder?: unknown;
}): CartQuantityLimitViolation | null => {
  const normalizedMaxItemsPerOrder = normalizeItemsPerOrderLimit(maxItemsPerOrder);
  const totalQuantity = getCartTotalQuantity(cartItems);

  if (totalQuantity > normalizedMaxItemsPerOrder) {
    return {
      type: 'order_quantity_limit',
      totalQuantity,
      maxItemsPerOrder: normalizedMaxItemsPerOrder,
      message: `This restaurant accepts up to ${normalizedMaxItemsPerOrder} items in one order. Your cart has ${totalQuantity} items.`,
    };
  }

  const quantitiesByItemId = new Map<
    string,
    { itemName: string; itemQuantity: number; maxQuantityPerOrder: number }
  >();

  for (const item of cartItems) {
    const itemId = String(item._id || '');

    if (!itemId) {
      continue;
    }

    const existing = quantitiesByItemId.get(itemId);
    const maxQuantityPerOrder = normalizeMenuItemQuantityLimit(item.maxQuantityPerOrder);

    quantitiesByItemId.set(itemId, {
      itemName: item.name || 'This item',
      itemQuantity: (existing?.itemQuantity || 0) + getQuantity(item.quantity),
      maxQuantityPerOrder,
    });
  }

  for (const [itemId, itemTotal] of quantitiesByItemId.entries()) {
    if (itemTotal.itemQuantity > itemTotal.maxQuantityPerOrder) {
      return {
        type: 'item_quantity_limit',
        itemId,
        itemName: itemTotal.itemName,
        itemQuantity: itemTotal.itemQuantity,
        maxQuantityPerOrder: itemTotal.maxQuantityPerOrder,
        message: `${itemTotal.itemName} is limited to ${itemTotal.maxQuantityPerOrder} per order. Your cart has ${itemTotal.itemQuantity}.`,
      };
    }
  }

  return null;
};

export const canAddItemToCart = ({
  cartItems,
  item,
  maxItemsPerOrder,
}: {
  cartItems: QuantityLimitCartItem[];
  item: QuantityLimitCartItem;
  maxItemsPerOrder?: unknown;
}): CartQuantityLimitViolation | null => {
  const nextItemQuantity = getCartQuantityForMenuItem(cartItems, item._id) + 1;
  const itemLimit = normalizeMenuItemQuantityLimit(item.maxQuantityPerOrder);

  if (nextItemQuantity > itemLimit) {
    return {
      type: 'item_quantity_limit',
      itemId: String(item._id || ''),
      itemName: item.name || 'This item',
      itemQuantity: nextItemQuantity,
      maxQuantityPerOrder: itemLimit,
      message: `${item.name || 'This item'} is limited to ${itemLimit} per order.`,
    };
  }

  const nextTotalQuantity = getCartTotalQuantity(cartItems) + 1;
  const totalLimit = normalizeItemsPerOrderLimit(maxItemsPerOrder);

  if (nextTotalQuantity > totalLimit) {
    return {
      type: 'order_quantity_limit',
      totalQuantity: nextTotalQuantity,
      maxItemsPerOrder: totalLimit,
      message: `This restaurant accepts up to ${totalLimit} items in one order.`,
    };
  }

  return null;
};
