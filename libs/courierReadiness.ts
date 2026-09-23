import 'server-only';

import mongoose from 'mongoose';
import { isCourierScheduledNow } from '@/libs/courierSchedule';
import type { CourierReadinessStatus } from '@/types/courier';

type BuildCourierReadinessSnapshotOptions = {
  activeKitchenOrders?: number;
  availableCouriers?: number;
  totalCouriers?: number;
};

type ResolveCourierReadinessStatusOptions = {
  activeKitchenOrders?: number;
  now?: Date;
};

const normalizeCount = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));

export const DEFAULT_COURIER_READINESS_STATUS: CourierReadinessStatus = {
  availableCouriers: 0,
  courierReadinessDelayMinutes: 0,
  courierReadinessMessage: 'Courier availability is not included in this status check.',
  courierReadinessTone: 'unknown',
  isCourierReady: true,
  totalCouriers: 0,
};

export const buildCourierReadinessSnapshot = ({
  activeKitchenOrders = 0,
  availableCouriers = 0,
  totalCouriers = 0,
}: BuildCourierReadinessSnapshotOptions): CourierReadinessStatus => {
  const normalizedAvailableCouriers = normalizeCount(availableCouriers);
  const normalizedTotalCouriers = normalizeCount(totalCouriers);
  const normalizedActiveKitchenOrders = normalizeCount(activeKitchenOrders);
  const busyCourierPressure =
    normalizedActiveKitchenOrders > 0 &&
    normalizedAvailableCouriers > 0 &&
    normalizedActiveKitchenOrders >= normalizedAvailableCouriers;

  if (normalizedTotalCouriers === 0) {
    return {
      availableCouriers: 0,
      courierReadinessDelayMinutes: 15,
      courierReadinessMessage:
        'No couriers are configured right now. Delivery may take longer until a courier is available.',
      courierReadinessTone: 'unavailable',
      isCourierReady: false,
      totalCouriers: 0,
    };
  }

  if (normalizedAvailableCouriers === 0) {
    return {
      availableCouriers: 0,
      courierReadinessDelayMinutes: 15,
      courierReadinessMessage:
        'No courier is currently available. Delivery may take longer while the restaurant waits for a courier.',
      courierReadinessTone: 'unavailable',
      isCourierReady: false,
      totalCouriers: normalizedTotalCouriers,
    };
  }

  if (normalizedAvailableCouriers === 1 || busyCourierPressure) {
    return {
      availableCouriers: normalizedAvailableCouriers,
      courierReadinessDelayMinutes: busyCourierPressure ? 10 : 5,
      courierReadinessMessage:
        normalizedAvailableCouriers === 1
          ? 'Only 1 courier is available right now. Delivery may take a little longer.'
          : 'Courier coverage is tight compared with current kitchen demand. Delivery may take a little longer.',
      courierReadinessTone: 'limited',
      isCourierReady: true,
      totalCouriers: normalizedTotalCouriers,
    };
  }

  return {
    availableCouriers: normalizedAvailableCouriers,
    courierReadinessDelayMinutes: 0,
    courierReadinessMessage: 'Courier coverage looks good right now.',
    courierReadinessTone: 'healthy',
    isCourierReady: true,
    totalCouriers: normalizedTotalCouriers,
  };
};

export const resolveCourierReadinessStatus = async ({
  activeKitchenOrders = 0,
  now = new Date(),
}: ResolveCourierReadinessStatusOptions = {}): Promise<CourierReadinessStatus> => {
  if (mongoose.connection?.readyState !== 1) {
    return DEFAULT_COURIER_READINESS_STATUS;
  }

  try {
    const { User } = await import('@/models/user');
    const couriers = await User.find({ role: 'courier' })
      .select('availability takenOrder courierWorkingHours')
      .lean();
    const availableCouriers = couriers.filter(
      (courier: any) =>
        courier.availability &&
        !courier.takenOrder &&
        isCourierScheduledNow(courier.courierWorkingHours, now)
    ).length;

    return buildCourierReadinessSnapshot({
      activeKitchenOrders,
      availableCouriers,
      totalCouriers: couriers.length,
    });
  } catch (error) {
    console.error('Failed to resolve courier readiness status:', error);
    return DEFAULT_COURIER_READINESS_STATUS;
  }
};
