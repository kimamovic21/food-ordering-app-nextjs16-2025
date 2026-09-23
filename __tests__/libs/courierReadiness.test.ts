import { buildCourierReadinessSnapshot } from '@/libs/courierReadiness';

describe('courier readiness helper', () => {
  it('marks delivery readiness healthy when multiple couriers are free', () => {
    expect(
      buildCourierReadinessSnapshot({
        activeKitchenOrders: 1,
        availableCouriers: 3,
        totalCouriers: 4,
      })
    ).toEqual({
      availableCouriers: 3,
      courierReadinessDelayMinutes: 0,
      courierReadinessMessage: 'Courier coverage looks good right now.',
      courierReadinessTone: 'healthy',
      isCourierReady: true,
      totalCouriers: 4,
    });
  });

  it('adds a delivery delay when no courier is available', () => {
    expect(
      buildCourierReadinessSnapshot({
        activeKitchenOrders: 2,
        availableCouriers: 0,
        totalCouriers: 2,
      })
    ).toEqual(
      expect.objectContaining({
        availableCouriers: 0,
        courierReadinessDelayMinutes: 15,
        courierReadinessTone: 'unavailable',
        isCourierReady: false,
        totalCouriers: 2,
      })
    );
  });

  it('warns when courier coverage is tight compared with kitchen demand', () => {
    const status = buildCourierReadinessSnapshot({
      activeKitchenOrders: 3,
      availableCouriers: 2,
      totalCouriers: 4,
    });

    expect(status.courierReadinessTone).toBe('limited');
    expect(status.courierReadinessDelayMinutes).toBe(10);
    expect(status.isCourierReady).toBe(true);
  });
});
