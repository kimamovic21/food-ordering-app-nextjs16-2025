import { roundMoney } from '@/libs/money';

export const DEFAULT_ACTIVE_ORDER_LIMIT = 10;
export const MIN_ACTIVE_ORDER_LIMIT = 1;
export const MAX_ACTIVE_ORDER_LIMIT = 100;
export const DEFAULT_MINIMUM_ORDER_AMOUNT = 10;
export const MINIMUM_ORDER_AMOUNT = 1;
export const MAXIMUM_ORDER_AMOUNT = 100;

type RestaurantCapacityLike = {
  activeOrderLimit?: unknown;
  isPaused?: unknown;
};

export const normalizeActiveOrderLimit = (value: unknown) => {
  const limit = Number(value);

  if (!Number.isFinite(limit)) {
    return DEFAULT_ACTIVE_ORDER_LIMIT;
  }

  return Math.min(MAX_ACTIVE_ORDER_LIMIT, Math.max(MIN_ACTIVE_ORDER_LIMIT, Math.floor(limit)));
};

export const normalizeMinimumOrderAmount = (value: unknown) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return DEFAULT_MINIMUM_ORDER_AMOUNT;
  }

  return roundMoney(Math.min(MAXIMUM_ORDER_AMOUNT, Math.max(MINIMUM_ORDER_AMOUNT, amount)));
};

const normalizeActiveKitchenOrderCount = (value: unknown) => {
  const count = Number(value);

  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.max(0, Math.floor(count));
};

export const buildRestaurantCapacitySnapshot = ({
  restaurant,
  activeKitchenOrders,
}: {
  restaurant: RestaurantCapacityLike;
  activeKitchenOrders: unknown;
}) => {
  const activeOrderLimit = normalizeActiveOrderLimit(restaurant?.activeOrderLimit);
  const normalizedActiveKitchenOrders = normalizeActiveKitchenOrderCount(activeKitchenOrders);
  const capacityUsagePercent = Math.min(
    100,
    Math.round((normalizedActiveKitchenOrders / activeOrderLimit) * 100)
  );
  const busySuggestionThreshold = Math.max(1, activeOrderLimit - 2);
  const isAtCapacity = normalizedActiveKitchenOrders >= activeOrderLimit;
  const isNearCapacity =
    normalizedActiveKitchenOrders >= busySuggestionThreshold &&
    normalizedActiveKitchenOrders < activeOrderLimit;

  return {
    activeKitchenOrders: normalizedActiveKitchenOrders,
    activeOrderLimit,
    capacityUsagePercent,
    isAtCapacity,
    isBusy: isAtCapacity,
    isNearCapacity,
    shouldSuggestPause: !Boolean(restaurant?.isPaused) && isNearCapacity,
  };
};
