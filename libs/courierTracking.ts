import type { CourierTrackingLocation } from '@/types/courierTracking';

export const COURIER_LOCATION_POLL_MS = 60_000;
export const COURIER_LOCATION_FRESH_MS = 120_000;
const CLOCK_SKEW_TOLERANCE_MS = 30_000;

export function normalizeCourierLocation(value: unknown): CourierTrackingLocation | null {
  if (!value || typeof value !== 'object') return null;
  const { latitude, longitude, lastLocationUpdate } = value as Record<string, unknown>;
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    return null;

  const timestamp =
    lastLocationUpdate instanceof Date
      ? lastLocationUpdate.getTime()
      : typeof lastLocationUpdate === 'string'
        ? Date.parse(lastLocationUpdate)
        : NaN;

  return {
    latitude,
    longitude,
    lastLocationUpdate: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
  };
}

export function getCourierLocationFreshness(
  lastLocationUpdate: string | null,
  checkedAt: string,
  elapsedMs = 0
): 'fresh' | 'stale' | 'unknown' {
  if (!lastLocationUpdate) return 'unknown';
  // Use the server clock at receipt, then age the reading locally between polls.
  const ageAtCheck = Date.parse(checkedAt) - Date.parse(lastLocationUpdate);
  if (!Number.isFinite(ageAtCheck) || ageAtCheck < -CLOCK_SKEW_TOLERANCE_MS) return 'unknown';
  return Math.max(0, ageAtCheck) + Math.max(0, elapsedMs) < COURIER_LOCATION_FRESH_MS
    ? 'fresh'
    : 'stale';
}
