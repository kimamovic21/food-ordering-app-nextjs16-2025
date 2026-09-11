import { DELETE } from '@/app/api/users/route';
import { deleteUserAsSuperAdmin } from '@/libs/adminUserDeletion';
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

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  isAdmin: vi.fn(),
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

vi.mock('@/models/user', () => ({
  User: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('DELETE /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    delete process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  });

  it('requires an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);

    const response = await DELETE(new Request('http://localhost/api/users?id=user-1'));
    const body = await response.json();

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URL);
    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(deleteUserAsSuperAdmin).not.toHaveBeenCalled();
  });

  it('blocks non-super-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    } as never);

    const response = await DELETE(new Request('http://localhost/api/users?id=user-1'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Only super admin can delete users' });
    expect(deleteUserAsSuperAdmin).not.toHaveBeenCalled();
  });

  it('delegates guarded deletion for the configured super admin', async () => {
    const actor = {
      _id: 'super-1',
      email: 'super@example.com',
      role: 'admin',
    };
    const summary = {
      targetUserId: 'user-1',
      cloudinaryFailures: [],
    };

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce(actor as never);
    vi.mocked(deleteUserAsSuperAdmin).mockResolvedValueOnce(summary as never);

    const response = await DELETE(new Request('http://localhost/api/users?id=user-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deleteUserAsSuperAdmin).toHaveBeenCalledWith({
      targetUserId: 'user-1',
      actor,
      superAdminEmail: 'super@example.com',
    });
    expect(body).toEqual({
      message: 'User deleted successfully',
      summary,
    });
  });
});
