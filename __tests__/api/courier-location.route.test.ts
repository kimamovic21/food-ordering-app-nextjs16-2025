import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { User } from '@/models/user';
import { Order } from '@/models/order';
import { GET } from '@/app/api/orders/courier-location/route';

vi.mock('@/libs/authOptions', () => ({ authOptions: {} }));

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

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/order', () => ({
  Order: {
    findById: vi.fn(),
  },
}));

const orderId = '507f1f77bcf86cd799439011';
const now = new Date('2026-10-28T10:00:00.000Z');
const chain = (value: unknown) => ({
  select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(value) }),
});
const request = (id = orderId) =>
  new Request(`http://localhost/api/orders/courier-location?orderId=${id}`);
const customer = { _id: 'user-1', email: 'customer@example.com', role: 'user', restaurantId: null };
const activeOrder = {
  _id: orderId,
  userId: customer._id,
  email: customer.email,
  restaurantId: 'restaurant-1',
  orderStatus: 'transportation',
  courierId: 'courier-1',
  courierAssignmentStatus: 'accepted',
  courierAcceptedAt: new Date(now.getTime() - 60_000),
};
const courier = {
  name: 'Courier',
  email: 'courier@example.com',
  latitude: 10,
  longitude: 20,
  lastLocationUpdate: now,
};
const setActor = (actor: unknown) =>
  vi.mocked(User.findOne).mockReturnValueOnce(chain(actor) as never);
const setOrder = (overrides: Record<string, unknown> = {}) =>
  vi.mocked(Order.findById).mockReturnValue(chain({ ...activeOrder, ...overrides }) as never);

describe('/api/orders/courier-location route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubEnv('SUPER_ADMIN_EMAIL', 'super@example.com');
    vi.mocked(mongoose.Types.ObjectId.isValid).mockImplementation(
      (id) => typeof id === 'string' && /^[a-f0-9]{24}$/.test(id)
    );
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: customer.email } } as never);
    vi.mocked(User.findOne).mockImplementation(
      (filter: any) => chain(filter.email ? customer : courier) as never
    );
    setOrder();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('blocks unauthenticated access', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('requires an email even when a session exists', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    expect((await GET(request())).status).toBe(401);
  });

  it.each(['', 'invalid'])('rejects invalid order ID %j before database access', async (id) => {
    expect((await GET(request(id))).status).toBe(400);
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('handles deleted users and missing orders', async () => {
    setActor(null);
    expect((await GET(request())).status).toBe(404);
    vi.mocked(Order.findById).mockReturnValueOnce(chain(null) as never);
    expect((await GET(request())).status).toBe(404);
  });

  it('returns only the active assigned courier location to the order owner with private headers', async () => {
    const res = await GET(request());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      location: { latitude: 10, longitude: 20 },
      trackingStatus: 'active',
      checkedAt: now.toISOString(),
    });
    expect(User.findOne).toHaveBeenLastCalledWith({
      _id: 'courier-1',
      takenOrder: orderId,
      role: 'courier',
    });
    expect(res.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(res.headers.get('vary')).toBe('Cookie');
  });

  it('supports the legacy email-only order owner', async () => {
    setOrder({ userId: null });
    expect((await GET(request())).status).toBe(200);
  });

  it('does not let matching email override a different stored userId', async () => {
    setOrder({ userId: 'another-user' });
    expect((await GET(request())).status).toBe(403);
    expect(User.findOne).toHaveBeenCalledTimes(1);
  });

  it('blocks unrelated customers before reading courier data', async () => {
    setActor({ ...customer, _id: 'other-user', email: 'other@example.com' });
    expect((await GET(request())).status).toBe(403);
    expect(User.findOne).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['restaurant-1', 200],
    ['restaurant-2', 403],
    [null, 403],
  ])('scopes restaurant admin access for restaurant %s', async (restaurantId, expected) => {
    setActor({ _id: 'admin-1', email: 'admin@example.com', role: 'admin', restaurantId });
    expect((await GET(request())).status).toBe(expected);
  });

  it('allows the configured super admin but not an account without the admin role', async () => {
    setActor({ _id: 'super-1', email: 'super@example.com', role: 'admin' });
    expect((await GET(request())).status).toBe(200);
    setActor({ _id: 'super-1', email: 'super@example.com', role: 'user' });
    expect((await GET(request())).status).toBe(403);
  });

  it.each(['delivered', 'completed', 'canceled'])(
    'does not read live courier data for %s orders',
    async (orderStatus) => {
      setOrder({ orderStatus });
      const res = await GET(request());
      expect(await res.json()).toMatchObject({ location: null, trackingStatus: 'ended' });
      expect(User.findOne).toHaveBeenCalledTimes(1);
    }
  );

  it('ends tracking after handoff even if the status has not caught up', async () => {
    setOrder({ courierDeliveredAt: now });
    expect(await (await GET(request())).json()).toMatchObject({
      location: null,
      trackingStatus: 'ended',
    });
    expect(User.findOne).toHaveBeenCalledTimes(1);
  });

  it.each(['pending', 'declined', 'expired'])(
    'hides locations for %s assignments',
    async (courierAssignmentStatus) => {
      setOrder({ courierAssignmentStatus });
      expect(await (await GET(request())).json()).toMatchObject({
        location: null,
        trackingStatus: 'waiting',
      });
      expect(User.findOne).toHaveBeenCalledTimes(1);
    }
  );

  it('waits before ready status and allows accepted ready assignments', async () => {
    setOrder({ orderStatus: 'processing' });
    expect(await (await GET(request())).json()).toMatchObject({
      location: null,
      trackingStatus: 'waiting',
    });
    setOrder({ orderStatus: 'ready' });
    expect(await (await GET(request())).json()).toMatchObject({ trackingStatus: 'active' });
  });

  it('supports legacy transportation only with a matching current takenOrder', async () => {
    setOrder({ courierId: null, courierAssignmentStatus: null, courierAcceptedAt: null });
    expect(await (await GET(request())).json()).toMatchObject({ trackingStatus: 'active' });
    expect(User.findOne).toHaveBeenLastCalledWith({ takenOrder: orderId, role: 'courier' });
  });

  it('does not fall back to another courier if the current assignment no longer matches', async () => {
    vi.mocked(User.findOne).mockImplementation(
      (filter: any) => chain(filter.email ? customer : null) as never
    );
    expect(await (await GET(request())).json()).toMatchObject({ location: null });
    expect(User.findOne).toHaveBeenCalledTimes(2);
    expect(User.findOne).toHaveBeenLastCalledWith({
      _id: 'courier-1',
      takenOrder: orderId,
      role: 'courier',
    });
  });

  it('withholds old coordinates from before the accepted assignment', async () => {
    vi.mocked(User.findOne).mockImplementation(
      (filter: any) =>
        chain(
          filter.email
            ? customer
            : { ...courier, lastLocationUpdate: new Date(now.getTime() - 120_000) }
        ) as never
    );
    expect(await (await GET(request())).json()).toMatchObject({
      location: null,
      trackingStatus: 'waiting',
    });
  });

  it('handles connection failures without leaking internals', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('private database details'));
    const res = await GET(request());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch courier location' });
    expect(res.headers.get('cache-control')).toContain('no-store');
  });
});
