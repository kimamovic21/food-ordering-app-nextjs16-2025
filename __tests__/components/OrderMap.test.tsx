/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import OrderMap from '@/components/shared/OrderMap';
import { useCourierTracking } from '@/hooks/useCourierTracking';

const map = vi.hoisted(() => ({ setView: vi.fn() }));
vi.mock('@/hooks/useCourierTracking', () => ({ useCourierTracking: vi.fn() }));
vi.mock('leaflet', () => ({ default: { icon: vi.fn(() => ({})) } }));
vi.mock('leaflet-defaulticon-compatibility', () => ({}));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid='map'>{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Marker: ({ children, opacity = 1 }: { children: ReactNode; opacity?: number }) => (
    <div data-testid='marker' data-opacity={opacity}>
      {children}
    </div>
  ),
  useMap: () => map,
}));

const state = () => ({
  location: { latitude: 10, longitude: 20, lastLocationUpdate: '2026-10-28T10:00:00.000Z' },
  freshness: 'fresh' as const,
  isError: false,
  isFetching: false,
  canRefresh: true,
  message: 'Location updated recently',
  refresh: vi.fn(async () => {}),
});

describe('OrderMap tracking status', () => {
  beforeEach(() => {
    vi.mocked(useCourierTracking).mockReturnValue(state());
  });
  afterEach(cleanup);

  it('shows the update timestamp, an accessible refresh action, and no misleading live claim', async () => {
    render(<OrderMap orderId='order-1' />);
    expect(screen.getByText(/Last updated/)).toHaveTextContent('28/10/2026');
    expect(screen.queryByText('Live Position')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh courier location' }));
    expect(vi.mocked(useCourierTracking).mock.results[0].value.refresh).toHaveBeenCalledOnce();
  });

  it('keeps the map mounted and avoids recentering unchanged coordinates during refetch/failure', () => {
    const { rerender } = render(<OrderMap orderId='order-1' />);
    const originalMap = screen.getByTestId('map');
    const viewCalls = map.setView.mock.calls.length;
    vi.mocked(useCourierTracking).mockReturnValue({ ...state(), isFetching: true });
    rerender(<OrderMap orderId='order-1' />);
    expect(screen.getByRole('button', { name: 'Refresh courier location' })).toBeDisabled();
    vi.mocked(useCourierTracking).mockReturnValue({
      ...state(),
      isError: true,
      message: 'Connection interrupted. Showing last known location.',
    });
    rerender(<OrderMap orderId='order-1' />);
    expect(screen.getByTestId('map')).toBe(originalMap);
    expect(map.setView).toHaveBeenCalledTimes(viewCalls);
    expect(screen.getByTestId('marker')).toHaveAttribute('data-opacity', '0.6');
  });

  it('removes the courier marker and shows a terminal message', () => {
    const { rerender } = render(<OrderMap orderId='order-1' />);
    vi.mocked(useCourierTracking).mockReturnValue({
      ...state(),
      location: null,
      canRefresh: false,
      message: 'Courier tracking has ended for this order.',
    });
    rerender(<OrderMap orderId='order-1' />);
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('tracking has ended');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('preserves the static restaurant map without tracking controls', async () => {
    vi.mocked(useCourierTracking).mockReturnValue({
      ...state(),
      location: null,
      canRefresh: false,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [{ lat: '43.8', lon: '18.4' }] })
    );
    try {
      render(
        <OrderMap
          shouldFetchCourier={false}
          address='Test street'
          city='Test city'
          postalCode='71000'
          country='Test country'
        />
      );
      await waitFor(() => expect(screen.getByText('Restaurant Location')).toBeInTheDocument());
      expect(useCourierTracking).toHaveBeenCalledWith(undefined, false, true);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
