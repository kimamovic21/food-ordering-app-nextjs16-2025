import mongoose from 'mongoose';
import { Notification } from '@/models/notification';
import { createMongoMemoryTestServer } from '../utils/mongoMemoryServer';

const identity = vi.hoisted(() => ({ userId: '507f1f77bcf86cd799439011' }));
vi.mock('@/libs/authOptions', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({
  getServerSession: async () => ({ user: { email: 'user@example.com' } }),
}));
vi.mock('@/models/user', async () => {
  const { Types } = await import('mongoose');
  return {
    User: {
      findOne: () => ({
        select: () => ({
          lean: async () => ({ _id: new Types.ObjectId(identity.userId), role: 'user' }),
        }),
      }),
    },
  };
});
vi.mock('@/libs/notificationEvents', () => ({ emitNotificationEvent: vi.fn() }));

describe('notification pagination and bulk-read persistence', () => {
  let database: Awaited<ReturnType<typeof createMongoMemoryTestServer>>;
  const createdAt = new Date('2020-01-01T00:00:00Z');
  const seed = (changes: Record<string, unknown> = {}) => ({
    recipientUserId: new mongoose.Types.ObjectId(identity.userId),
    type: 'order_paid',
    title: 'Order paid',
    message: 'Payment confirmed',
    isRead: false,
    createdAt,
    updatedAt: createdAt,
    ...changes,
  });
  beforeAll(async () => {
    database = await createMongoMemoryTestServer();
    vi.stubEnv('MONGODB_URL', database.uri);
    await Notification.init();
  }, 60000);
  beforeEach(async () => {
    await Notification.deleteMany({});
  });
  afterAll(async () => {
    await database?.stop();
    vi.unstubAllEnvs();
  });

  it('pages equal timestamps without duplicates even when a new notification arrives', async () => {
    await Notification.insertMany(Array.from({ length: 31 }, () => seed()));
    const { GET } = await import('@/app/api/notifications/route');
    const first = await (
      await GET(new Request('http://localhost/api/notifications?limit=15'))
    ).json();
    await Notification.create(seed({ createdAt: new Date('2020-01-01T01:00:00Z') }));
    const second = await (
      await GET(
        new Request('http://localhost/api/notifications?limit=15&before=' + first.nextCursor)
      )
    ).json();
    const third = await (
      await GET(
        new Request('http://localhost/api/notifications?limit=15&before=' + second.nextCursor)
      )
    ).json();
    const ids = [...first.notifications, ...second.notifications, ...third.notifications].map(
      (row: { _id: string }) => row._id
    );
    expect(ids).toHaveLength(31);
    expect(new Set(ids).size).toBe(31);
    expect(third.hasMore).toBe(false);
    expect(third.counts).toEqual({ total: 32, unread: 32, read: 0 });
  });

  it('filters before pagination while keeping counts global and recipient-private', async () => {
    await Notification.insertMany([
      seed(),
      seed({ type: 'support_ticket' }),
      seed({ type: 'support_ticket', isRead: true }),
      seed({ recipientUserId: new mongoose.Types.ObjectId() }),
    ]);
    const { GET } = await import('@/app/api/notifications/route');
    const body = await (
      await GET(new Request('http://localhost/api/notifications?status=unread&category=support'))
    ).json();
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].type).toBe('support_ticket');
    expect(body.counts).toEqual({ total: 3, unread: 2, read: 1 });
  });

  it('leaves new arrivals and other users unread during a bulk read', async () => {
    const boundary = '2020-01-01T00:00:01.000Z';
    const rows = await Notification.insertMany([
      seed(),
      seed({ createdAt: new Date(boundary) }),
      seed({ createdAt: new Date('2020-01-01T00:00:02Z') }),
      seed({ recipientUserId: new mongoose.Types.ObjectId() }),
    ]);
    const { PATCH } = await import('@/app/api/notifications/route');
    const body = await (
      await PATCH(
        new Request('http://localhost/api/notifications', {
          method: 'PATCH',
          body: JSON.stringify({ action: 'mark-all-read', readBefore: boundary }),
        })
      )
    ).json();
    expect(body.counts).toEqual({ total: 3, unread: 2, read: 1 });
    const saved = await Notification.find({ _id: { $in: rows.map((row) => row._id) } })
      .sort({ _id: 1 })
      .lean();
    expect(saved.map((row) => row.isRead)).toEqual([true, false, false, false]);
  });
});
