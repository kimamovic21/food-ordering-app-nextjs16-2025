import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { Notification } from '@/models/notification';
import { Order } from '@/models/order';
import { Restaurant } from '@/models/restaurant';
import { SupportTicket } from '@/models/supportTicket';
import { User } from '@/models/user';

let activeSession: any = null;
let originalSuperAdminEmail: string | undefined;
let originalPublicSuperAdminEmail: string | undefined;

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => activeSession),
}));

const uniqueEmail = (label: string) =>
  `e2e-support-ticket-${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;

const setSession = (user: { email: string; role: string }) => {
  activeSession = { user: { email: user.email, role: user.role } };
};

const postTicket = async (body: Record<string, unknown>) => {
  const { POST } = await import('@/app/api/support-tickets/route');

  return POST(
    new Request('http://localhost/api/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
};

const patchTicket = async (body: Record<string, unknown>) => {
  const { PATCH } = await import('@/app/api/support-tickets/route');

  return PATCH(
    new Request('http://localhost/api/support-tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
};

const getTickets = async (query = '') => {
  const { GET } = await import('@/app/api/support-tickets/route');

  return GET(new Request(`http://localhost/api/support-tickets${query}`));
};

const createSupportFixture = async () => {
  const owner = await User.create({
    name: 'Support Ticket Owner',
    email: uniqueEmail('owner'),
    password: 'x',
    provider: 'credentials',
    role: 'admin',
  });

  const superAdmin = await User.create({
    name: 'Support Ticket Super Admin',
    email: uniqueEmail('super-admin'),
    password: 'x',
    provider: 'credentials',
    role: 'admin',
  });

  process.env.SUPER_ADMIN_EMAIL = superAdmin.email;
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = superAdmin.email;

  const strangerAdmin = await User.create({
    name: 'Support Ticket Stranger Admin',
    email: uniqueEmail('stranger-admin'),
    password: 'x',
    provider: 'credentials',
    role: 'admin',
  });

  const customer = await User.create({
    name: 'Support Ticket Customer',
    email: uniqueEmail('customer'),
    password: 'x',
    provider: 'credentials',
    role: 'user',
  });

  const restaurant = await Restaurant.create({
    ownerId: owner._id,
    name: `E2E Support Ticket Restaurant ${Date.now()}`,
    street: '1 Test Street',
    city: 'Sarajevo',
    postalCode: '71000',
    country: 'BiH',
    latitude: 43.8563,
    longitude: 18.4131,
    contact: '+38761111222',
    email: `support-ticket-${Date.now()}@example.com`,
    description: 'Restaurant used for support ticket e2e tests.',
    tax: 10,
    courierFee: 5,
  });

  owner.restaurantId = restaurant._id;
  await owner.save();

  const order = await Order.create({
    userId: customer._id,
    email: customer.email,
    phone: '+38761111111',
    streetAddress: 'Customer Street 1',
    postalCode: '71000',
    city: 'Sarajevo',
    country: 'BiH',
    cartProducts: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Support Ticket Pizza',
        size: 'single',
        quantity: 1,
        price: 20,
        restaurantId: restaurant._id,
      },
    ],
    restaurantId: restaurant._id,
    taxPercentage: 10,
    taxAmount: 2,
    deliveryFee: 5,
    total: 27,
    orderPaid: true,
    paid: true,
    orderStatus: 'completed',
  });

  return { customer, order, owner, restaurant, strangerAdmin, superAdmin };
};

