import {
  fetchAdminOrdersPage,
  fetchOrderQueue,
  getOrderListErrorStatus,
  OrderListQueryError,
} from '@/hooks/useOrderListQueries';

const mockFetchResponse = (payload: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  }) as unknown as Response;

describe('useOrderListQueries fetchers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes admin order list responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        orders: [{ _id: 'order-1', email: 'customer@example.com' }],
        page: '2',
        totalOrders: '9',
        totalPages: '3',
      })
    );

    await expect(fetchAdminOrdersPage(2)).resolves.toEqual({
      orders: [{ _id: 'order-1', email: 'customer@example.com' }],
      page: 2,
      totalOrders: 9,
      totalPages: 3,
    });
    expect(fetch).toHaveBeenCalledWith('/api/orders?page=2', { cache: 'no-store' });
  });

  it('throws status-aware errors for failed order list responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 'Admin is not assigned to a restaurant' }, { ok: false, status: 403 })
    );

    await expect(fetchAdminOrdersPage(1)).rejects.toMatchObject({
      message: 'Admin is not assigned to a restaurant',
      status: 403,
    });
  });

  it('normalizes order queue responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        lateThresholdMinutes: '90',
        orders: [{ _id: 'queue-order-1', orderStatus: 'ready' }],
      })
    );

    await expect(fetchOrderQueue()).resolves.toEqual({
      lateThresholdMinutes: 90,
      orders: [{ _id: 'queue-order-1', orderStatus: 'ready' }],
    });
  });

  it('extracts status from order list query errors', () => {
    expect(getOrderListErrorStatus(new OrderListQueryError('Forbidden', 403))).toBe(403);
    expect(getOrderListErrorStatus(new Error('Other error'))).toBeNull();
  });
});
