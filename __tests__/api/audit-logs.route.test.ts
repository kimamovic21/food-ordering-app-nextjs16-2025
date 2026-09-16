import { GET } from '@/app/api/audit-logs/route';
import { AuditLog } from '@/models/auditLog';
import { User } from '@/models/user';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';

vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/libs/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/models/restaurant', () => ({
  Restaurant: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/auditLog', () => ({
  AuditLog: {
    countDocuments: vi.fn(),
    distinct: vi.fn(),
    find: vi.fn(),
  },
}));

const mockUserFindOneLean = (value: unknown) => {
  const lean = vi.fn().mockResolvedValueOnce(value);
  vi.mocked(User.findOne).mockReturnValueOnce({ lean } as never);
};

const mockAuditFindLean = (logs: unknown[]) => {
  const lean = vi.fn().mockResolvedValueOnce(logs);
  const limit = vi.fn(() => ({ lean }));
  const skip = vi.fn(() => ({ limit }));
  const sort = vi.fn(() => ({ skip }));

  vi.mocked(AuditLog.find).mockReturnValueOnce({ sort } as never);

  return { lean, limit, skip, sort };
};

describe('GET /api/audit-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    delete process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  });

  it('requires an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);

    const response = await GET(new Request('http://localhost/api/audit-logs'));
    const body = await response.json();

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URL);
    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('applies super admin filters and returns filter options', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);
    mockUserFindOneLean({
      _id: 'admin-1',
      email: 'super@example.com',
      role: 'admin',
    });
    mockAuditFindLean([
      {
        _id: 'log-1',
        action: 'user.deleted_by_super_admin',
        actorEmail: 'super@example.com',
        actorRole: 'admin',
        entityType: 'user',
        entityId: 'user-1',
        metadata: { targetEmail: 'target@example.com' },
        createdAt: new Date('2026-09-14T10:00:00.000Z'),
      },
    ]);
    vi.mocked(AuditLog.countDocuments).mockResolvedValueOnce(1 as never);
    vi.mocked(AuditLog.distinct)
      .mockResolvedValueOnce(['user.deleted_by_super_admin'] as never)
      .mockResolvedValueOnce(['user'] as never)
      .mockResolvedValueOnce(['active_order_limit_reached'] as never);
    vi.mocked(AuditLog.countDocuments).mockResolvedValueOnce(3 as never);

    const response = await GET(
      new Request(
        'http://localhost/api/audit-logs?page=2&limit=10&q=delete&action=user.deleted_by_super_admin&actorEmail=super&entityType=user'
      )
    );
    const body = await response.json();
    const query = vi.mocked(AuditLog.find).mock.calls[0]?.[0] as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(query.action).toBe('user.deleted_by_super_admin');
    expect(query.entityType).toBe('user');
    expect(query.actorEmail).toBeInstanceOf(RegExp);
    expect(query.$or).toEqual(expect.any(Array));
    expect(body.logs).toHaveLength(1);
    expect(body.totalLogs).toBe(1);
    expect(body.filters).toEqual({
      availableActions: ['user.deleted_by_super_admin'],
      availableCheckoutBlockReasons: ['active_order_limit_reached'],
      availableEntityTypes: ['user'],
    });
    expect(body.summary).toEqual({ checkoutBlocksToday: 3 });
  });

  it('filters checkout blocked audit logs by metadata reason', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);
    mockUserFindOneLean({
      _id: 'admin-1',
      email: 'super@example.com',
      role: 'admin',
    });
    mockAuditFindLean([]);
    vi.mocked(AuditLog.countDocuments)
      .mockResolvedValueOnce(0 as never)
      .mockResolvedValueOnce(2 as never);
    vi.mocked(AuditLog.distinct)
      .mockResolvedValueOnce(['checkout.blocked'] as never)
      .mockResolvedValueOnce(['checkout'] as never)
      .mockResolvedValueOnce(['restaurant_item_limit_exceeded'] as never);

    const response = await GET(
      new Request(
        'http://localhost/api/audit-logs?checkoutBlockReason=restaurant_item_limit_exceeded'
      )
    );
    const query = vi.mocked(AuditLog.find).mock.calls[0]?.[0] as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(query).toEqual(
      expect.objectContaining({
        action: 'checkout.blocked',
        'metadata.reason': 'restaurant_item_limit_exceeded',
      })
    );
  });
});
