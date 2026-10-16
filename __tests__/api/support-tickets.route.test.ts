import { getServerSession } from 'next-auth/next';
import { createAuditLog } from '@/libs/auditLog';
import {
  notifySupportTicketCreated,
  notifySupportTicketReporterAboutStatus,
} from '@/libs/notifications';
import { Order } from '@/models/order';
import { SupportTicket } from '@/models/supportTicket';
import { User } from '@/models/user';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/libs/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/libs/auditLog', () => ({
  createAuditLog: vi.fn(),
}));

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

vi.mock('@/models/supportTicket', () => ({
  SupportTicket: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('@/libs/notifications', () => ({
  notifySupportTicketCreated: vi.fn(),
  notifySupportTicketReporterAboutStatus: vi.fn(),
}));

const loadRoute = async () => import('@/app/api/support-tickets/route');

const createObjectId = (value: string) => ({
  toString: () => value,
});

const createTicketQuery = (result: unknown) => {
  const query = {
    limit: vi.fn(() => query),
    populate: vi.fn(() => query),
    sort: vi.fn(() => query),
    lean: vi.fn().mockResolvedValue(result),
  };

  return query;
};

const createPrivateTicket = (overrides: Record<string, unknown> = {}) => ({
  _id: 'ticket-1',
  reporterId: 'user-1',
  restaurantId: { _id: 'restaurant-1', name: 'Test Restaurant' },
  orderId: { _id: 'order-1', orderStatus: 'completed', total: 25 },
  target: 'restaurant_support',
  subject: 'Missing item',
  description: 'One item was missing from the delivery.',
  status: 'in_review',
  responseNote: 'We are checking your report.',
  internalNote: 'Private kitchen and compensation discussion.',
  resolvedBy: { _id: 'admin-1', name: 'Manager', email: 'manager@example.com' },
  futurePrivateField: 'This database-only field must not reach the response.',
  ...overrides,
});

const createRequest = (url: string, body?: Record<string, unknown>) =>
  new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

describe('/api/support-tickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.SUPER_ADMIN_EMAIL;
    delete process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'customer@example.com' },
    } as never);

    vi.mocked(User.findOne).mockResolvedValue({
      _id: createObjectId('user-1'),
      name: 'Customer',
      email: 'customer@example.com',
      role: 'user',
      restaurantId: null,
    } as never);
  });

  it('returns only tickets reported by the signed-in customer', async () => {
    const tickets = [{ _id: 'ticket-1', subject: 'Missing item' }];
    const query = createTicketQuery(tickets);
    vi.mocked(SupportTicket.find).mockReturnValue(query as never);

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ tickets });
    expect(SupportTicket.find).toHaveBeenCalledWith({
      reporterId: expect.objectContaining({ toString: expect.any(Function) }),
    });
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it.each(['user', 'courier'])(
    'omits internal notes and resolver identity from %s list and detail responses',
    async (role) => {
      vi.mocked(User.findOne).mockResolvedValue({
        _id: createObjectId('user-1'),
        email: 'customer@example.com',
        role,
      } as never);
      // Session claims and query flags must not grant admin access.
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'customer@example.com', role: 'admin' },
      } as never);
      const ticket = createPrivateTicket();
      vi.mocked(SupportTicket.find).mockReturnValue(createTicketQuery([ticket]) as never);

      const { GET } = await loadRoute();

      for (const query of [
        '',
        '?ticketId=ticket-1&includeInternalNotes=true&role=admin&scope=all',
      ]) {
        const response = await GET(new Request(`http://localhost/api/support-tickets${query}`));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        expect(body.tickets[0]).toEqual(
          expect.objectContaining({
            _id: ticket._id,
            responseNote: ticket.responseNote,
            orderId: ticket.orderId,
            restaurantId: ticket.restaurantId,
          })
        );
        expect(body.tickets[0]).not.toHaveProperty('internalNote');
        expect(body.tickets[0]).not.toHaveProperty('resolvedBy');
        expect(body.tickets[0]).not.toHaveProperty('futurePrivateField');
      }

      expect(SupportTicket.find).toHaveBeenLastCalledWith({
        _id: 'ticket-1',
        reporterId: expect.objectContaining({ toString: expect.any(Function) }),
      });
      expect(ticket.internalNote).toBe('Private kitchen and compensation discussion.');
    }
  );

  it('preserves private notes for an authorized restaurant admin', async () => {
    const restaurantId = createObjectId('restaurant-1');
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      email: 'admin@example.com',
      role: 'admin',
      restaurantId,
    } as never);
    const ticket = createPrivateTicket();
    vi.mocked(SupportTicket.find).mockReturnValue(createTicketQuery([ticket]) as never);

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets'));
    const body = await response.json();

    expect(body.tickets[0].internalNote).toBe(ticket.internalNote);
    expect(body.tickets[0].resolvedBy).toEqual(ticket.resolvedBy);
    expect(body.tickets[0]).not.toHaveProperty('futurePrivateField');
    expect(SupportTicket.find).toHaveBeenCalledWith({
      restaurantId,
      target: 'restaurant_support',
    });
  });

  it.each([
    { label: 'customer', role: 'user', email: 'customer@example.com', restaurantId: null },
    { label: 'courier', role: 'courier', email: 'courier@example.com', restaurantId: null },
    {
      label: 'restaurant admin',
      role: 'admin',
      email: 'admin@example.com',
      restaurantId: 'restaurant-1',
    },
    {
      label: 'admin without a restaurant',
      role: 'admin',
      email: 'admin@example.com',
      restaurantId: null,
    },
    { label: 'super admin', role: 'admin', email: 'super@example.com', restaurantId: null },
  ])(
    'returns only reporter-safe personal tickets for a $label using scope=mine',
    async ({ role, email, restaurantId }) => {
      process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
      const userId = createObjectId('reporter-1');
      vi.mocked(User.findOne).mockResolvedValue({
        _id: userId,
        email,
        role,
        restaurantId: restaurantId ? createObjectId(restaurantId) : null,
      } as never);
      const ticket = createPrivateTicket({ reporterId: 'reporter-1' });
      vi.mocked(SupportTicket.find).mockReturnValue(createTicketQuery([ticket]) as never);

      const { GET } = await loadRoute();
      const response = await GET(
        new Request(
          'http://localhost/api/support-tickets?scope=mine&ticketId=ticket-1&status=in_review&reporterId=another-user&includeInternalNotes=true'
        )
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(SupportTicket.find).toHaveBeenCalledWith({
        reporterId: userId,
        _id: 'ticket-1',
        status: 'in_review',
      });
      expect(body.tickets[0].responseNote).toBe(ticket.responseNote);
      expect(body.tickets[0]).not.toHaveProperty('internalNote');
      expect(body.tickets[0]).not.toHaveProperty('resolvedBy');
      expect(body.tickets[0]).not.toHaveProperty('futurePrivateField');
    }
  );

  it('still rejects management reads by an admin without a restaurant', async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      email: 'admin@example.com',
      role: 'admin',
      restaurantId: null,
    } as never);

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets'));

    expect(response.status).toBe(403);
    expect(SupportTicket.find).not.toHaveBeenCalled();
  });

  it('lets the super admin read private notes on app-support tickets', async () => {
    process.env.SUPER_ADMIN_EMAIL = 'super@example.com';
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('super-1'),
      email: 'super@example.com',
      role: 'admin',
      restaurantId: null,
    } as never);
    const ticket = createPrivateTicket({ target: 'app_support', restaurantId: null });
    vi.mocked(SupportTicket.find).mockReturnValue(createTicketQuery([ticket]) as never);

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tickets[0].internalNote).toBe(ticket.internalNote);
    expect(body.tickets[0].resolvedBy).toEqual(ticket.resolvedBy);
    expect(SupportTicket.find).toHaveBeenCalledWith({});
  });

  it('does not expose private notes to a non-admin with the configured superadmin email', async () => {
    process.env.SUPER_ADMIN_EMAIL = 'customer@example.com';
    vi.mocked(SupportTicket.find).mockReturnValue(
      createTicketQuery([createPrivateTicket()]) as never
    );

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets'));
    const body = await response.json();

    expect(body.tickets[0]).not.toHaveProperty('internalNote');
    expect(body.tickets[0]).not.toHaveProperty('resolvedBy');
  });

  it('blocks unauthenticated ticket reads before querying tickets', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets'));

    expect(response.status).toBe(401);
    expect(SupportTicket.find).not.toHaveBeenCalled();
  });

  it('normalizes legacy closed tickets as resolved', async () => {
    const query = createTicketQuery([
      {
        _id: 'ticket-1',
        subject: 'Handled',
        status: 'closed',
        internalNote: 'Private legacy handling details.',
        restaurantId: null,
        orderId: null,
        resolvedBy: null,
      },
    ]);
    vi.mocked(SupportTicket.find).mockReturnValue(query as never);

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tickets).toEqual([
      {
        _id: 'ticket-1',
        subject: 'Handled',
        status: 'resolved',
        restaurantId: null,
        orderId: null,
      },
    ]);
  });

  it('scopes restaurant admins to restaurant support tickets for their restaurant', async () => {
    const restaurantId = createObjectId('restaurant-1');
    const query = createTicketQuery([]);

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      email: 'admin@example.com',
      role: 'admin',
      restaurantId,
    } as never);
    vi.mocked(SupportTicket.find).mockReturnValue(query as never);

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/support-tickets?status=open'));

    expect(response.status).toBe(200);
    expect(SupportTicket.find).toHaveBeenCalledWith({
      status: 'open',
      restaurantId,
      target: 'restaurant_support',
    });
  });

  it('creates a restaurant support ticket for the order owner and sends a notification', async () => {
    const userId = createObjectId('user-1');
    const orderId = createObjectId('order-1');
    const restaurantId = createObjectId('restaurant-1');
    const ticket = { _id: createObjectId('ticket-1') };
    const populatedTicket = createPrivateTicket({ subject: 'Wrong pizza size' });
    const query = createTicketQuery(populatedTicket);

    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: userId,
      name: 'Customer',
      email: 'customer@example.com',
      role: 'user',
      restaurantId: null,
    } as never);
    vi.mocked(Order.findById).mockResolvedValueOnce({
      _id: orderId,
      userId,
      restaurantId,
    } as never);
    vi.mocked(SupportTicket.create).mockResolvedValueOnce(ticket as never);
    vi.mocked(SupportTicket.findById).mockReturnValueOnce(query as never);

    const { POST } = await loadRoute();
    const response = await POST(
      createRequest('http://localhost/api/support-tickets', {
        orderId: 'order-1',
        target: 'restaurant_support',
        category: 'wrong_item',
        priority: 'high',
        subject: 'Wrong pizza size',
        description: 'I ordered large pizza but received a small one.',
        internalNote: 'Reporter tried to set an admin-only note.',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ticket).toEqual(
      expect.objectContaining({
        _id: populatedTicket._id,
        subject: populatedTicket.subject,
        responseNote: populatedTicket.responseNote,
      })
    );
    expect(body.ticket).not.toHaveProperty('internalNote');
    expect(body.ticket).not.toHaveProperty('resolvedBy');
    expect(body.ticket).not.toHaveProperty('futurePrivateField');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(SupportTicket.create).toHaveBeenCalledWith({
      reporterId: userId,
      reporterRole: 'user',
      reporterName: 'Customer',
      reporterEmail: 'customer@example.com',
      contactEmail: 'customer@example.com',
      contactPhone: '',
      orderId,
      restaurantId,
      target: 'restaurant_support',
      category: 'wrong_item',
      priority: 'high',
      subject: 'Wrong pizza size',
      description: 'I ordered large pizza but received a small one.',
    });
    expect(notifySupportTicketCreated).toHaveBeenCalledWith({
      ticketId: ticket._id,
      orderId,
      restaurantId,
      reporterEmail: 'customer@example.com',
      target: 'restaurant_support',
      subject: 'Wrong pizza size',
    });
  });

  it('lets an admin report their own customer order from another restaurant', async () => {
    const adminId = createObjectId('admin-1');
    const adminRestaurantId = createObjectId('admin-restaurant');
    const orderRestaurantId = createObjectId('order-restaurant');
    const orderId = createObjectId('order-1');
    const ticket = { _id: createObjectId('ticket-1') };
    const populatedTicket = createPrivateTicket({
      subject: 'One extra pizza',
      restaurantId: { _id: orderRestaurantId.toString(), name: 'Another Restaurant' },
    });
    const query = createTicketQuery(populatedTicket);

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: adminId,
      name: 'Admin Customer',
      email: 'admin@example.com',
      role: 'admin',
      restaurantId: adminRestaurantId,
    } as never);
    vi.mocked(Order.findById).mockResolvedValueOnce({
      _id: orderId,
      userId: adminId,
      restaurantId: orderRestaurantId,
    } as never);
    vi.mocked(SupportTicket.create).mockResolvedValueOnce(ticket as never);
    vi.mocked(SupportTicket.findById).mockReturnValueOnce(query as never);

    const { POST } = await loadRoute();
    const response = await POST(
      createRequest('http://localhost/api/support-tickets', {
        orderId: 'order-1',
        target: 'restaurant_support',
        category: 'order_issue',
        subject: 'One extra pizza',
        description: 'I accidentally ordered one extra pizza.',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ticket.subject).toBe(populatedTicket.subject);
    expect(body.ticket).not.toHaveProperty('internalNote');
    expect(body.ticket).not.toHaveProperty('resolvedBy');
    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterId: adminId,
        reporterRole: 'admin',
        contactEmail: 'admin@example.com',
        contactPhone: '',
        orderId,
        restaurantId: orderRestaurantId,
      })
    );
  });

  it('omits private fields when an admin creates app support linked to their own restaurant', async () => {
    const restaurantId = createObjectId('restaurant-1');
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      name: 'Restaurant Owner',
      email: 'admin@example.com',
      role: 'admin',
      restaurantId,
    } as never);
    const ticket = createPrivateTicket({ target: 'app_support' });
    vi.mocked(SupportTicket.create).mockResolvedValueOnce({ _id: 'ticket-1' } as never);
    vi.mocked(SupportTicket.findById).mockReturnValueOnce(createTicketQuery(ticket) as never);

    const { POST } = await loadRoute();
    const response = await POST(
      createRequest('http://localhost/api/support-tickets', {
        target: 'app_support',
        category: 'app_issue',
        subject: 'Restaurant settings problem',
        description: 'I need help with my restaurant settings in the app.',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ticket.restaurantId._id).toBe('restaurant-1');
    expect(body.ticket.responseNote).toBe(ticket.responseNote);
    expect(body.ticket).not.toHaveProperty('internalNote');
    expect(body.ticket).not.toHaveProperty('resolvedBy');
    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId,
        target: 'app_support',
      })
    );
  });

  it('rejects reports for orders that do not belong to the signed-in user', async () => {
    vi.mocked(Order.findById).mockResolvedValueOnce({
      _id: createObjectId('order-1'),
      userId: createObjectId('other-user'),
      restaurantId: createObjectId('restaurant-1'),
    } as never);

    const { POST } = await loadRoute();
    const response = await POST(
      createRequest('http://localhost/api/support-tickets', {
        orderId: 'order-1',
        subject: 'Missing fries',
        description: 'The order belongs to another customer.',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'You cannot report this order' });
    expect(SupportTicket.create).not.toHaveBeenCalled();
    expect(notifySupportTicketCreated).not.toHaveBeenCalled();
  });

  it('lets a restaurant admin resolve a ticket for their own restaurant', async () => {
    const adminId = createObjectId('admin-1');
    const restaurantId = createObjectId('restaurant-1');
    const save = vi.fn().mockResolvedValue(undefined);
    const ticket = {
      _id: createObjectId('ticket-1'),
      reporterId: createObjectId('user-1'),
      orderId: createObjectId('order-1'),
      target: 'restaurant_support',
      restaurantId,
      subject: 'Missing item',
      status: 'open',
      responseNote: '',
      internalNote: '',
      resolvedBy: null,
      resolvedAt: null,
      save,
    };
    const updatedTicket = {
      _id: 'ticket-1',
      status: 'resolved',
      target: 'restaurant_support',
      restaurantId: { _id: restaurantId.toString(), name: 'Test Restaurant' },
      internalNote: 'Kitchen confirmed the missing item and manager approved compensation.',
      resolvedBy: { _id: 'admin-1', name: 'Manager', email: 'admin@example.com' },
    };
    const query = createTicketQuery(updatedTicket);

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: adminId,
      email: 'admin@example.com',
      role: 'admin',
      restaurantId,
    } as never);
    vi.mocked(SupportTicket.findById)
      .mockResolvedValueOnce(ticket as never)
      .mockReturnValueOnce(query as never);

    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request('http://localhost/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: 'ticket-1',
          status: 'resolved',
          responseNote: 'We refunded the missing item manually.',
          internalNote: 'Kitchen confirmed the missing item and manager approved compensation.',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ticket: updatedTicket });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(ticket.status).toBe('resolved');
    expect(ticket.responseNote).toBe('We refunded the missing item manually.');
    expect(ticket.internalNote).toBe(
      'Kitchen confirmed the missing item and manager approved compensation.'
    );
    expect(ticket.resolvedBy).toBe(adminId);
    expect(ticket.resolvedAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith({
      actor: expect.objectContaining({
        _id: adminId,
        email: 'admin@example.com',
        role: 'admin',
      }),
      action: 'support_ticket.updated',
      entityType: 'SupportTicket',
      entityId: ticket._id,
      restaurantId,
      orderId: ticket.orderId,
      metadata: {
        previousStatus: 'open',
        nextStatus: 'resolved',
        target: 'restaurant_support',
        category: undefined,
        priority: undefined,
        responseNoteChanged: true,
        internalNoteChanged: true,
      },
    });
    expect(notifySupportTicketReporterAboutStatus).toHaveBeenCalledWith({
      reporterId: ticket.reporterId,
      ticketId: ticket._id,
      orderId: ticket.orderId,
      status: 'resolved',
      subject: 'Missing item',
      responseNote: 'We refunded the missing item manually.',
    });
  });

  it.each(['user', 'courier'])(
    'blocks %s attempts to edit private support fields',
    async (role) => {
      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: createObjectId('user-1'),
        email: 'customer@example.com',
        role,
      } as never);

      const { PATCH } = await loadRoute();
      const response = await PATCH(
        new Request('http://localhost/api/support-tickets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: 'ticket-1',
            status: 'resolved',
            internalNote: 'An unauthorized edit.',
          }),
        })
      );

      expect(response.status).toBe(403);
      expect(SupportTicket.findById).not.toHaveBeenCalled();
      expect(createAuditLog).not.toHaveBeenCalled();
      expect(notifySupportTicketReporterAboutStatus).not.toHaveBeenCalled();
    }
  );

  it('blocks restaurant admins from updating tickets for another restaurant', async () => {
    const save = vi.fn();
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      email: 'admin@example.com',
      role: 'admin',
      restaurantId: createObjectId('restaurant-1'),
    } as never);
    vi.mocked(SupportTicket.findById).mockResolvedValueOnce({
      ...createPrivateTicket({ restaurantId: createObjectId('another-restaurant') }),
      save,
    } as never);

    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request('http://localhost/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: 'ticket-1', status: 'in_review' }),
      })
    );

    expect(response.status).toBe(403);
    expect(save).not.toHaveBeenCalled();
    expect(createAuditLog).not.toHaveBeenCalled();
  });

  it('blocks restaurant admins from updating app support tickets', async () => {
    const restaurantId = createObjectId('restaurant-1');
    const save = vi.fn();

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      email: 'admin@example.com',
      role: 'admin',
      restaurantId,
    } as never);
    vi.mocked(SupportTicket.findById).mockResolvedValueOnce({
      _id: createObjectId('ticket-1'),
      target: 'app_support',
      restaurantId,
      save,
    } as never);

    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request('http://localhost/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: 'ticket-1',
          status: 'resolved',
          responseNote: 'Handled by app support.',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'You cannot update this ticket' });
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects a ticket with a required reporter-facing response note', async () => {
    const adminId = createObjectId('admin-1');
    const restaurantId = createObjectId('restaurant-1');
    const save = vi.fn().mockResolvedValue(undefined);
    const ticket = {
      _id: createObjectId('ticket-1'),
      reporterId: createObjectId('user-1'),
      orderId: createObjectId('order-1'),
      target: 'restaurant_support',
      restaurantId,
      category: 'order_issue',
      priority: 'normal',
      subject: 'Already handled',
      status: 'in_review',
      responseNote: '',
      internalNote: '',
      resolvedBy: null,
      resolvedAt: null,
      save,
    };
    const updatedTicket = { _id: 'ticket-1', status: 'rejected' };
    const query = createTicketQuery(updatedTicket);

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: adminId,
      email: 'admin@example.com',
      role: 'admin',
      restaurantId,
    } as never);
    vi.mocked(SupportTicket.findById)
      .mockResolvedValueOnce(ticket as never)
      .mockReturnValueOnce(query as never);

    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request('http://localhost/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: 'ticket-1',
          status: 'rejected',
          responseNote: 'We reviewed this report and no further action is needed.',
          internalNote: 'Order record and delivery timeline were already consistent.',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ticket: updatedTicket });
    expect(ticket.status).toBe('rejected');
    expect(ticket.resolvedBy).toBe(adminId);
    expect(ticket.resolvedAt).toBeInstanceOf(Date);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'support_ticket.updated',
        entityType: 'SupportTicket',
        metadata: expect.objectContaining({
          previousStatus: 'in_review',
          nextStatus: 'rejected',
          responseNoteChanged: true,
          internalNoteChanged: true,
        }),
      })
    );
    expect(notifySupportTicketReporterAboutStatus).toHaveBeenCalledWith({
      reporterId: ticket.reporterId,
      ticketId: ticket._id,
      orderId: ticket.orderId,
      status: 'rejected',
      subject: 'Already handled',
      responseNote: 'We reviewed this report and no further action is needed.',
    });
  });

  it('requires a public response note when rejecting a ticket', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      email: 'admin@example.com',
      role: 'admin',
      restaurantId: createObjectId('restaurant-1'),
    } as never);

    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request('http://localhost/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: 'ticket-1',
          status: 'rejected',
          responseNote: 'No',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'Rejected tickets need a short public response note for the reporter.',
    });
    expect(SupportTicket.findById).not.toHaveBeenCalled();
  });

  it('rejects closed as a support ticket status', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com' },
    } as never);
    vi.mocked(User.findOne).mockResolvedValueOnce({
      _id: createObjectId('admin-1'),
      email: 'admin@example.com',
      role: 'admin',
      restaurantId: createObjectId('restaurant-1'),
    } as never);

    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request('http://localhost/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: 'ticket-1',
          status: 'closed',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid ticket status' });
    expect(SupportTicket.findById).not.toHaveBeenCalled();
  });
});
