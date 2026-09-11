import { GET } from '@/app/api/users/route';
import { createAuditLog } from '@/libs/auditLog';
import { Order } from '@/models/order';
import { User } from '@/models/user';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';

vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
    Types: {
      ObjectId: {
        isValid: vi.fn(() => true),
      },
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/libs/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/libs/auditLog', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/libs/adminUserDeletion', () => {
  class AdminUserDeletionError extends Error {
    status: number;
    details?: Record<string, unknown>;

    constructor(message: string, status = 400, details?: Record<string, unknown>) {
      super(message);
      this.name = 'AdminUserDeletionError';
      this.status = status;
      this.details = details;
    }
  }

  return {
    AdminUserDeletionError,
    deleteUserAsSuperAdmin: vi.fn(),
  };
});

vi.mock('@/models/order', () => ({
  Order: {
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/user', () => ({
  User: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

const mockUserFindOneLean = (value: unknown) => {
  const lean = vi.fn().mockResolvedValueOnce(value);
  const select = vi.fn(() => ({ lean }));

  vi.mocked(User.findOne).mockReturnValueOnce({ select } as never);

  return { lean, select };
};

const mockUserFindByIdLean = (value: unknown) => {
  const lean = vi.fn().mockResolvedValueOnce(value);
  const populate = vi.fn(() => ({ lean }));
  const select = vi.fn(() => ({ populate }));

  vi.mocked(User.findById).mockReturnValueOnce({ select } as never);

  return { lean, populate, select };
};

const mockLastOrderLean = (value: unknown) => {
  const lean = vi.fn().mockResolvedValueOnce(value);
  const select = vi.fn(() => ({ lean }));
  const sort = vi.fn(() => ({ select }));

  vi.mocked(Order.findOne).mockReturnValueOnce({ sort } as never);

  return { lean, select, sort };
};

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    delete process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  });

  it('requires an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);

    const response = await GET(new Request('http://localhost/api/users'));
    const body = await response.json();

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URL);
    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('blocks admins who are not the configured super admin', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    mockUserFindOneLean({
      _id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });

    const response = await GET(new Request('http://localhost/api/users'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Only super admin can view users' });
  });

  it('returns enriched user details for the configured super admin', async () => {
    const viewedUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      restaurantId: null,
    };

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);
    mockUserFindOneLean({
      _id: 'super-1',
      email: 'super@example.com',
      role: 'admin',
    });
    const userQuery = mockUserFindByIdLean(viewedUser);
    vi.mocked(Order.countDocuments)
      .mockResolvedValueOnce(4 as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce(1 as never)
      .mockResolvedValueOnce(1 as never)
      .mockResolvedValueOnce(1 as never);
    vi.mocked(Order.aggregate).mockResolvedValueOnce([{ totalSpent: 42.5 }] as never);
    mockLastOrderLean({ createdAt: new Date('2026-09-10T10:00:00.000Z') });

    const response = await GET(new Request(`http://localhost/api/users?id=${viewedUser._id}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(userQuery.select).toHaveBeenCalledWith(
      '-password -emailVerificationTokenHash -emailVerificationTokenExpiresAt -passwordResetTokenHash -passwordResetTokenExpiresAt'
    );
    expect(body.user).toMatchObject({
      _id: viewedUser._id,
      email: viewedUser.email,
      activitySummary: {
        totalOrders: 4,
        completedOrders: 2,
        canceledOrders: 1,
        activeOrders: 1,
        unpaidOrders: 1,
        totalSpent: 42.5,
        lastOrderAt: '2026-09-10T10:00:00.000Z',
      },
    });
    expect(createAuditLog).not.toHaveBeenCalled();
  });
});
