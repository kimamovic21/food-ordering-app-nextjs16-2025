import { roundMoney, subtractMoney } from '@/libs/money';

export const DEFAULT_FREE_DELIVERY_MINIMUM_AMOUNT = 50;
export const MAX_FREE_DELIVERY_MINIMUM_AMOUNT = 500;

export const normalizeFreeDeliveryMinimumAmount = (value: unknown) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return DEFAULT_FREE_DELIVERY_MINIMUM_AMOUNT;
  }

  return Math.min(MAX_FREE_DELIVERY_MINIMUM_AMOUNT, Math.max(0, roundMoney(amount)));
};

export const calculateFreeDeliveryPricing = ({
  subtotal,
  courierFee,
  freeDeliveryMinimumAmount,
}: {
  subtotal: number;
  courierFee: number;
  freeDeliveryMinimumAmount?: unknown;
}) => {
  const normalizedSubtotal = Math.max(0, roundMoney(subtotal));
  const courierPayoutAmount = Math.max(0, roundMoney(courierFee));
  const normalizedMinimumAmount = normalizeFreeDeliveryMinimumAmount(freeDeliveryMinimumAmount);
  const isFreeDelivery =
    normalizedMinimumAmount > 0 && normalizedSubtotal >= normalizedMinimumAmount;
  const deliveryFee = isFreeDelivery ? 0 : courierPayoutAmount;
  const freeDeliveryDiscount = isFreeDelivery ? courierPayoutAmount : 0;
  const remainingForFreeDelivery =
    normalizedMinimumAmount > 0
      ? Math.max(0, roundMoney(subtractMoney(normalizedMinimumAmount, normalizedSubtotal)))
      : 0;

  return {
    courierPayoutAmount,
    deliveryFee,
    freeDeliveryDiscount,
    freeDeliveryMinimumAmount: normalizedMinimumAmount,
    isFreeDelivery,
    remainingForFreeDelivery,
  };
};
