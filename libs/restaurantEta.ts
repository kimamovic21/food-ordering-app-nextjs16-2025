export const DEFAULT_PREPARATION_MINUTES = 25;
export const DEFAULT_DELIVERY_MINUTES = 20;
export const MAX_RESTAURANT_ESTIMATE_MINUTES = 240;

type RestaurantEtaLike = {
  averageDeliveryMinutes?: unknown;
  averagePreparationMinutes?: unknown;
};

export type RestaurantEtaTone = 'normal' | 'moderate' | 'busy' | 'at_capacity';

export type RestaurantDynamicEta = {
  baseDeliveryMinutes: number;
  basePreparationMinutes: number;
  capacitySlotsRemaining: number;
  capacityMessage: string | null;
  estimatedDeliveryMinutes: number;
  estimatedPreparationMinutes: number;
  estimatedTotalMinutes: number;
  etaDelayMinutes: number;
  etaMessage: string;
  etaTone: RestaurantEtaTone;
};

export const normalizeRestaurantEstimateMinutes = (value: unknown, defaultValue: number) => {
  const minutes = Number(value);

  if (!Number.isFinite(minutes)) {
    return defaultValue;
  }

  return Math.min(MAX_RESTAURANT_ESTIMATE_MINUTES, Math.max(0, Math.round(minutes)));
};

export const getKitchenLoadEtaDelayMinutes = ({
  activeKitchenOrders,
  activeOrderLimit,
}: {
  activeKitchenOrders: number;
  activeOrderLimit: number;
}) => {
  if (activeOrderLimit <= 0 || activeKitchenOrders <= 0) {
    return 0;
  }

  const loadRatio = activeKitchenOrders / activeOrderLimit;

  if (loadRatio >= 1) return 20;
  if (loadRatio >= 0.8) return 15;
  if (loadRatio >= 0.6) return 10;
  if (loadRatio >= 0.4) return 5;

  return 0;
};

const pluralizeSlot = (slots: number) => (slots === 1 ? 'slot' : 'slots');
const pluralizeOrder = (orders: number) => (orders === 1 ? 'order' : 'orders');

export const buildRestaurantDynamicEta = ({
  restaurant,
  activeKitchenOrders,
  activeOrderLimit,
}: {
  restaurant: RestaurantEtaLike;
  activeKitchenOrders: number;
  activeOrderLimit: number;
}): RestaurantDynamicEta => {
  const basePreparationMinutes = normalizeRestaurantEstimateMinutes(
    restaurant?.averagePreparationMinutes,
    DEFAULT_PREPARATION_MINUTES
  );
  const baseDeliveryMinutes = normalizeRestaurantEstimateMinutes(
    restaurant?.averageDeliveryMinutes,
    DEFAULT_DELIVERY_MINUTES
  );
  const safeActiveKitchenOrders = Math.max(0, Math.floor(Number(activeKitchenOrders) || 0));
  const safeActiveOrderLimit = Math.max(1, Math.floor(Number(activeOrderLimit) || 1));
  const capacitySlotsRemaining = Math.max(0, safeActiveOrderLimit - safeActiveKitchenOrders);
  const etaDelayMinutes = getKitchenLoadEtaDelayMinutes({
    activeKitchenOrders: safeActiveKitchenOrders,
    activeOrderLimit: safeActiveOrderLimit,
  });
  const estimatedPreparationMinutes = Math.min(
    MAX_RESTAURANT_ESTIMATE_MINUTES,
    basePreparationMinutes + etaDelayMinutes
  );
  const estimatedDeliveryMinutes = baseDeliveryMinutes;
  const estimatedTotalMinutes = estimatedPreparationMinutes + estimatedDeliveryMinutes;

  if (capacitySlotsRemaining === 0) {
    return {
      baseDeliveryMinutes,
      basePreparationMinutes,
      capacitySlotsRemaining,
      capacityMessage: `Kitchen is at capacity with ${safeActiveKitchenOrders} active paid ${pluralizeOrder(
        safeActiveKitchenOrders
      )}.`,
      estimatedDeliveryMinutes,
      estimatedPreparationMinutes,
      estimatedTotalMinutes,
      etaDelayMinutes,
      etaMessage: `Kitchen is at capacity. Estimated prep is about ${estimatedPreparationMinutes} min once ordering opens again.`,
      etaTone: 'at_capacity',
    };
  }

  if (capacitySlotsRemaining <= 2 || etaDelayMinutes >= 15) {
    return {
      baseDeliveryMinutes,
      basePreparationMinutes,
      capacitySlotsRemaining,
      capacityMessage: `Only ${capacitySlotsRemaining} active order ${pluralizeSlot(
        capacitySlotsRemaining
      )} left before the kitchen reaches capacity.`,
      estimatedDeliveryMinutes,
      estimatedPreparationMinutes,
      estimatedTotalMinutes,
      etaDelayMinutes,
      etaMessage: `Kitchen is busy. Estimated prep is about ${estimatedPreparationMinutes} min, plus about ${estimatedDeliveryMinutes} min for delivery.`,
      etaTone: 'busy',
    };
  }

  if (etaDelayMinutes > 0) {
    return {
      baseDeliveryMinutes,
      basePreparationMinutes,
      capacitySlotsRemaining,
      capacityMessage: null,
      estimatedDeliveryMinutes,
      estimatedPreparationMinutes,
      estimatedTotalMinutes,
      etaDelayMinutes,
      etaMessage: `Kitchen has active orders. Estimated prep is about ${estimatedPreparationMinutes} min, plus about ${estimatedDeliveryMinutes} min for delivery.`,
      etaTone: 'moderate',
    };
  }

  return {
    baseDeliveryMinutes,
    basePreparationMinutes,
    capacitySlotsRemaining,
    capacityMessage: null,
    estimatedDeliveryMinutes,
    estimatedPreparationMinutes,
    estimatedTotalMinutes,
    etaDelayMinutes,
    etaMessage: `Estimated prep is about ${estimatedPreparationMinutes} min, plus about ${estimatedDeliveryMinutes} min for delivery.`,
    etaTone: 'normal',
  };
};
