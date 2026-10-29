'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from '@/libs/queryKeys';
import {
  COURIER_LOCATION_POLL_MS,
  getCourierLocationFreshness,
  normalizeCourierLocation,
} from '@/libs/courierTracking';
import type { CourierTrackingResponse } from '@/types/courierTracking';

export async function fetchCourierTracking(
  orderId?: string,
  signal?: AbortSignal
): Promise<CourierTrackingResponse> {
  const endpoint = orderId
    ? `/api/orders/courier-location?orderId=${encodeURIComponent(orderId)}`
    : '/api/my-delivery/location';
  const response = await fetch(endpoint, { cache: 'no-store', signal });
  if ([401, 403, 404].includes(response.status)) {
    return {
      location: null,
      trackingStatus: 'denied',
      checkedAt: new Date().toISOString(),
      message: 'Courier tracking is not available for this session.',
    };
  }
  if (!response.ok) throw new Error('Unable to update courier location.');
  const payload = await response.json();
  if (!payload || typeof payload !== 'object' || !('location' in payload)) {
    throw new Error('Invalid courier location response.');
  }
  const ended = payload.trackingStatus === 'ended';
  const location = ended ? null : normalizeCourierLocation(payload.location);
  return {
    location,
    trackingStatus: ended ? 'ended' : location ? 'active' : 'waiting',
    checkedAt: typeof payload.checkedAt === 'string' ? payload.checkedAt : new Date().toISOString(),
    message: typeof payload.message === 'string' ? payload.message : undefined,
  };
}

export function useCourierTracking(orderId?: string, enabled = true, polling = true) {
  const { data: session, status: sessionStatus } = useSession();
  const viewer = session?.user?.email || '';
  const canFetch = enabled && sessionStatus === 'authenticated' && Boolean(viewer);
  const query = useQuery({
    queryKey: queryKeys.courierTracking(viewer, orderId),
    queryFn: ({ signal }) => fetchCourierTracking(orderId, signal),
    enabled: canFetch,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) =>
      polling && !['ended', 'denied'].includes(query.state.data?.trackingStatus || '')
        ? COURIER_LOCATION_POLL_MS
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: polling,
    refetchOnReconnect: polling,
  });
  const data = canFetch ? query.data : undefined;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!data?.location) return;
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, [data?.location]);

  const refetch = query.refetch;
  const refresh = useCallback(async () => {
    if (canFetch) await refetch({ cancelRefetch: false });
  }, [canFetch, refetch]);
  const freshness = data?.location
    ? getCourierLocationFreshness(
        data.location.lastLocationUpdate,
        data.checkedAt,
        now - query.dataUpdatedAt
      )
    : 'unknown';

  let message = 'Checking courier location...';
  if (sessionStatus === 'unauthenticated') message = 'Sign in to view courier tracking.';
  else if (query.isError || query.isPaused)
    message = data?.location
      ? 'Connection interrupted. Showing last known location.'
      : 'Unable to update courier location.';
  else if (data?.location)
    message =
      freshness === 'fresh'
        ? 'Location updated recently'
        : freshness === 'stale'
          ? 'Location may be outdated'
          : 'Location update time unavailable';
  else if (data) message = data.message || 'Waiting for courier location.';

  return {
    location: data?.location ?? null,
    message,
    freshness,
    isFetching: canFetch && query.isFetching,
    isError: canFetch && (query.isError || query.isPaused),
    canRefresh: canFetch && data?.trackingStatus !== 'ended',
    refresh,
  };
}
