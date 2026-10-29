/** @vitest-environment jsdom */

import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { ReactNode } from 'react';
import { useCourierTracking } from '@/hooks/useCourierTracking';
import { queryKeys } from '@/libs/queryKeys';

vi.mock('next-auth/react', () => ({ useSession: vi.fn() }));

const now = new Date('2026-10-28T10:00:00.000Z');
const payload = {
  location: { latitude: 10, longitude: 20, lastLocationUpdate: now.toISOString() },
  trackingStatus: 'active',
  checkedAt: now.toISOString(),
};
const response = (body: unknown = payload, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const session = (email = 'customer@example.com') =>
  vi.mocked(useSession).mockReturnValue({
    data: { user: { email } },
    status: 'authenticated',
    update: vi.fn(),
  } as never);
const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(20);
  });

describe('useCourierTracking', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    session();
    focusManager.setFocused(true);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    focusManager.setFocused(undefined);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses cancellable private requests and scopes cache to viewer/order', async () => {
    const { result } = renderHook(() => useCourierTracking('order-1'), { wrapper });
    await flush();
    expect(fetch).toHaveBeenCalledWith('/api/orders/courier-location?orderId=order-1', {
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    });
    expect(
      client.getQueryData(queryKeys.courierTracking('customer@example.com', 'order-1'))
    ).toMatchObject(payload);
    expect(result.current.message).toBe('Location updated recently');
  });

  it('keeps the last known marker on network failure, then recovers on refresh', async () => {
    const { result } = renderHook(() => useCourierTracking('order-1'), { wrapper });
    await flush();
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Network unavailable'));
    await act(async () => {
      await result.current.refresh();
    });
    await flush();
    expect(result.current.location).toEqual(payload.location);
    expect(result.current.isError).toBe(true);
    expect(result.current.message).toContain('last known location');
    await act(async () => {
      await result.current.refresh();
    });
    await flush();
    expect(result.current.isError).toBe(false);
    expect(result.current.message).toBe('Location updated recently');
  });

  it.each([401, 403, 404])(
    'clears the old marker and stops interval requests after HTTP %s',
    async (status) => {
      const { result } = renderHook(() => useCourierTracking('order-1'), { wrapper });
      await flush();
      vi.mocked(fetch).mockResolvedValueOnce(response({}, status));
      await act(async () => {
        await result.current.refresh();
      });
      await flush();
      expect(result.current.location).toBeNull();
      expect(result.current.message).toContain('not available');
      const calls = vi.mocked(fetch).mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(180_000);
      });
      expect(fetch).toHaveBeenCalledTimes(calls);
    }
  );

  it('ends tracking and removes even a malformed terminal response containing coordinates', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response({ ...payload, trackingStatus: 'ended', message: 'Tracking ended.' })
    );
    const { result } = renderHook(() => useCourierTracking('order-1'), { wrapper });
    await flush();
    expect(result.current.location).toBeNull();
    expect(result.current.canRefresh).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('ages coordinates even when polling is disabled', async () => {
    const { result } = renderHook(() => useCourierTracking(undefined, true, false), { wrapper });
    await flush();
    expect(fetch).toHaveBeenCalledWith('/api/my-delivery/location', expect.anything());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(130_000);
    });
    expect(result.current.freshness).toBe('stale');
    expect(result.current.message).toBe('Location may be outdated');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('aborts obsolete requests and cannot paint an old order response onto a new order', async () => {
    let resolveOld!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    );
    const { result, rerender } = renderHook(({ id }) => useCourierTracking(id), {
      initialProps: { id: 'old' },
      wrapper,
    });
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    rerender({ id: 'new' });
    await flush();
    expect(signal?.aborted).toBe(true);
    expect(result.current.location?.latitude).toBe(10);
    await act(async () => {
      resolveOld(response({ ...payload, location: { ...payload.location, latitude: 80 } }));
    });
    await flush();
    expect(result.current.location?.latitude).toBe(10);
  });

  it('hides cached coordinates immediately on logout and does not reuse them for another viewer', async () => {
    const { result, rerender } = renderHook(() => useCourierTracking('order-1'), { wrapper });
    await flush();
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });
    rerender();
    expect(result.current.location).toBeNull();
    session('other@example.com');
    vi.mocked(fetch).mockResolvedValue(response({}, 403));
    rerender();
    expect(result.current.location).toBeNull();
    await flush();
    expect(result.current.location).toBeNull();
  });

  it('does not fetch for static maps and keeps imperative refresh disabled', async () => {
    const { result } = renderHook(() => useCourierTracking(undefined, false), { wrapper });
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('deduplicates simultaneous courier self-location requests', async () => {
    renderHook(() => useCourierTracking(), { wrapper });
    renderHook(() => useCourierTracking(), { wrapper });
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('waits for a new reading when the assigned courier has no usable location', async () => {
    const { result } = renderHook(() => useCourierTracking('order-1'), { wrapper });
    await flush();
    vi.mocked(fetch).mockResolvedValue(
      response({
        location: null,
        trackingStatus: 'waiting',
        checkedAt: now.toISOString(),
        message: 'Waiting for a location update for this delivery.',
      })
    );
    await act(async () => {
      await result.current.refresh();
    });
    await flush();
    expect(result.current.location).toBeNull();
    expect(result.current.message).toContain('Waiting for a location update');
  });
});
