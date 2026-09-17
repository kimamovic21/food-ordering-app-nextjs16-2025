import {
  buildRestaurantCapacitySnapshot,
  normalizeActiveOrderLimit,
  normalizeMinimumOrderAmount,
} from '@/libs/restaurantCapacity';

describe('restaurant capacity helpers', () => {
  it('normalizes restaurant limits into safe production ranges', () => {
    expect(normalizeActiveOrderLimit(undefined)).toBe(10);
    expect(normalizeActiveOrderLimit(0)).toBe(1);
    expect(normalizeActiveOrderLimit(150)).toBe(100);
    expect(normalizeActiveOrderLimit(12.8)).toBe(12);

    expect(normalizeMinimumOrderAmount(undefined)).toBe(10);
    expect(normalizeMinimumOrderAmount(0)).toBe(1);
    expect(normalizeMinimumOrderAmount(150)).toBe(100);
    expect(normalizeMinimumOrderAmount(12.345)).toBe(12.35);
  });

  it('builds a shared capacity snapshot for admin and checkout flows', () => {
    expect(
      buildRestaurantCapacitySnapshot({
        restaurant: { activeOrderLimit: 10, isPaused: false },
        activeKitchenOrders: 8,
      })
    ).toEqual({
      activeKitchenOrders: 8,
      activeOrderLimit: 10,
      capacityUsagePercent: 80,
      isAtCapacity: false,
      isBusy: false,
      isNearCapacity: true,
      shouldSuggestPause: true,
    });

    expect(
      buildRestaurantCapacitySnapshot({
        restaurant: { activeOrderLimit: 3, isPaused: true },
        activeKitchenOrders: 3,
      })
    ).toEqual(
      expect.objectContaining({
        isAtCapacity: true,
        isBusy: true,
        isNearCapacity: false,
        shouldSuggestPause: false,
      })
    );
  });
});
