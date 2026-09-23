import 'server-only';

import { normalizeItemsPerOrderLimit } from '@/libs/orderQuantityLimits';
import {
  buildRestaurantCapacitySnapshot,
  normalizeMinimumOrderAmount,
} from '@/libs/restaurantCapacity';
import {
  DEFAULT_COURIER_READINESS_STATUS,
  resolveCourierReadinessStatus,
} from '@/libs/courierReadiness';
import { getRestaurantOrderingStatus } from '@/libs/restaurantAvailability';
import { buildRestaurantDynamicEta } from '@/libs/restaurantEta';
import { Order } from '@/models/order';
import type { CartValidationRestaurantStatus } from '@/types/cart';
import type { CourierReadinessStatus, CourierReadinessTone } from '@/types/courier';

export const ACTIVE_KITCHEN_ORDER_STATUSES = ['placed', 'processing', 'ready'] as const;
export const RESTAURANT_BUSY_MESSAGE =
  'This restaurant is very busy at the moment. Please wait a little bit and try again.';

type RestaurantLike = {
  _id?: unknown;
  activeOrderLimit?: unknown;
  averageDeliveryMinutes?: unknown;
  averagePreparationMinutes?: unknown;
  blockedDates?: unknown;
  deliveryRadiusKm?: unknown;
  isPaused?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  maxItemsPerOrder?: unknown;
  minimumOrderAmount?: unknown;
  pauseReason?: unknown;
  workingHours?: unknown;
};

export const getRestaurantActiveKitchenOrdersQuery = (restaurantId: unknown) => ({
  restaurantId,
  orderStatus: { $in: [...ACTIVE_KITCHEN_ORDER_STATUSES] },
  $or: [{ orderPaid: true }, { paid: true }, { paymentStatus: true }],
});

export const countRestaurantActiveKitchenOrders = async (restaurantId: unknown) => {
  if (!restaurantId) {
    return 0;
  }

  return Order.countDocuments(getRestaurantActiveKitchenOrdersQuery(restaurantId));
};

export type RestaurantOrderingCapacityStatus = ReturnType<typeof getRestaurantOrderingStatus> &
  ReturnType<typeof buildRestaurantCapacitySnapshot> & {
    baseDeliveryMinutes: number;
    basePreparationMinutes: number;
    availableCouriers: number;
    capacityMessage: string | null;
    capacitySlotsRemaining: number;
    courierReadinessDelayMinutes: number;
    courierReadinessMessage: string;
    courierReadinessTone: CourierReadinessTone;
    estimatedDeliveryMinutes: number;
    estimatedPreparationMinutes: number;
    estimatedTotalMinutes: number;
    etaDelayMinutes: number;
    etaMessage: string;
    etaTone: 'normal' | 'moderate' | 'busy' | 'at_capacity';
    isCourierReady: boolean;
    maxItemsPerOrder: number;
    minimumOrderAmount: number;
    orderingMessage: string;
    totalCouriers: number;
  };

const getDeliveryReadinessEtaTone = (
  etaTone: RestaurantOrderingCapacityStatus['etaTone'],
  courierReadinessTone: CourierReadinessTone
): RestaurantOrderingCapacityStatus['etaTone'] => {
  if (etaTone === 'at_capacity' || etaTone === 'busy') {
    return etaTone;
  }

  if (courierReadinessTone === 'unavailable') {
    return 'busy';
  }

  if (courierReadinessTone === 'limited' && etaTone === 'normal') {
    return 'moderate';
  }

  return etaTone;
};

