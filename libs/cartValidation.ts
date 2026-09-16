import mongoose from 'mongoose';

import { getRestaurantOrderingStatus } from '@/libs/restaurantAvailability';
import {
  getCartTotalQuantity,
  normalizeItemsPerOrderLimit,
  normalizeMenuItemQuantityLimit,
} from '@/libs/orderQuantityLimits';
import { roundMoney } from '@/libs/money';
import { MenuItem } from '@/models/menuItem';
import { Order } from '@/models/order';
import { Restaurant } from '@/models/restaurant';
import type {
  CartSize,
  CartValidationItem,
  CartValidationRequestItem,
  CartValidationResponse,
  CartValidationRestaurantStatus,
} from '@/types/cart';

export type NormalizedCartValidationItem = {
  _id: string;
  cartPrice: number;
  itemKey: string;
  quantity: number;
  requestedSize: CartSize | null;
  restaurantId: string;
};

export type ValidatedCartItem = CartValidationItem & {
  _id: string;
  cartPrice: number;
  isAvailable: boolean;
  itemKey: string;
  quantity: number;
  requestedSize: CartSize | null;
  restaurantId: string;
};

type CartValidationMenuItem = {
  _id: unknown;
  adminId?: unknown;
  description?: string | null;
  image?: string | null;
  isAvailable?: boolean;
  maxQuantityPerOrder?: unknown;
  name?: string;
  priceLarge?: unknown;
  priceMedium?: unknown;
  priceSmall?: unknown;
  priceType?: string;
  restaurantId?: unknown;
};

export type CartOrderValidationResult = CartValidationResponse & {
  blockingItems: ValidatedCartItem[];
  currentRestaurantId: string | null;
  menuItemById: Map<string, CartValidationMenuItem>;
  normalizedItems: NormalizedCartValidationItem[];
  priceChangedItems: ValidatedCartItem[];
  requestedRestaurantIds: string[];
  restaurantDocument: Record<string, any> | null;
  validItems: ValidatedCartItem[];
};

export const normalizeCartSize = (value: unknown): CartSize | null => {
  const size = String(value || '')
    .trim()
    .toLowerCase();

  if (size === 'single' || size === 'small' || size === 'medium' || size === 'large') {
    return size;
  }

  return null;
};

export const normalizeDeliveryCoordinate = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const coordinate = Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
};

export const getCartItemKey = (id: string, size: string | null) => `${id}:${size || 'invalid'}`;

export const getMenuItemSizePrice = (menuItem: CartValidationMenuItem, requestedSize: CartSize) => {
  const prices = [
    { size: 'small' as const, price: Number(menuItem.priceSmall) },
    { size: 'medium' as const, price: Number(menuItem.priceMedium) },
    { size: 'large' as const, price: Number(menuItem.priceLarge) },
  ].filter((entry) => Number.isFinite(entry.price) && entry.price > 0);

  if (requestedSize === 'single') {
    if (prices.length === 1) {
      return { size: 'single' as const, price: prices[0].price };
    }

    return null;
  }

  if (menuItem.priceType === 'single' && requestedSize === 'small' && prices.length === 1) {
    return { size: 'single' as const, price: prices[0].price };
  }

  return prices.find((entry) => entry.size === requestedSize) ?? null;
};

const toRestaurantStatus = (orderingStatus: ReturnType<typeof getRestaurantOrderingStatus>) => {
  if (orderingStatus.isPaused) return 'paused' as const;
  if (!orderingStatus.isOpen) return 'closed' as const;
  if (orderingStatus.isClosingSoonForCheckout) return 'closing_soon' as const;
  if (orderingStatus.isWithinDeliveryRadius === false) return 'outside_delivery_radius' as const;
  if (orderingStatus.requiresDeliveryLocation) return 'missing_delivery_location' as const;
  return 'valid' as const;
};

