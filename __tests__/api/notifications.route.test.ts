import { getServerSession } from 'next-auth/next';
import { User } from '@/models/user';
import { Notification } from '@/models/notification';
import { emitNotificationEvent } from '@/libs/notificationEvents';
import { createNotificationCursor, readNotificationCursor } from '@/libs/notificationPagination';

vi.mock('@/libs/authOptions', () => ({ authOptions: {} }));
vi.mock('mongoose', () => ({ default: { connect: vi.fn() } }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/models/user', () => ({ User: { findOne: vi.fn() } }));
vi.mock('@/models/notification', () => ({
  Notification: {
    find: vi.fn(),
    aggregate: vi.fn(),
    updateMany: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock('@/libs/notificationEvents', () => ({ emitNotificationEvent: vi.fn() }));

const userId = '507f1f77bcf86cd799439011';
const notificationId = '507f1f77bcf86cd799439012';
const counts = { total: 40, unread: 28, read: 12 };
const item = {
  _id: notificationId,
  createdAt: new Date('2020-01-01T00:00:00Z'),
  title: 'Order update',
  isRead: false,
};
const request = (payload: unknown) =>
  new Request('http://localhost/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
const loadRoute = () => import('@/app/api/notifications/route');

describe('/api/notifications', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'user@example.com' } } as never);
    vi.mocked(User.findOne).mockReturnValue({
      select: () => ({ lean: async () => ({ _id: userId, role: 'user' }) }),
    } as never);
    vi.mocked(Notification.aggregate).mockResolvedValue([
      { total: counts.total, unread: counts.unread },
    ]);
    vi.mocked(Notification.find).mockReturnValue({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [item] }) }) }),
    } as never);
    vi.mocked(Notification.findOneAndUpdate).mockReturnValue({ lean: async () => item } as never);
  });

  it.each(['GET', 'PATCH'] as const)('requires authentication for %s', async (method) => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const route = await loadRoute();
    const response = await route[method](
      method === 'GET'
        ? new Request('http://localhost/api/notifications')
        : request({ action: 'mark-all-read' })
    );
    expect(response.status).toBe(401);
    expect(Notification.find).not.toHaveBeenCalled();
    expect(Notification.updateMany).not.toHaveBeenCalled();
  });

  it('returns global counts even when only one item is loaded', async () => {
    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/notifications?limit=5'));
    const body = await response.json();
    expect(body).toMatchObject({
      counts,
      unreadCount: 28,
      notifications: [expect.objectContaining({ _id: notificationId })],
      hasMore: false,
      nextCursor: null,
    });
    expect(body.readBefore).toEqual(expect.any(String));
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(Notification.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([{ $match: { recipientUserId: userId } }])
    );
  });

  it('applies status/category before pagination and keeps ownership in the query', async () => {
    const { GET } = await loadRoute();
    await GET(new Request('http://localhost/api/notifications?status=unread&category=support'));
    expect(Notification.find).toHaveBeenCalledWith({
      recipientUserId: userId,
      isRead: false,
      type: { $in: ['support_ticket'] },
    });
  });

  it('keeps unreadOnly and skip compatible with older clients', async () => {
    const { GET } = await loadRoute();
    expect(
      (await GET(new Request('http://localhost/api/notifications?unreadOnly=true&skip=5'))).status
    ).toBe(200);
    expect(Notification.find).toHaveBeenCalledWith({ recipientUserId: userId, isRead: false });
  });

  it('fetches one extra row and returns a stable next cursor', async () => {
    const rows = [item, { ...item, _id: '507f1f77bcf86cd799439010' }];
    const limit = vi.fn(() => ({ lean: async () => rows }));
    const sort = vi.fn(() => ({ skip: () => ({ limit }) }));
    vi.mocked(Notification.find).mockReturnValue({ sort } as never);
    const { GET } = await loadRoute();
    const body = await (
      await GET(new Request('http://localhost/api/notifications?limit=1'))
    ).json();
    expect(limit).toHaveBeenCalledWith(2);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(body.notifications).toHaveLength(1);
    expect(readNotificationCursor(body.nextCursor)).toMatchObject({
      id: notificationId,
      recipientId: userId,
      status: 'all',
      category: 'all',
    });
  });

  it('uses date and id together to page equal timestamps', async () => {
    const cursor = createNotificationCursor(userId, item, { status: 'all', category: 'all' });
    const { GET } = await loadRoute();
    expect(
      (await GET(new Request('http://localhost/api/notifications?before=' + cursor))).status
    ).toBe(200);
    expect(Notification.find).toHaveBeenCalledWith({
      recipientUserId: userId,
      $or: [
        { createdAt: { $lt: item.createdAt } },
        { createdAt: item.createdAt, _id: { $lt: item._id } },
      ],
    });
  });

  it.each([
    'limit=NaN',
    'limit=-1',
    'limit=1.5',
    'skip=-2',
    'status=other',
    'category=unknown',
    'before=bad-token',
  ])('rejects invalid query %s', async (query) => {
    const { GET } = await loadRoute();
    expect((await GET(new Request('http://localhost/api/notifications?' + query))).status).toBe(
      400
    );
    expect(Notification.find).not.toHaveBeenCalled();
  });

  it.each([
    createNotificationCursor('507f1f77bcf86cd799439099', item, { status: 'all', category: 'all' }),
    createNotificationCursor(userId, item, { status: 'unread', category: 'all' }),
  ])('rejects another viewer/filter cursor', async (cursor) => {
    const { GET } = await loadRoute();
    expect(
      (await GET(new Request('http://localhost/api/notifications?before=' + cursor))).status
    ).toBe(400);
    expect(Notification.find).not.toHaveBeenCalled();
  });

  it.each(['mark-read', 'mark-unread'])(
    'updates %s only for the signed-in recipient',
    async (action) => {
      const { PATCH } = await loadRoute();
      const response = await PATCH(request({ action, notificationId }));
      expect(response.status).toBe(200);
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: notificationId, recipientUserId: userId },
        {
          $set: {
            isRead: action === 'mark-read',
            readAt: action === 'mark-read' ? expect.any(Date) : null,
          },
        },
        { new: true }
      );
      expect((await response.json()).counts).toEqual(counts);
    }
  );

  it('returns 404 instead of changing another user notification', async () => {
    vi.mocked(Notification.findOneAndUpdate).mockReturnValue({ lean: async () => null } as never);
    const { PATCH } = await loadRoute();
    expect((await PATCH(request({ action: 'mark-read', notificationId }))).status).toBe(404);
    expect(emitNotificationEvent).not.toHaveBeenCalled();
  });

  it('marks all only before the supplied snapshot, regardless of page filters', async () => {
    const { PATCH } = await loadRoute();
    const readBefore = '2020-01-01T00:00:00.000Z';
    expect((await PATCH(request({ action: 'mark-all-read', readBefore }))).status).toBe(200);
    expect(Notification.updateMany).toHaveBeenCalledWith(
      { recipientUserId: userId, isRead: false, createdAt: { $lt: new Date(readBefore) } },
      { $set: { isRead: true, readAt: expect.any(Date) } }
    );
  });

  it('bounds legacy mark-all requests by the server request time', async () => {
    const { PATCH } = await loadRoute();
    const start = Date.now();
    await PATCH(request({ action: 'mark-all-read' }));
    const filter = vi.mocked(Notification.updateMany).mock.calls[0][0] as {
      createdAt: { $lt: Date };
    };
    expect(filter.createdAt.$lt.getTime()).toBeGreaterThanOrEqual(start);
    expect(filter.createdAt.$lt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it.each([
    { action: 'unknown' },
    { action: 'mark-read', notificationId: 'invalid' },
    { action: 'mark-all-read', readBefore: 'tomorrow' },
    { action: 'mark-all-read', readBefore: '2999-01-01T00:00:00.000Z' },
  ])('rejects malformed mutations', async (body) => {
    const { PATCH } = await loadRoute();
    expect((await PATCH(request(body))).status).toBe(400);
    expect(Notification.updateMany).not.toHaveBeenCalled();
    expect(Notification.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('handles invalid JSON without a runtime crash', async () => {
    const { PATCH } = await loadRoute();
    expect(
      (
        await PATCH(
          new Request('http://localhost/api/notifications', { method: 'PATCH', body: '{' })
        )
      ).status
    ).toBe(400);
  });

  it('reports write failures without emitting a successful read event', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(Notification.updateMany).mockRejectedValue(new Error('database unavailable'));
    const { PATCH } = await loadRoute();
    expect((await PATCH(request({ action: 'mark-all-read' }))).status).toBe(500);
    expect(emitNotificationEvent).not.toHaveBeenCalled();
  });
});