export const getRestaurantOrderingCapacityStatus = async ({
  restaurant,
  deliveryLatitude,
  deliveryLongitude,
  activeKitchenOrders,
  courierReadiness,
  includeCourierReadiness = false,
  now = new Date(),
}: {
  restaurant: RestaurantLike;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  activeKitchenOrders?: number;
  courierReadiness?: CourierReadinessStatus;
  includeCourierReadiness?: boolean;
  now?: Date;
}): Promise<RestaurantOrderingCapacityStatus> => {
  const orderingStatus = getRestaurantOrderingStatus({
    restaurant,
    deliveryLatitude,
    deliveryLongitude,
    now,
  });
  const resolvedActiveKitchenOrders =
    typeof activeKitchenOrders === 'number'
      ? activeKitchenOrders
      : await countRestaurantActiveKitchenOrders(restaurant?._id);
  const capacity = buildRestaurantCapacitySnapshot({
    restaurant,
    activeKitchenOrders: resolvedActiveKitchenOrders,
  });
  const eta = buildRestaurantDynamicEta({
    restaurant,
    activeKitchenOrders: capacity.activeKitchenOrders,
    activeOrderLimit: capacity.activeOrderLimit,
  });
  const resolvedCourierReadiness =
    courierReadiness ??
    (includeCourierReadiness
      ? await resolveCourierReadinessStatus({
          activeKitchenOrders: capacity.activeKitchenOrders,
          now,
        })
      : DEFAULT_COURIER_READINESS_STATUS);
  const courierDelayMinutes = resolvedCourierReadiness.courierReadinessDelayMinutes;
  const estimatedDeliveryMinutes = eta.estimatedDeliveryMinutes + courierDelayMinutes;
  const estimatedTotalMinutes = eta.estimatedTotalMinutes + courierDelayMinutes;
  const etaDelayMinutes = eta.etaDelayMinutes + courierDelayMinutes;
  const etaTone = getDeliveryReadinessEtaTone(eta.etaTone, resolvedCourierReadiness.courierReadinessTone);
  const etaMessage =
    courierDelayMinutes > 0
      ? `${eta.etaMessage} ${resolvedCourierReadiness.courierReadinessMessage}`
      : eta.etaMessage;
  const reason = capacity.isBusy
    ? `${RESTAURANT_BUSY_MESSAGE} ${eta.capacityMessage || ''}`.trim()
    : orderingStatus.reason;

  return {
    ...orderingStatus,
    ...capacity,
    ...eta,
    ...resolvedCourierReadiness,
    estimatedDeliveryMinutes,
    estimatedTotalMinutes,
    etaDelayMinutes,
    etaMessage,
    etaTone,
    isAcceptingOrders: orderingStatus.isAcceptingOrders && !capacity.isBusy,
    maxItemsPerOrder: normalizeItemsPerOrderLimit(restaurant?.maxItemsPerOrder),
    minimumOrderAmount: normalizeMinimumOrderAmount(restaurant?.minimumOrderAmount),
    orderingMessage:
      reason ||
      (resolvedCourierReadiness.courierReadinessTone === 'limited' ||
      resolvedCourierReadiness.courierReadinessTone === 'unavailable'
        ? resolvedCourierReadiness.courierReadinessMessage
        : etaMessage),
    reason,
  };
};

export const getRestaurantCartValidationStatus = ({
  orderingStatus,
  subtotal,
  totalCartQuantity,
}: {
  orderingStatus: RestaurantOrderingCapacityStatus;
  subtotal: number;
  totalCartQuantity: number;
}): CartValidationRestaurantStatus => {
  if (orderingStatus.isBusy) return 'busy';
  if (orderingStatus.isPaused) return 'paused';
  if (!orderingStatus.isOpen) return 'closed';
  if (orderingStatus.isClosingSoonForCheckout) return 'closing_soon';
  if (orderingStatus.isWithinDeliveryRadius === false) return 'outside_delivery_radius';
  if (orderingStatus.requiresDeliveryLocation) return 'missing_delivery_location';
  if (totalCartQuantity > orderingStatus.maxItemsPerOrder) return 'order_quantity_limit';
  if (subtotal < orderingStatus.minimumOrderAmount) return 'below_minimum';

  return 'valid';
};

export const getRestaurantCartValidationMessage = ({
  orderingStatus,
  restaurantStatus,
  totalCartQuantity,
}: {
  orderingStatus: RestaurantOrderingCapacityStatus;
  restaurantStatus: CartValidationRestaurantStatus;
  totalCartQuantity: number;
}) => {
  if (restaurantStatus === 'busy') {
    return orderingStatus.reason || RESTAURANT_BUSY_MESSAGE;
  }

  if (restaurantStatus === 'order_quantity_limit') {
    return `This restaurant accepts up to ${orderingStatus.maxItemsPerOrder} items in one order. Your cart has ${totalCartQuantity} items.`;
  }

  if (restaurantStatus === 'below_minimum') {
    return `Minimum order amount for this restaurant is $${orderingStatus.minimumOrderAmount.toFixed(
      2
    )}.`;
  }

  if (restaurantStatus === 'missing_delivery_location') {
    return `Please use your current location so we can confirm this restaurant delivers within ${orderingStatus.deliveryRadiusKm} km.`;
  }

  return orderingStatus.reason;
};
