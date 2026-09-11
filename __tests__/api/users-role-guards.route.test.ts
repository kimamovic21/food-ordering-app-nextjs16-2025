vi.mock('mongoose', () => ({
  default: { connect: vi.fn(), Types: { ObjectId: { isValid: vi.fn(() => true) } } },
}));

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  isSuperAdmin: vi.fn(),
  isAdmin: vi.fn(),
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

vi.mock('@/models/user', () => ({
  User: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

const loadMakeAdmin = async () => (await import('@/app/api/users/make-admin/route')).PATCH;
const loadRemoveAdmin = async () => (await import('@/app/api/users/remove-admin/route')).PATCH;
const loadMakeCourier = async () => (await import('@/app/api/users/make-courier/route')).PATCH;

describe('User role mutation route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/test';
  });

  it('blocks make-admin when not super admin', async () => {
    const auth = await import('@/app/api/auth/[...nextauth]/route');
    vi.mocked(auth.isSuperAdmin).mockResolvedValueOnce(false as never);

    const PATCH = await loadMakeAdmin();
    const req = new Request('http://localhost/api/users/make-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '507f1f77bcf86cd799439011' }),
    });

    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Only super admin can make someone an admin' });
  });

  it('returns 400 for invalid user id on make-courier', async () => {
    const auth = await import('@/app/api/auth/[...nextauth]/route');
    vi.mocked(auth.isAdmin).mockResolvedValueOnce(true as never);

    const PATCH = await loadMakeCourier();
    // send invalid id
    const mongooseMod = await import('mongoose');
    vi.mocked(mongooseMod.default.Types.ObjectId.isValid).mockReturnValueOnce(false as never);

    const req = new Request('http://localhost/api/users/make-courier', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'bad-id' }),
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid user ID' });
  });

  it('returns 404 when target user not found for remove-admin', async () => {
    const auth = await import('@/app/api/auth/[...nextauth]/route');
    vi.mocked(auth.isSuperAdmin).mockResolvedValueOnce(true as never);

    vi.mocked((await import('@/models/user')).User.findById).mockResolvedValueOnce(null as never);

    const PATCH = await loadRemoveAdmin();
    const req = new Request('http://localhost/api/users/remove-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '507f1f77bcf86cd799439012' }),
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'User not found' });
  });

  it('promotes to courier when admin requests make-courier', async () => {
    const auth = await import('@/app/api/auth/[...nextauth]/route');
    const { createAuditLog } = await import('@/libs/auditLog');
    const { getServerSession } = await import('next-auth/next');
    const { User } = await import('@/models/user');

    vi.mocked(auth.isAdmin).mockResolvedValueOnce(true as never);
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);

    const userDoc: any = {
      _id: '507f1f77bcf86cd799439013',
      email: 'target@example.com',
      name: 'Target User',
      role: 'user',
      availability: false,
      takenOrder: null,
      save: vi.fn(async function save() {
        return this;
      }),
    };

    vi.mocked(User.findById).mockResolvedValueOnce(userDoc as never);
    vi.mocked(User.findOne).mockReturnValueOnce({
      select: vi.fn(() => ({
        lean: vi.fn().mockResolvedValueOnce({
          _id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
        }),
      })),
    } as never);

    const PATCH = await loadMakeCourier();
    const req = new Request('http://localhost/api/users/make-courier', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userDoc._id }),
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.role).toBe('courier');
    expect(userDoc.save).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.role_promoted_to_courier',
        entityType: 'user',
        entityId: userDoc._id,
        metadata: expect.objectContaining({
          previousRole: 'user',
          nextRole: 'courier',
        }),
      })
    );
  });
});
