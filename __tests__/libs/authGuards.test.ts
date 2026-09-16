import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { User } from '@/models/user';
import { isAdmin, isSuperAdmin } from '@/libs/authGuards';

vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

describe('auth guard helpers', () => {
  const previousSuperAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const previousPublicSuperAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    vi.mocked(User.findOne).mockReset();
    process.env.SUPER_ADMIN_EMAIL = previousSuperAdminEmail;
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = previousPublicSuperAdminEmail;
  });

  afterAll(() => {
    process.env.SUPER_ADMIN_EMAIL = previousSuperAdminEmail;
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = previousPublicSuperAdminEmail;
  });

  it('denies admin access when there is no signed-in email', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);

    await expect(isAdmin()).resolves.toBe(false);

    expect(mongoose.connect).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('allows admin access only for users with admin role in MongoDB', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'owner@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      email: 'owner@example.com',
      role: 'admin',
    } as never);

    await expect(isAdmin()).resolves.toBe(true);

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URL);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'owner@example.com' });
  });

  it('denies super admin access when the signed-in email does not match configured env', async () => {
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = '';
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);

    await expect(isSuperAdmin()).resolves.toBe(false);
  });

  it('allows super admin access through SUPER_ADMIN_EMAIL', async () => {
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = '';
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'super@example.com' },
    } as never);

    await expect(isSuperAdmin()).resolves.toBe(true);
  });
});
