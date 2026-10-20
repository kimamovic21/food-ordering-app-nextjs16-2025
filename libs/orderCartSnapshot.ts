import mongoose from 'mongoose';
import { MenuItem } from '@/models/menuItem';
import { getTrackedAvailableStockQuantity } from '@/libs/menuItemInventory';
import { limitCartItemNoteInput } from '@/libs/cartItemNotes';
import { normalizeMenuItemQuantityLimit } from '@/libs/orderQuantityLimits';
import type { CartItem, CartSize } from '@/types/cart';
import type {
  ReorderAdjustedItem,
  ReorderPriceChangedItem,
  ReorderRecoverySummary,
  ReorderSkippedItem,
} from '@/types/order';

type OrderCartSnapshot = {
  adjustedItems: ReorderAdjustedItem[];
  cartItems: CartItem[];
  priceChangedItems: ReorderPriceChangedItem[];
  recoverySummary: ReorderRecoverySummary;
  skippedItems: ReorderSkippedItem[];
};

const getOrderProductId = (product: any) =>
  product?.productId?.toString?.() || String(product?.productId || '');

const getOrderProductName = (product: any) => String(product?.name || 'A menu item');

const getOrderProductQuantity = (product: any) => {
  const quantity = Number(product?.quantity);
  return Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
};

const getFinitePrice = (value: unknown) => {
  const price = Number(value);

  return Number.isFinite(price) ? price : null;
};

const getPositiveMenuPrice = (value: unknown) => {
  const price = getFinitePrice(value);

  return price != null && price > 0 ? price : null;
};

const normalizeSize = (value: unknown, priceType?: string): CartSize => {
  const size = String(value || '').toLowerCase();

  if (priceType === 'single') return 'single';
  if (size.includes('large')) return 'large';
  if (size.includes('medium')) return 'medium';
  if (size.includes('small')) return 'small';

  return 'single';
};

const getMenuItemPrice = (menuItem: any, size: CartSize) => {
  if (size === 'large') return getPositiveMenuPrice(menuItem.priceLarge);
  if (size === 'medium') return getPositiveMenuPrice(menuItem.priceMedium);
  if (size === 'small' || size === 'single') return getPositiveMenuPrice(menuItem.priceSmall);

  return null;
};

const createRecoverySummary = ({
  adjustedItems,
  cartItems,
  cartProducts,
  priceChangedItems,
  skippedItems,
}: Omit<OrderCartSnapshot, 'recoverySummary'> & {
  cartProducts: any[];
}): ReorderRecoverySummary => {
  const originalQuantity = cartProducts.reduce(
    (sum, product) => sum + getOrderProductQuantity(product),
    0
  );
  const addedQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    adjustedItemCount: adjustedItems.length,
    addedLineCount: cartItems.length,
    addedQuantity,
    hasChanges: skippedItems.length > 0 || priceChangedItems.length > 0 || adjustedItems.length > 0,
    originalLineCount: cartProducts.length,
    originalQuantity,
    priceChangedItemCount: priceChangedItems.length,
    skippedItemCount: skippedItems.length,
  };
};

