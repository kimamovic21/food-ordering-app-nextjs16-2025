import {
  buildRestaurantMenuResultsSearchParams,
  fetchRestaurantMenuCategories,
  fetchRestaurantMenuResults,
  fetchRestaurantMenuSummary,
} from '@/hooks/useRestaurantMenuQueries';

const mockFetchResponse = (payload: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  }) as unknown as Response;

describe('useRestaurantMenuQueries fetchers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds stable restaurant menu result params', () => {
    const params = buildRestaurantMenuResultsSearchParams({
      categories: ['pizza', 'drinks'],
      maxPrice: '20',
      minPrice: '5',
      page: 1,
      pageSize: 20,
      q: 'cheese',
      sort: 'price_asc',
    });

    expect(params.get('categories')).toBe('pizza,drinks');
    expect(params.get('limit')).toBe('20');
    expect(params.get('maxPrice')).toBe('20');
    expect(params.get('minPrice')).toBe('5');
    expect(params.get('page')).toBe('1');
    expect(params.get('q')).toBe('cheese');
    expect(params.get('sort')).toBe('price_asc');
  });

  it('normalizes restaurant menu category responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        categories: [
          { _id: 'category-1', name: 'Pizza', items: [{ _id: 'item-1' }], total: '4' },
          { _id: 'category-2', name: 'Drinks', items: [], total: 2 },
        ],
      })
    );

    await expect(fetchRestaurantMenuCategories('restaurant-1')).resolves.toEqual([
      { _id: 'category-1', name: 'Pizza' },
      { _id: 'category-2', name: 'Drinks' },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/restaurants/restaurant-1/menu?groupBy=category&perCategory=1',
      { cache: 'no-store' }
    );
  });

  it('normalizes restaurant menu summaries', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        categories: [{ _id: 'category-1', name: 'Pizza', items: [{ _id: 'item-1' }], total: '4' }],
        perCategory: '3',
      })
    );

    await expect(fetchRestaurantMenuSummary('restaurant-1', 3)).resolves.toEqual({
      categories: [{ _id: 'category-1', name: 'Pizza', items: [{ _id: 'item-1' }], total: 4 }],
      perCategory: 3,
    });
  });

  it('normalizes restaurant menu result responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        items: [{ _id: 'item-1', name: 'Pizza' }],
        page: '1',
        pageSize: '20',
        total: '12',
      })
    );

    await expect(
      fetchRestaurantMenuResults('restaurant-1', {
        page: 1,
        pageSize: 20,
        q: 'pizza',
        sort: 'newest',
      })
    ).resolves.toEqual({
      items: [{ _id: 'item-1', name: 'Pizza' }],
      page: 1,
      pageSize: 20,
      total: 12,
    });
  });

  it('throws status-aware errors for failed menu responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 'Failed to load menu' }, { ok: false, status: 500 })
    );

    await expect(fetchRestaurantMenuSummary('restaurant-1', 3)).rejects.toMatchObject({
      message: 'Failed to load menu',
      status: 500,
    });
  });
});
