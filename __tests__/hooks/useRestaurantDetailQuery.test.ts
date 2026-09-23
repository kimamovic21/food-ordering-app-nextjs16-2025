import { fetchRestaurantDetail } from '@/hooks/useRestaurantDetailQuery';

const mockFetchResponse = (payload: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  }) as unknown as Response;

describe('useRestaurantDetailQuery fetcher', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes public restaurant detail responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        restaurant: {
          _id: 'restaurant-1',
          name: 'Pizza Hub',
          isAcceptingOrders: true,
        },
      })
    );

    await expect(fetchRestaurantDetail('restaurant-1')).resolves.toEqual({
      restaurant: {
        _id: 'restaurant-1',
        name: 'Pizza Hub',
        isAcceptingOrders: true,
      },
    });
    expect(fetch).toHaveBeenCalledWith('/api/restaurants/restaurant-1', { cache: 'no-store' });
  });

  it('throws status-aware errors for failed restaurant detail responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 'Restaurant not found' }, { ok: false, status: 404 })
    );

    await expect(fetchRestaurantDetail('missing-restaurant')).rejects.toMatchObject({
      message: 'Restaurant not found',
      status: 404,
    });
  });
});
