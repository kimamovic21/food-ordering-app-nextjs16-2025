const orderFind = vi.fn();
const orderFindById = vi.fn();
const applyCourierAssignmentTimeout = vi.fn();
const applyOrderAutoCancellation = vi.fn();
const releaseOrderInventoryReservation = vi.fn();
const createAuditLog = vi.fn();

vi.mock('@/models/order', () => ({
  Order: {
    find: orderFind,
    findById: orderFindById,
  },
}));

vi.mock('@/libs/courierAssignmentTimeout', () => ({
  applyCourierAssignmentTimeout,
}));

vi.mock('@/libs/orderAutoCancellation', () => ({
  applyOrderAutoCancellation,
}));

vi.mock('@/libs/menuItemInventoryServer', () => ({
  releaseOrderInventoryReservation,
}));

vi.mock('@/libs/auditLog', () => ({
  createAuditLog,
}));

const createFindChain = (items: any[]) => ({
  select: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(items),
});

const mockFindBatches = (batches: any[][]) => {
  batches.forEach((batch) => {
    orderFind.mockReturnValueOnce(createFindChain(batch));
  });
};

describe('order maintenance recovery helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyCourierAssignmentTimeout.mockResolvedValue({ expired: false });
    applyOrderAutoCancellation.mockResolvedValue({ canceled: false, reason: '' });
    releaseOrderInventoryReservation.mockResolvedValue({ released: false, reservedItems: [] });
  });

  it('builds a dry-run snapshot for stale maintenance candidates', async () => {
    const { getOrderMaintenanceRecoverySnapshot } = await import('@/libs/orderMaintenanceRecovery');
    const now = new Date('2026-10-13T12:00:00.000Z');

    mockFindBatches([
      [
        {
          _id: 'order-unpaid',
          createdAt: new Date('2026-10-13T11:20:00.000Z'),
          email: 'customer@example.com',
          orderStatus: 'placed',
          restaurantId: 'restaurant-1',
        },
      ],
      [
        {
          _id: 'order-reserved',
          email: 'stock@example.com',
          inventoryReservationExpiresAt: new Date('2026-10-13T11:25:00.000Z'),
          inventoryReservedItems: [{ menuItemId: 'menu-1', quantity: 1 }],
          orderStatus: 'placed',
          restaurantId: 'restaurant-1',
        },
      ],
      [
        {
          _id: 'order-assignment',
          courierAssignedAt: new Date('2026-10-13T11:45:00.000Z'),
          email: 'courier@example.com',
          orderStatus: 'ready',
          restaurantId: 'restaurant-1',
        },
      ],
      [
        {
          _id: 'order-ready',
          email: 'ready@example.com',
          orderStatus: 'ready',
          readyAt: new Date('2026-10-13T10:30:00.000Z'),
          restaurantId: 'restaurant-1',
        },
      ],
    ]);

    const snapshot = await getOrderMaintenanceRecoverySnapshot({ now });

    expect(snapshot.canRecover).toBe(true);
    expect(snapshot.summary).toEqual({
      expiredInventoryReservations: 1,
      readyWithoutCourierOrders: 1,
      staleCourierAssignments: 1,
      staleUnpaidOrders: 1,
      totalIssues: 4,
      uniqueOrders: 4,
    });
    expect(snapshot.candidates.map((candidate) => candidate.issue).sort()).toEqual([
      'expired_inventory_reservation',
      'ready_without_courier',
      'stale_courier_assignment',
      'stale_unpaid_order',
    ]);
    expect(orderFind).toHaveBeenCalledTimes(4);
  });

  it('runs recovery through existing idempotent maintenance helpers', async () => {
    const { runOrderMaintenanceRecovery } = await import('@/libs/orderMaintenanceRecovery');
    const now = new Date('2026-10-13T12:00:00.000Z');
    const unpaidOrder = {
      _id: 'order-unpaid',
      inventoryReservationStatus: 'released',
    };
    const courierOrder = {
      _id: 'order-courier',
      inventoryReservationStatus: 'none',
    };

    mockFindBatches([
      [
        {
          _id: 'order-unpaid',
          createdAt: new Date('2026-10-13T11:20:00.000Z'),
          email: 'customer@example.com',
          orderStatus: 'placed',
        },
      ],
      [],
      [
        {
          _id: 'order-courier',
          courierAssignedAt: new Date('2026-10-13T11:45:00.000Z'),
          email: 'courier@example.com',
          orderStatus: 'ready',
        },
      ],
      [],
    ]);
    orderFindById.mockResolvedValueOnce(unpaidOrder).mockResolvedValueOnce(courierOrder);
    applyOrderAutoCancellation
      .mockResolvedValueOnce({ canceled: true, order: unpaidOrder, reason: 'stale payment' })
      .mockResolvedValueOnce({ canceled: false, order: courierOrder, reason: '' });
    applyCourierAssignmentTimeout.mockResolvedValueOnce({
      expired: true,
      order: courierOrder,
      reason: 'timeout',
    });

    const result = await runOrderMaintenanceRecovery({
      actor: { email: 'super@example.com', role: 'admin' },
      now,
    });

    expect(applyOrderAutoCancellation).toHaveBeenCalledTimes(2);
    expect(applyCourierAssignmentTimeout).toHaveBeenCalledWith(courierOrder);
    expect(result.summary.canceledOrders).toBe(1);
    expect(result.summary.expiredAssignments).toBe(1);
    expect(result.summary.failedOrders).toBe(0);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order_maintenance.recovery_run',
        actor: { email: 'super@example.com', role: 'admin' },
        entityType: 'system',
      })
    );
  });

  it('releases an expired unpaid reservation when cancellation does not change the order', async () => {
    const { runOrderMaintenanceRecovery } = await import('@/libs/orderMaintenanceRecovery');
    const now = new Date('2026-10-13T12:00:00.000Z');
    const order = {
      _id: 'order-reserved',
      inventoryReservationExpiresAt: new Date('2026-10-13T11:25:00.000Z'),
      inventoryReservationStatus: 'reserved',
      orderPaid: false,
      paid: false,
      paymentStatus: false,
      save: vi.fn(),
    };

    mockFindBatches([
      [],
      [
        {
          _id: 'order-reserved',
          email: 'stock@example.com',
          inventoryReservationExpiresAt: order.inventoryReservationExpiresAt,
          inventoryReservedItems: [{ menuItemId: 'menu-1', quantity: 1 }],
          orderStatus: 'canceled',
        },
      ],
      [],
      [],
    ]);
    orderFindById.mockResolvedValueOnce(order);
    applyOrderAutoCancellation.mockResolvedValueOnce({
      canceled: false,
      order,
      reason: '',
    });
    releaseOrderInventoryReservation.mockResolvedValueOnce({
      released: true,
      reservedItems: [{ menuItemId: 'menu-1', quantity: 1 }],
    });

    const result = await runOrderMaintenanceRecovery({
      actor: { email: 'super@example.com', role: 'admin' },
      now,
    });

    expect(releaseOrderInventoryReservation).toHaveBeenCalledWith(
      order,
      'Expired checkout inventory reservation was released by maintenance recovery.'
    );
    expect(order.save).toHaveBeenCalled();
    expect(result.summary.releasedReservations).toBe(1);
  });
});
