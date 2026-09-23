import {
  buildRestaurantDiscoverySearchParams,
  fetchRestaurantDiscovery,
} from '@/hooks/useRestaurantDiscoveryQuery';

const mockFetchResponse = (payload: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  }) as unknown as Response;

describe('useRestaurantDiscoveryQuery fetcher', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds stable restaurant discovery params for active filters', () => {
    const params = buildRestaurantDiscoverySearchParams({
      city: 'Sarajevo',
      country: 'Bosnia & Herzegovina',
      delivery: 'to-me',
      latitude: 43.8563,
      longitude: 18.4131,
      maxMinimumOrder: '15',
      minRating: '4',
      page: 2,
      pageSize: 9,
      q: 'pizza',
      sort: 'nearest',
      status: 'accepting',
    });

    expect(params.get('city')).toBe('Sarajevo');
    expect(params.get('country')).toBe('Bosnia & Herzegovina');
    expect(params.get('delivery')).toBe('to-me');
    expect(params.get('latitude')).toBe('43.8563');
    expect(params.get('longitude')).toBe('18.4131');
    expect(params.get('limit')).toBe('9');
    expect(params.get('maxMinimumOrder')).toBe('15');
    expect(params.get('minRating')).toBe('4');
    expect(params.get('page')).toBe('2');
    expect(params.get('q')).toBe('pizza');
    expect(params.get('sort')).toBe('nearest');
    expect(params.get('status')).toBe('accepting');
  });

  it('omits default filters and normalizes restaurant discovery responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        restaurants: [{ _id: 'restaurant-1', name: 'Pizza Hub' }],
        filterOptions: { cities: ['Sarajevo'], countries: ['Bosnia & Herzegovina'] },
        pagination: {
          hasNextPage: 1,
          hasPreviousPage: 0,
          page: '1',
          pageSize: '9',
          total: '1',
          totalPages: '1',
        },
      })
    );

    const result = await fetchRestaurantDiscovery({
      page: 1,
      pageSize: 9,
      sort: 'smart',
      status: 'all',
    });

    const [calledUrl, fetchOptions] = vi.mocked(fetch).mock.calls[0];
    const searchParams = new URLSearchParams(String(calledUrl).split('?')[1]);

    expect(searchParams.get('limit')).toBe('9');
    expect(searchParams.get('page')).toBe('1');
    expect(searchParams.has('sort')).toBe(false);
    expect(searchParams.has('status')).toBe(false);
    expect(fetchOptions).toEqual({ cache: 'no-store' });
    expect(result).toEqual({
      restaurants: [{ _id: 'restaurant-1', name: 'Pizza Hub' }],
      filterOptions: { cities: ['Sarajevo'], countries: ['Bosnia & Herzegovina'] },
      pagination: {
        hasNextPage: true,
        hasPreviousPage: false,
        page: 1,
        pageSize: 9,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('throws status-aware errors for failed restaurant discovery responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 'Failed to fetch restaurants' }, { ok: false, status: 500 })
    );

    await expect(fetchRestaurantDiscovery({ page: 1, pageSize: 9 })).rejects.toMatchObject({
      message: 'Failed to fetch restaurants',
      status: 500,
    });
  });
});
