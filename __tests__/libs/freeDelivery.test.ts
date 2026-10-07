import {
  calculateFreeDeliveryPricing,
  normalizeFreeDeliveryMinimumAmount,
} from '@/libs/freeDelivery';

describe('free delivery pricing', () => {
  it('charges delivery below the restaurant free delivery threshold', () => {
    expect(
      calculateFreeDeliveryPricing({
        courierFee: 5,
        freeDeliveryMinimumAmount: 50,
        subtotal: 49.99,
      })
    ).toEqual({
      courierPayoutAmount: 5,
      deliveryFee: 5,
      freeDeliveryDiscount: 0,
      freeDeliveryMinimumAmount: 50,
      isFreeDelivery: false,
      remainingForFreeDelivery: 0.01,
    });
  });

  it('waives the customer delivery fee at the threshold while preserving courier payout', () => {
    expect(
      calculateFreeDeliveryPricing({
        courierFee: 5,
        freeDeliveryMinimumAmount: 50,
        subtotal: 50,
      })
    ).toEqual({
      courierPayoutAmount: 5,
      deliveryFee: 0,
      freeDeliveryDiscount: 5,
      freeDeliveryMinimumAmount: 50,
      isFreeDelivery: true,
      remainingForFreeDelivery: 0,
    });
  });

  it('allows restaurants to disable free delivery with a zero threshold', () => {
    expect(
      calculateFreeDeliveryPricing({
        courierFee: 5,
        freeDeliveryMinimumAmount: 0,
        subtotal: 100,
      })
    ).toEqual({
      courierPayoutAmount: 5,
      deliveryFee: 5,
      freeDeliveryDiscount: 0,
      freeDeliveryMinimumAmount: 0,
      isFreeDelivery: false,
      remainingForFreeDelivery: 0,
    });
  });

  it('normalizes invalid thresholds to the default and clamps overly large values', () => {
    expect(normalizeFreeDeliveryMinimumAmount('bad-value')).toBe(50);
    expect(normalizeFreeDeliveryMinimumAmount(999)).toBe(500);
    expect(normalizeFreeDeliveryMinimumAmount(-10)).toBe(0);
  });
});