const normalizeCartValidationItems = (
  cartItems: CartValidationRequestItem[]
): NormalizedCartValidationItem[] =>
  cartItems.map((item) => {
    const id = String(item._id || '');
    const size = normalizeCartSize(item.size);
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));

    return {
      _id: id,
      cartPrice: Number(item.price),
      itemKey: getCartItemKey(id, size),
      quantity,
      requestedSize: size,
      restaurantId: String(item.restaurantId || ''),
    };
  });

const serializeRestaurantId = (value: unknown) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && 'toString' in value) {
    return String(value);
  }

  return '';
};

export async function validateCartForOrder({
  cartItems,
  deliveryLatitude,
  deliveryLongitude,
}: {
  cartItems: CartValidationRequestItem[];
  deliveryLatitude?: unknown;
  deliveryLongitude?: unknown;
}): Promise<CartOrderValidationResult> {
  if (cartItems.length === 0) {
    return {
      blockingItems: [],
      canCheckout: false,
      currentRestaurantId: null,
      items: [],
      menuItemById: new Map(),
      message: 'Cart is empty.',
      normalizedItems: [],
      priceChangedItems: [],
      requestedRestaurantIds: [],
      restaurant: null,
      restaurantDocument: null,
      validItems: [],
    };
  }

  const normalizedItems = normalizeCartValidationItems(cartItems);
  const validIds = normalizedItems
    .map((item) => item._id)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const uniqueIds = Array.from(new Set(validIds)).map((id) => new mongoose.Types.ObjectId(id));
  const menuItems = uniqueIds.length
    ? await MenuItem.find({ _id: { $in: uniqueIds } })
        .select(
          '_id name description image restaurantId adminId isAvailable priceType priceSmall priceMedium priceLarge maxQuantityPerOrder'
        )
        .lean()
    : [];
  const menuItemById = new Map<string, CartValidationMenuItem>(
    menuItems.map((menuItem: CartValidationMenuItem) => [
      serializeRestaurantId(menuItem._id),
      menuItem,
    ])
  );

  let items: ValidatedCartItem[] = normalizedItems.map((cartItem): ValidatedCartItem => {
    if (!mongoose.Types.ObjectId.isValid(cartItem._id) || !cartItem.requestedSize) {
      return {
        ...cartItem,
        isAvailable: false,
        message: 'This cart item is invalid. Remove it before checkout.',
        status: 'invalid' as const,
      };
    }

    const menuItem = menuItemById.get(cartItem._id);
    if (!menuItem) {
      return {
        ...cartItem,
        isAvailable: false,
        message: 'This menu item was removed. Remove it from your cart.',
        status: 'deleted' as const,
      };
    }

    if (menuItem.isAvailable === false) {
      return {
        ...cartItem,
        image: menuItem.image || null,
        isAvailable: false,
        message: `${menuItem.name || 'This item'} is currently unavailable.`,
        name: menuItem.name,
        restaurantId: serializeRestaurantId(menuItem.restaurantId) || cartItem.restaurantId,
        status: 'unavailable' as const,
      };
    }

    const sizePrice = getMenuItemSizePrice(menuItem, cartItem.requestedSize);
    if (!sizePrice) {
      return {
        ...cartItem,
        image: menuItem.image || null,
        isAvailable: false,
        message: `${menuItem.name || 'This item'} is not available in that size anymore.`,
        name: menuItem.name,
        restaurantId: serializeRestaurantId(menuItem.restaurantId) || cartItem.restaurantId,
        status: 'invalid_size' as const,
      };
    }

    const currentPrice = roundMoney(sizePrice.price);
    const cartPrice = Number.isFinite(cartItem.cartPrice) ? roundMoney(cartItem.cartPrice) : null;
    const priceChanged = cartPrice != null && cartPrice !== currentPrice;

    return {
      ...cartItem,
      image: menuItem.image || null,
      isAvailable: true,
      maxQuantityPerOrder: normalizeMenuItemQuantityLimit(menuItem.maxQuantityPerOrder),
      message: priceChanged
        ? `${menuItem.name || 'This item'} price changed from $${cartPrice?.toFixed(
            2
          )} to $${currentPrice.toFixed(2)}.`
        : null,
      name: menuItem.name,
      previousPrice: priceChanged ? cartPrice : null,
      price: currentPrice,
      priceChanged,
      restaurantId: serializeRestaurantId(menuItem.restaurantId) || cartItem.restaurantId,
      size: sizePrice.size,
      status: 'valid' as const,
    };
  });

  const validItemQuantityById = new Map<string, number>();

  for (const item of items) {
    if (item.status !== 'valid') {
      continue;
    }

    validItemQuantityById.set(
      item._id,
      (validItemQuantityById.get(item._id) || 0) + Math.max(1, Number(item.quantity) || 1)
    );
  }

  items = items.map((item) => {
    if (item.status !== 'valid') {
      return item;
    }

    const maxQuantityPerOrder = normalizeMenuItemQuantityLimit(item.maxQuantityPerOrder);
    const itemQuantity = validItemQuantityById.get(item._id) || 0;

    if (itemQuantity <= maxQuantityPerOrder) {
      return item;
    }

    return {
      ...item,
      isAvailable: false,
      message: `${item.name || 'This item'} is limited to ${maxQuantityPerOrder} per order. Your cart has ${itemQuantity}.`,
      status: 'quantity_limit' as const,
    };
  });

  const blockingItems = items.filter((item) => item.status !== 'valid');
  const priceChangedItems = items.filter((item) => item.status === 'valid' && item.priceChanged);
  const requestedRestaurantIds = Array.from(
    new Set(normalizedItems.map((item) => item.restaurantId).filter(Boolean))
  );
  const currentRestaurantIds = Array.from(
    new Set(
      items
        .filter((item) => item.status === 'valid' && item.restaurantId)
        .map((item) => String(item.restaurantId))
    )
  );
  const validItems = items.filter((item) => item.status === 'valid');
  let restaurantValidation: CartValidationResponse['restaurant'] = null;
  let restaurantDocument: Record<string, any> | null = null;

  if (blockingItems.length === 0) {
    if (requestedRestaurantIds.length > 1 || currentRestaurantIds.length > 1) {
      restaurantValidation = {
        canCheckout: false,
        message: 'Cart must contain items from one restaurant only.',
        status: 'multiple_restaurants',
      };
    } else {
      const requestedRestaurantId = requestedRestaurantIds[0] || null;
      const currentRestaurantId = currentRestaurantIds[0] || requestedRestaurantId;

      if (
        requestedRestaurantId &&
        currentRestaurantId &&
        requestedRestaurantId !== currentRestaurantId
      ) {
        restaurantValidation = {
          canCheckout: false,
          message: 'Cart restaurant data changed. Please refresh your cart before checkout.',
          restaurantId: currentRestaurantId,
          status: 'restaurant_mismatch',
        };
      } else if (!currentRestaurantId || !mongoose.Types.ObjectId.isValid(currentRestaurantId)) {
        restaurantValidation = {
          canCheckout: false,
          message: 'Cart restaurant is missing. Please refresh your cart before checkout.',
          status: 'missing',
        };
      } else {
        const restaurantQuery = Restaurant.findById(currentRestaurantId) as any;
        const restaurant =
          typeof restaurantQuery?.select === 'function'
            ? await restaurantQuery
                .select(
                  'name ownerId tax courierFee workingHours blockedDates deliveryRadiusKm isPaused pauseReason activeOrderLimit minimumOrderAmount maxItemsPerOrder averagePreparationMinutes averageDeliveryMinutes latitude longitude'
                )
                .lean()
            : await restaurantQuery;

        restaurantDocument = restaurant as Record<string, any> | null;

        if (!restaurant) {
          restaurantValidation = {
            canCheckout: false,
            message: 'This restaurant is no longer available.',
            restaurantId: currentRestaurantId,
            status: 'missing',
          };
        } else {
          const normalizedDeliveryLatitude = normalizeDeliveryCoordinate(deliveryLatitude);
          const normalizedDeliveryLongitude = normalizeDeliveryCoordinate(deliveryLongitude);
          const orderingStatus = getRestaurantOrderingStatus({
            restaurant,
            deliveryLatitude: normalizedDeliveryLatitude,
            deliveryLongitude: normalizedDeliveryLongitude,
          });
          const activeOrderLimit = Math.min(
            100,
            Math.max(1, Number((restaurant as any).activeOrderLimit) || 10)
          );
          const activeKitchenOrders = await Order.countDocuments({
            $or: [{ orderPaid: true }, { paid: true }, { paymentStatus: true }],
            orderStatus: { $in: ['placed', 'processing', 'ready'] },
            restaurantId: (restaurant as any)._id,
          });
          const isBusy = activeKitchenOrders >= activeOrderLimit;
          const subtotal = roundMoney(
            items.reduce((sum, item) => {
              if (item.status !== 'valid' || typeof item.price !== 'number') {
                return sum;
              }

              return sum + item.price * Math.max(1, Number(item.quantity) || 1);
            }, 0)
          );
          const minimumOrderAmount = roundMoney(
            Math.min(100, Math.max(1, Number((restaurant as any).minimumOrderAmount) || 10))
          );
          const maxItemsPerOrder = normalizeItemsPerOrderLimit(
            (restaurant as any).maxItemsPerOrder
          );
          const totalCartQuantity = getCartTotalQuantity(validItems);
          const baseRestaurantStatus = toRestaurantStatus(orderingStatus);
          let restaurantStatus: CartValidationRestaurantStatus = 'valid';

          if (isBusy) {
            restaurantStatus = 'busy';
          } else if (baseRestaurantStatus !== 'valid') {
            restaurantStatus = baseRestaurantStatus;
          } else if (totalCartQuantity > maxItemsPerOrder) {
            restaurantStatus = 'order_quantity_limit';
          } else if (subtotal < minimumOrderAmount) {
            restaurantStatus = 'below_minimum';
          }

          const restaurantMessage =
            restaurantStatus === 'busy'
              ? 'This restaurant is very busy at the moment. Please wait a little bit and try again.'
              : restaurantStatus === 'order_quantity_limit'
                ? `This restaurant accepts up to ${maxItemsPerOrder} items in one order. Your cart has ${totalCartQuantity} items.`
                : restaurantStatus === 'below_minimum'
                  ? `Minimum order amount for this restaurant is $${minimumOrderAmount.toFixed(2)}.`
                  : orderingStatus.requiresDeliveryLocation
                    ? `Please use your current location so we can confirm this restaurant delivers within ${orderingStatus.deliveryRadiusKm} km.`
                    : orderingStatus.reason;

          restaurantValidation = {
            activeKitchenOrders,
            activeOrderLimit,
            canCheckout: restaurantStatus === 'valid',
            deliveryRadiusKm: orderingStatus.deliveryRadiusKm,
            distanceKm: orderingStatus.distanceKm,
            isAcceptingOrders: orderingStatus.isAcceptingOrders && !isBusy,
            isBusy,
            isOpen: orderingStatus.isOpen,
            isPaused: orderingStatus.isPaused,
            maxItemsPerOrder,
            message: restaurantMessage,
            minimumOrderAmount,
            restaurantId: String((restaurant as any)._id),
            restaurantName: String((restaurant as any).name || 'The restaurant'),
            status: restaurantStatus,
            subtotal,
            totalCartQuantity,
          };
        }
      }
    }
  }

  const restaurantBlocksCheckout = restaurantValidation ? !restaurantValidation.canCheckout : false;

  return {
    blockingItems,
    canCheckout: blockingItems.length === 0 && !restaurantBlocksCheckout,
    currentRestaurantId: currentRestaurantIds[0] || requestedRestaurantIds[0] || null,
    items,
    menuItemById,
    message:
      blockingItems[0]?.message ||
      restaurantValidation?.message ||
      (priceChangedItems.length > 0
        ? 'Some cart prices changed. Checkout will use the current menu prices.'
        : null),
    normalizedItems,
    priceChangedItems,
    requestedRestaurantIds,
    restaurant: restaurantValidation,
    restaurantDocument,
    validItems,
  };
}