describe('E2E: support tickets', () => {
  beforeAll(async () => {
    originalSuperAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    originalPublicSuperAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    await mongoose.connect(process.env.MONGODB_URL as string);
  });

  beforeEach(async () => {
    activeSession = null;
    await Notification.deleteMany({});
    await SupportTicket.deleteMany({ subject: /^E2E Support Ticket/i });
    await Order.deleteMany({ email: /e2e-support-ticket-/i });
    await Restaurant.deleteMany({ name: /^E2E Support Ticket/i });
    await User.deleteMany({ email: /e2e-support-ticket-/i });
  });

  afterAll(async () => {
    await Notification.deleteMany({});
    await SupportTicket.deleteMany({ subject: /^E2E Support Ticket/i });
    await Order.deleteMany({ email: /e2e-support-ticket-/i });
    await Restaurant.deleteMany({ name: /^E2E Support Ticket/i });
    await User.deleteMany({ email: /e2e-support-ticket-/i });

    if (originalSuperAdminEmail === undefined) {
      delete process.env.SUPER_ADMIN_EMAIL;
    } else {
      process.env.SUPER_ADMIN_EMAIL = originalSuperAdminEmail;
    }

    if (originalPublicSuperAdminEmail === undefined) {
      delete process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    } else {
      process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = originalPublicSuperAdminEmail;
    }

    await mongoose.disconnect();
  });

  it('routes restaurant support tickets to the owner and super admin, then notifies the reporter on status changes', async () => {
    const { customer, order, owner, strangerAdmin, superAdmin } = await createSupportFixture();

    setSession(customer);
    const createResponse = await postTicket({
      orderId: order._id.toString(),
      target: 'restaurant_support',
      category: 'missing_item',
      priority: 'high',
      subject: 'E2E Support Ticket missing item',
      description: 'The order arrived without one item from the receipt.',
      contactEmail: 'customer-support@example.com',
      contactPhone: '+38761123456',
    });
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody.ticket.status).toBe('open');
    expect(createBody.ticket.target).toBe('restaurant_support');
    expect(createBody.ticket.contactPhone).toBe('+38761123456');
    expect(createBody.ticket).not.toHaveProperty('internalNote');
    expect(createBody.ticket).not.toHaveProperty('resolvedBy');
    expect(createResponse.headers.get('Cache-Control')).toBe('private, no-store');

    const ownerNotification = await Notification.findOne({
      recipientUserId: owner._id,
      orderId: order._id,
      type: 'support_ticket',
      title: 'New restaurant problem report',
    }).lean();
    const superAdminNotification = await Notification.findOne({
      recipientUserId: superAdmin._id,
      orderId: order._id,
      type: 'support_ticket',
      title: 'New restaurant problem report',
    }).lean();

    expect(ownerNotification?.metadata?.ticketId).toBe(createBody.ticket._id.toString());
    expect(superAdminNotification?.metadata?.ticketId).toBe(createBody.ticket._id.toString());

    setSession(strangerAdmin);
    const blockedResponse = await patchTicket({
      ticketId: createBody.ticket._id.toString(),
      status: 'in_review',
    });
    expect(blockedResponse.status).toBe(403);

    setSession(owner);
    const reviewResponse = await patchTicket({
      ticketId: createBody.ticket._id.toString(),
      status: 'in_review',
      responseNote: 'We are checking the kitchen receipt.',
      internalNote: 'Private receipt investigation for the restaurant team.',
    });
    const reviewBody = await reviewResponse.json();

    expect(reviewResponse.status).toBe(200);
    expect(reviewBody.ticket.status).toBe('in_review');
    expect(reviewBody.ticket.responseNote).toBe('We are checking the kitchen receipt.');
    expect(reviewBody.ticket.internalNote).toBe(
      'Private receipt investigation for the restaurant team.'
    );

    const ownerTicketsResponse = await getTickets(`?ticketId=${createBody.ticket._id}`);
    const ownerTicketsBody = await ownerTicketsResponse.json();
    expect(ownerTicketsBody.tickets[0].internalNote).toBe(reviewBody.ticket.internalNote);

    setSession(superAdmin);
    const superAdminTicketsResponse = await getTickets(`?ticketId=${createBody.ticket._id}`);
    const superAdminTicketsBody = await superAdminTicketsResponse.json();
    expect(superAdminTicketsBody.tickets[0].internalNote).toBe(reviewBody.ticket.internalNote);

    const reporterNotification = await Notification.findOne({
      recipientUserId: customer._id,
      orderId: order._id,
      title: 'Problem report in review',
    }).lean();
    expect(reporterNotification?.metadata?.responseNote).toBe(reviewBody.ticket.responseNote);
    expect(JSON.stringify(reporterNotification)).not.toContain(reviewBody.ticket.internalNote);

    setSession(customer);
    const customerTicketsResponse = await getTickets();
    const customerTicketsBody = await customerTicketsResponse.json();
    expect(customerTicketsResponse.status).toBe(200);
    expect(customerTicketsBody.tickets).toHaveLength(1);
    expect(customerTicketsBody.tickets[0]._id.toString()).toBe(createBody.ticket._id.toString());
    expect(customerTicketsBody.tickets[0].responseNote).toBe(reviewBody.ticket.responseNote);
    expect(customerTicketsBody.tickets[0]).not.toHaveProperty('internalNote');
    expect(customerTicketsBody.tickets[0]).not.toHaveProperty('resolvedBy');
    expect(JSON.stringify(customerTicketsBody)).not.toContain(reviewBody.ticket.internalNote);
    await expect(SupportTicket.findById(createBody.ticket._id).lean()).resolves.toEqual(
      expect.objectContaining({ internalNote: reviewBody.ticket.internalNote })
    );

    setSession(owner);
    const resolvedResponse = await patchTicket({
      ticketId: createBody.ticket._id.toString(),
      status: 'resolved',
      responseNote: 'Replacement item confirmed with the customer.',
      internalNote: 'Private compensation approval from the manager.',
    });
    const resolvedBody = await resolvedResponse.json();

    expect(resolvedResponse.status).toBe(200);
    expect(resolvedBody.ticket.status).toBe('resolved');
    expect(resolvedBody.ticket.resolvedAt).toBeTruthy();
    expect(resolvedBody.ticket.resolvedBy.email).toBe(owner.email);

    setSession(customer);
    const detailResponse = await getTickets(
      `?ticketId=${createBody.ticket._id}&includeInternalNotes=true&role=admin`
    );
    const detailBody = await detailResponse.json();
    expect(detailBody.tickets[0].responseNote).toBe(resolvedBody.ticket.responseNote);
    expect(detailBody.tickets[0].resolvedAt).toBeTruthy();
    expect(detailBody.tickets[0]).not.toHaveProperty('internalNote');
    expect(detailBody.tickets[0]).not.toHaveProperty('resolvedBy');
  });

  it('routes app support tickets to super admins without exposing them to restaurant owners', async () => {
    const { customer, owner, superAdmin } = await createSupportFixture();

    setSession(customer);
    const createResponse = await postTicket({
      target: 'app_support',
      category: 'app_issue',
      priority: 'normal',
      subject: 'E2E Support Ticket app issue',
      description: 'The customer needs help with an app-level issue.',
      contactEmail: 'customer-support@example.com',
    });
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody.ticket.target).toBe('app_support');
    expect(createBody.ticket.restaurantId).toBeNull();

    await expect(
      Notification.findOne({
        recipientUserId: superAdmin._id,
        type: 'support_ticket',
        title: 'New app support report',
      })
    ).resolves.toBeTruthy();

    setSession(owner);
    const ownerTicketsResponse = await getTickets();
    const ownerTicketsBody = await ownerTicketsResponse.json();
    expect(ownerTicketsResponse.status).toBe(200);
    expect(ownerTicketsBody.tickets).toHaveLength(0);

    setSession(superAdmin);
    const superAdminTicketsResponse = await getTickets();
    const superAdminTicketsBody = await superAdminTicketsResponse.json();
    expect(superAdminTicketsResponse.status).toBe(200);
    expect(
      superAdminTicketsBody.tickets.some(
        (ticket: any) => ticket._id.toString() === createBody.ticket._id.toString()
      )
    ).toBe(true);
  });

  it("separates an admin buyer's own reports from tickets they manage at their restaurant", async () => {
    const { customer, order, owner, strangerAdmin } = await createSupportFixture();
    const buyerRestaurant = await Restaurant.create({
      ownerId: strangerAdmin._id,
      name: `E2E Support Ticket Buyer Restaurant ${Date.now()}`,
      street: '2 Test Street',
      city: 'Sarajevo',
      postalCode: '71000',
      country: 'BiH',
      latitude: 43.86,
      longitude: 18.42,
      contact: '+38761111223',
      email: uniqueEmail('buyer-restaurant'),
      description: 'The buyer also owns a different restaurant.',
      tax: 10,
      courierFee: 5,
    });
    strangerAdmin.restaurantId = buyerRestaurant._id;
    await strangerAdmin.save();
    order.userId = strangerAdmin._id;
    order.email = strangerAdmin.email;
    await order.save();

    const managementTicket = await SupportTicket.create({
      reporterId: customer._id,
      reporterRole: 'user',
      reporterEmail: customer.email,
      restaurantId: buyerRestaurant._id,
      target: 'restaurant_support',
      subject: 'E2E Support Ticket managed by the buyer',
      description: "A different customer reported the buyer's restaurant.",
      internalNote: 'Private note for the restaurant owner.',
    });

    setSession(strangerAdmin);
    const createResponse = await postTicket({
      orderId: order._id.toString(),
      target: 'restaurant_support',
      subject: 'E2E Support Ticket admin buying elsewhere',
      description: 'My personal order from another restaurant was missing an item.',
    });
    const createBody = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createBody.ticket).not.toHaveProperty('internalNote');

    setSession(owner);
    const reviewResponse = await patchTicket({
      ticketId: createBody.ticket._id,
      status: 'in_review',
      responseNote: 'We are checking your personal order.',
      internalNote: 'Private details from the other restaurant kitchen.',
    });
    expect(reviewResponse.status).toBe(200);

    setSession(strangerAdmin);
    for (const query of [
      '?scope=mine',
      `?scope=mine&status=in_review&ticketId=${createBody.ticket._id}`,
    ]) {
      const response = await getTickets(query);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.tickets).toHaveLength(1);
      expect(body.tickets[0]._id).toBe(createBody.ticket._id);
      expect(body.tickets[0].responseNote).toBe('We are checking your personal order.');
      expect(body.tickets[0]).not.toHaveProperty('internalNote');
      expect(body.tickets[0]).not.toHaveProperty('resolvedBy');
    }

    const ownRestaurantResponse = await getTickets();
    const ownRestaurantBody = await ownRestaurantResponse.json();
    expect(ownRestaurantBody.tickets).toHaveLength(1);
    expect(ownRestaurantBody.tickets[0]._id).toBe(managementTicket._id.toString());
    expect(ownRestaurantBody.tickets[0].internalNote).toBe(managementTicket.internalNote);

    const otherReporterResponse = await getTickets(
      `?scope=mine&ticketId=${managementTicket._id}&reporterId=${customer._id}`
    );
    expect((await otherReporterResponse.json()).tickets).toEqual([]);
    const blockedUpdate = await patchTicket({
      ticketId: createBody.ticket._id,
      status: 'resolved',
    });
    expect(blockedUpdate.status).toBe(403);

    // Losing a restaurant assignment must not remove access to personally submitted reports.
    strangerAdmin.restaurantId = null;
    await strangerAdmin.save();
    const unassignedResponse = await getTickets(`?scope=mine&ticketId=${createBody.ticket._id}`);
    expect(unassignedResponse.status).toBe(200);
    expect((await unassignedResponse.json()).tickets[0]._id).toBe(createBody.ticket._id);
    expect((await getTickets()).status).toBe(403);
  });

  it('lets an admin follow their app-support report without exposing platform notes', async () => {
    const { owner, restaurant, superAdmin } = await createSupportFixture();
    setSession(owner);
    const createResponse = await postTicket({
      target: 'app_support',
      category: 'app_issue',
      subject: 'E2E Support Ticket restaurant admin app issue',
      description: 'I need platform support for my restaurant settings.',
    });
    const createBody = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createBody.ticket.restaurantId._id).toBe(restaurant._id.toString());
    expect(createBody.ticket).not.toHaveProperty('internalNote');
    expect(createBody.ticket).not.toHaveProperty('resolvedBy');

    setSession(superAdmin);
    const resolvedResponse = await patchTicket({
      ticketId: createBody.ticket._id,
      status: 'resolved',
      responseNote: 'Your restaurant settings are working again.',
      internalNote: 'Private platform diagnostics.',
    });
    expect(resolvedResponse.status).toBe(200);
    expect((await resolvedResponse.json()).ticket.internalNote).toBe(
      'Private platform diagnostics.'
    );
    const personalResponse = await getTickets(`?scope=mine&ticketId=${createBody.ticket._id}`);
    expect((await personalResponse.json()).tickets).toEqual([]);

    setSession(owner);
    const response = await getTickets(`?scope=mine&ticketId=${createBody.ticket._id}`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.tickets).toHaveLength(1);
    expect(body.tickets[0].responseNote).toBe('Your restaurant settings are working again.');
    expect(body.tickets[0]).not.toHaveProperty('internalNote');
    expect(body.tickets[0]).not.toHaveProperty('resolvedBy');
    expect((await (await getTickets()).json()).tickets).toEqual([]);
    expect(
      (await patchTicket({ ticketId: createBody.ticket._id, status: 'in_review' })).status
    ).toBe(403);
  });

  it('keeps historical reports readable and private after linked documents are deleted', async () => {
    const { customer, order, owner, restaurant, superAdmin } = await createSupportFixture();
    setSession(customer);
    const createResponse = await postTicket({
      orderId: order._id.toString(),
      target: 'restaurant_support',
      subject: 'E2E Support Ticket historical report',
      description: 'This report must remain readable after related records are removed.',
    });
    const createBody = await createResponse.json();
    expect(createResponse.status).toBe(201);

    setSession(owner);
    const resolvedResponse = await patchTicket({
      ticketId: createBody.ticket._id,
      status: 'resolved',
      responseNote: 'The historical issue was resolved.',
      internalNote: 'Private historical investigation.',
    });
    expect(resolvedResponse.status).toBe(200);

    // Simulate dangling references in the test database, not the account-deletion workflow.
    await Order.deleteOne({ _id: order._id });
    await Restaurant.deleteOne({ _id: restaurant._id });
    await User.deleteOne({ _id: owner._id });

    setSession(customer);
    const reporterResponse = await getTickets(`?scope=mine&ticketId=${createBody.ticket._id}`);
    const reporterBody = await reporterResponse.json();
    expect(reporterResponse.status).toBe(200);
    expect(reporterBody.tickets[0]).toEqual(
      expect.objectContaining({
        _id: createBody.ticket._id,
        orderId: null,
        restaurantId: null,
        responseNote: 'The historical issue was resolved.',
      })
    );
    expect(reporterBody.tickets[0]).not.toHaveProperty('internalNote');
    expect(reporterBody.tickets[0]).not.toHaveProperty('resolvedBy');

    await User.deleteOne({ _id: customer._id });
    setSession(superAdmin);
    const adminResponse = await getTickets(`?ticketId=${createBody.ticket._id}`);
    const adminBody = await adminResponse.json();
    expect(adminResponse.status).toBe(200);
    expect(adminBody.tickets[0]).toEqual(
      expect.objectContaining({
        reporterId: null,
        orderId: null,
        restaurantId: null,
        resolvedBy: null,
        internalNote: 'Private historical investigation.',
      })
    );
    expect((await SupportTicket.findById(createBody.ticket._id).lean())?.internalNote).toBe(
      'Private historical investigation.'
    );
  });

  it('keeps courier app-support notes private and prevents cross-reporter ticket reads', async () => {
    const { customer, superAdmin } = await createSupportFixture();
    const courier = await User.create({
      name: 'Support Ticket Courier',
      email: uniqueEmail('courier'),
      password: 'x',
      provider: 'credentials',
      role: 'courier',
    });

    setSession(courier);
    const createResponse = await postTicket({
      target: 'app_support',
      category: 'app_issue',
      subject: 'E2E Support Ticket courier app issue',
      description: 'The courier needs help with the app during a delivery.',
      internalNote: 'A reporter must not be able to write this field.',
    });
    const createBody = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createBody.ticket).not.toHaveProperty('internalNote');
    await expect(SupportTicket.findById(createBody.ticket._id).lean()).resolves.toEqual(
      expect.objectContaining({ internalNote: '' })
    );

    setSession(superAdmin);
    const resolveResponse = await patchTicket({
      ticketId: createBody.ticket._id,
      status: 'resolved',
      responseNote: 'The app issue has been fixed.',
      internalNote: 'Private app-support diagnostics and investigation.',
    });
    const resolveBody = await resolveResponse.json();
    expect(resolveResponse.status).toBe(200);
    expect(resolveBody.ticket.internalNote).toBe(
      'Private app-support diagnostics and investigation.'
    );

    setSession(courier);
    const courierResponse = await getTickets(`?ticketId=${createBody.ticket._id}`);
    const courierBody = await courierResponse.json();
    expect(courierBody.tickets).toHaveLength(1);
    expect(courierBody.tickets[0].responseNote).toBe(resolveBody.ticket.responseNote);
    expect(courierBody.tickets[0]).not.toHaveProperty('internalNote');
    expect(courierBody.tickets[0]).not.toHaveProperty('resolvedBy');

    setSession(customer);
    const customerResponse = await getTickets(`?ticketId=${createBody.ticket._id}`);
    const customerBody = await customerResponse.json();
    expect(customerResponse.status).toBe(200);
    expect(customerBody.tickets).toEqual([]);
  });
});
