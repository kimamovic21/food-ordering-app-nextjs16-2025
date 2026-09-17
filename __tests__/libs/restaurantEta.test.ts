import {
  buildRestaurantDynamicEta,
  getKitchenLoadEtaDelayMinutes,
  normalizeRestaurantEstimateMinutes,
} from '@/libs/restaurantEta';

describe('restaurant dynamic ETA helpers', () => {
  it('normalizes restaurant estimate minutes safely', () => {
    expect(normalizeRestaurantEstimateMinutes(undefined, 25)).toBe(25);
    expect(normalizeRestaurantEstimateMinutes(-5, 25)).toBe(0);
    expect(normalizeRestaurantEstimateMinutes(25.6, 25)).toBe(26);
    expect(normalizeRestaurantEstimateMinutes(999, 25)).toBe(240);
  });

  it('adds preparation delay based on active kitchen load', () => {
    expect(getKitchenLoadEtaDelayMinutes({ activeKitchenOrders: 0, activeOrderLimit: 10 })).toBe(0);
    expect(getKitchenLoadEtaDelayMinutes({ activeKitchenOrders: 4, activeOrderLimit: 10 })).toBe(5);
    expect(getKitchenLoadEtaDelayMinutes({ activeKitchenOrders: 6, activeOrderLimit: 10 })).toBe(10);
    expect(getKitchenLoadEtaDelayMinutes({ activeKitchenOrders: 8, activeOrderLimit: 10 })).toBe(15);
    expect(getKitchenLoadEtaDelayMinutes({ activeKitchenOrders: 10, activeOrderLimit: 10 })).toBe(20);
  });

  it('builds customer-facing ETA and remaining slot messaging', () => {
    expect(
      buildRestaurantDynamicEta({
        restaurant: { averagePreparationMinutes: 25, averageDeliveryMinutes: 20 },
        activeKitchenOrders: 8,
        activeOrderLimit: 10,
      })
    ).toEqual(
      expect.objectContaining({
        capacitySlotsRemaining: 2,
        estimatedPreparationMinutes: 40,
        estimatedDeliveryMinutes: 20,
        estimatedTotalMinutes: 60,
        etaDelayMinutes: 15,
        etaTone: 'busy',
      })
    );

    expect(
      buildRestaurantDynamicEta({
        restaurant: { averagePreparationMinutes: 25, averageDeliveryMinutes: 20 },
        activeKitchenOrders: 10,
        activeOrderLimit: 10,
      })
    ).toEqual(
      expect.objectContaining({
        capacityMessage: 'Kitchen is at capacity with 10 active paid orders.',
        capacitySlotsRemaining: 0,
        estimatedPreparationMinutes: 45,
        etaTone: 'at_capacity',
      })
    );
  });
});