export const buildOrderCartSnapshotFromOrderProducts = async (
  cartProducts: any[]
): Promise<OrderCartSnapshot> => {
  if (!Array.isArray(cartProducts) || cartProducts.length === 0) {
    throw new Error('This order has no menu items to reorder');
  }

  const skippedItems: ReorderSkippedItem[] = [];
  const validProductIds: string[] = [];

  cartProducts.forEach((product) => {
    const productId = getOrderProductId(product);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      skippedItems.push({
        productId,
        name: getOrderProductName(product),
        size: product?.size ?? null,
        requestedQuantity: getOrderProductQuantity(product),
        reason: 'invalid_product',
        message: `${getOrderProductName(product)} cannot be reordered because its menu item reference is invalid.`,
      });
      return;
    }

    validProductIds.push(productId);
  });

  const menuItems = validProductIds.length
    ? await MenuItem.find({ _id: { $in: Array.from(new Set(validProductIds)) } })
        .select(
          '_id name description image priceType priceSmall priceMedium priceLarge maxQuantityPerOrder restaurantId isAvailable trackInventory stockQuantity reservedStockQuantity lowStockThreshold'
        )
        .lean()
    : [];
  const menuItemsById = new Map(menuItems.map((item: any) => [item._id.toString(), item]));
  const cartItems: CartItem[] = [];
  const priceChangedItems: ReorderPriceChangedItem[] = [];
  const adjustedItems: ReorderAdjustedItem[] = [];
  const allocatedQuantityById = new Map<string, number>();

  cartProducts.forEach((product: any) => {
    const productId = getOrderProductId(product);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return;
    }

    const menuItem = menuItemsById.get(productId);
    const requestedQuantity = getOrderProductQuantity(product);
    const productName = getOrderProductName(product);

    if (!menuItem) {
      skippedItems.push({
        productId,
        name: productName,
        size: product?.size ?? null,
        requestedQuantity,
        reason: 'deleted',
        message: `${productName} is no longer on the menu.`,
      });
      return;
    }

    const itemName = String(menuItem.name || productName);

    if (menuItem.isAvailable === false) {
      skippedItems.push({
        productId,
        name: itemName,
        size: product?.size ?? null,
        requestedQuantity,
        reason: 'unavailable',
        message: `${itemName} is currently unavailable.`,
      });
      return;
    }

    const size = normalizeSize(product.size, menuItem.priceType);
    const price = getMenuItemPrice(menuItem, size);

    if (price == null) {
      skippedItems.push({
        productId,
        name: itemName,
        size,
        requestedQuantity,
        reason: 'invalid_size',
        message: `${itemName} is no longer available in ${size} size.`,
      });
      return;
    }

    const maxQuantityPerOrder = normalizeMenuItemQuantityLimit(menuItem.maxQuantityPerOrder);
    const stockQuantity = getTrackedAvailableStockQuantity(menuItem);

    if (stockQuantity === 0) {
      skippedItems.push({
        productId,
        name: itemName,
        size,
        requestedQuantity,
        reason: 'sold_out',
        message: `${itemName} is sold out.`,
      });
      return;
    }

    // All sizes share one menu item's inventory and per-order allowance.
    // Allocate in original order so recovery is deterministic.
    const allocatedQuantity = allocatedQuantityById.get(productId) || 0;
    const remainingLimit = Math.max(0, maxQuantityPerOrder - allocatedQuantity);
    const remainingStock =
      stockQuantity == null ? Infinity : Math.max(0, stockQuantity - allocatedQuantity);
    const quantity = Math.min(requestedQuantity, remainingLimit, remainingStock);
    const reason = remainingStock < remainingLimit ? 'stock_limit' : 'item_quantity_limit';

    if (quantity === 0) {
      skippedItems.push({
        productId,
        name: itemName,
        size,
        requestedQuantity,
        reason,
        message:
          reason === 'stock_limit'
            ? `${itemName} (${size}) was skipped because other sizes already use the available stock.`
            : `${itemName} (${size}) was skipped because other sizes already reach the per-order limit.`,
      });
      return;
    }

    if (quantity < requestedQuantity) {
      adjustedItems.push({
        productId,
        name: itemName,
        size,
        requestedQuantity,
        appliedQuantity: quantity,
        reason,
        message:
          reason === 'stock_limit'
            ? `${itemName} (${size}) was reduced to ${quantity} to stay within the available stock across all sizes.`
            : `${itemName} (${size}) was reduced to ${quantity} to stay within the per-order limit across all sizes.`,
      });
    }

    allocatedQuantityById.set(productId, allocatedQuantity + quantity);

    const previousPrice = getFinitePrice(product.price);

    if (previousPrice != null && Math.abs(previousPrice - price) >= 0.01) {
      priceChangedItems.push({
        productId,
        name: itemName,
        size,
        quantity,
        previousPrice,
        currentPrice: price,
      });
    }

    cartItems.push({
      _id: menuItem._id.toString(),
      name: menuItem.name,
      description: menuItem.description || '',
      image: menuItem.image || '',
      size,
      price,
      quantity,
      restaurantId: menuItem.restaurantId?.toString?.() || String(menuItem.restaurantId || ''),
      maxQuantityPerOrder,
      trackInventory: menuItem.trackInventory === true,
      stockQuantity,
      lowStockThreshold: menuItem.lowStockThreshold,
      note: limitCartItemNoteInput(product.note),
    });
  });

  const restaurantIds = new Set(cartItems.map((item) => item.restaurantId));
  if (restaurantIds.size > 1) {
    throw new Error('This order cannot be reordered because it contains multiple restaurants.');
  }

  const recoverySummary = createRecoverySummary({
    adjustedItems,
    cartItems,
    cartProducts,
    priceChangedItems,
    skippedItems,
  });

  return {
    adjustedItems,
    cartItems,
    priceChangedItems,
    recoverySummary,
    skippedItems,
  };
};

export const buildCartItemsFromOrderProducts = async (cartProducts: any[]) => {
  const snapshot = await buildOrderCartSnapshotFromOrderProducts(cartProducts);

  if (snapshot.skippedItems.length > 0) {
    throw new Error(snapshot.skippedItems[0].message);
  }

  if (snapshot.cartItems.length === 0) {
    throw new Error('No items from this order can be reordered.');
  }

  return snapshot.cartItems;
};

export const createOrderPatternKey = (order: any) => {
  const restaurantId = order.restaurantId?.toString?.() || String(order.restaurantId || '');
  const products = Array.isArray(order.cartProducts) ? order.cartProducts : [];
  const itemKey = products
    .map((product: any) => {
      const productId = product.productId?.toString?.() || String(product.productId || '');
      const size = String(product.size || '').toLowerCase();
      const quantity = Math.max(1, Number(product.quantity) || 1);

      return `${productId}:${size}:${quantity}`;
    })
    .sort()
    .join('|');

  return `${restaurantId}::${itemKey}`;
};
