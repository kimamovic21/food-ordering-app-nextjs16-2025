import { getServerSession } from 'next-auth/next';
import { User } from '@/models/user';
import {
  getOrderMaintenanceRecoverySnapshot,
  runOrderMaintenanceRecovery,
} from '@/libs/orderMaintenanceRecovery';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/libs/mongoConnect', () => ({
  mongoConnect: vi.fn(),
}));

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/libs/orderMaintenanceRecovery', () => ({
  getOrderMaintenanceRecoverySnapshot: vi.fn(),
  runOrderMaintenanceRecovery: vi.fn(),
}));

const createUserFindOneChain = (actor: any) => ({
  select: vi.fn().mockResolvedValue(actor),
});

const request = (method = 'GET') =>
  new Request('http://localhost/api/admin/order-maintenance/recovery', {
    method,
  });

describe('/api/admin/order-maintenance/recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'super@example.com', role: 'admin' },
    } as never);
    vi.mocked(User.findOne).mockReturnValue(
      createUserFindOneChain({
        _id: 'actor-1',
        email: 'super@example.com',
        role: 'admin',
      }) as never
    );
    vi.mocked(getOrderMaintenanceRecoverySnapshot).mockResolvedValue({
      canRecover: false,
      candidates: [],
      checkedAt: '2026-10-13T12:00:00.000Z',
      summary: {
        expiredInventoryReservations: 0,
        readyWithoutCourierOrders: 0,
        staleCourierAssignments: 0,
        staleUnpaidOrders: 0,
        totalIssues: 0,
        uniqueOrders: 0,
      },
    } as never);
    vi.mocked(runOrderMaintenanceRecovery).mockResolvedValue({
      appliedAt: '2026-10-13T12:00:00.000Z',
      before: {},
      checkedAt: '2026-10-13T12:00:00.000Z',
      results: [],
      summary: {
        canceledOrders: 0,
        expiredAssignments: 0,
        expiredInventoryReservations: 0,
        failedOrders: 0,
        readyWithoutCourierOrders: 0,
        releasedReservations: 0,
        skippedOrders: 0,
        staleCourierAssignments: 0,
        staleUnpaidOrders: 0,
        totalIssues: 0,
        uniqueOrders: 0,
      },
    } as never);
  });

  it('returns a dry-run recovery snapshot for the super admin', async () => {
    const { GET } = await import('@/app/api/admin/order-maintenance/recovery/route');

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.summary.uniqueOrders).toBe(0);
    expect(getOrderMaintenanceRecoverySnapshot).toHaveBeenCalledWith({ limit: 50 });
  });

  it('runs recovery for the super admin and passes the audit actor', async () => {
    const { POST } = await import('@/app/api/admin/order-maintenance/recovery/route');

    const response = await POST(request('POST'));

    expect(response.status).toBe(200);
    expect(runOrderMaintenanceRecovery).toHaveBeenCalledWith({
      actor: {
        _id: 'actor-1',
        email: 'super@example.com',
        role: 'admin',
      },
      limit: 50,
    });
  });

  it('blocks non-superadmin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'admin@example.com', role: 'admin' },
    } as never);
    vi.mocked(User.findOne).mockReturnValue(
      createUserFindOneChain({
        _id: 'actor-2',
        email: 'admin@example.com',
        role: 'admin',
      }) as never
    );
    const { GET } = await import('@/app/api/admin/order-maintenance/recovery/route');

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Only super admin can run order maintenance recovery');
    expect(getOrderMaintenanceRecoverySnapshot).not.toHaveBeenCalled();
  });
});
