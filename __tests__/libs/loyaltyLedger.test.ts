import { LoyaltyLedgerEntry } from '@/models/loyaltyLedgerEntry';
import {
  getUserLoyaltyLedger,
  recordOrderLoyaltyCompletion,
  reverseOrderLoyaltyRewards,
} from '@/libs/loyaltyLedger';

vi.mock('@/models/loyaltyLedgerEntry', () => ({
  LoyaltyLedgerEntry: {
    aggregate: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
}));

const createOrder = (overrides: Record<string, unknown> = {}) =>
  ({
    _id: 'order-123456',
    userId: 'user-1',
    restaurantId: 'restaurant-1',
    orderStatus: 'completed',
    total: 44.25,
    loyaltyDiscount: 4.5,
    loyaltyDiscountPercentage: 10,
    loyaltyTier: 'Bronze',
    completedAt: new Date('2026-09-28T10:00:00.000Z'),
    deliveryCompletedBy: 'customer',
    ...overrides,
  }) as never;

describe('loyaltyLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LoyaltyLedgerEntry.findOneAndUpdate).mockResolvedValue({} as never);
    vi.mocked(LoyaltyLedgerEntry.updateMany).mockResolvedValue({ modifiedCount: 2 } as never);
  });

  it('records completion and discount ledger entries for a completed order', async () => {
    const order = createOrder();

    const result = await recordOrderLoyaltyCompletion(order, {
      actor: { _id: 'user-1', email: 'customer@example.com', role: 'user' },
    });

    expect(result).toEqual({ recorded: true });
    expect(LoyaltyLedgerEntry.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(LoyaltyLedgerEntry.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { orderId: 'order-123456', type: 'order_completed' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          orderCountDelta: 1,
          description: 'Order #123456 counted toward loyalty rewards.',
          metadata: expect.objectContaining({
            actorEmail: 'customer@example.com',
            source: 'order_completion',
          }),
        }),
      }),
      expect.objectContaining({ upsert: true })
    );
    expect(LoyaltyLedgerEntry.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { orderId: 'order-123456', type: 'discount_applied' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          discountAmount: 4.5,
          orderCountDelta: 0,
          description: 'Bronze reward saved $4.50 on order #123456.',
        }),
      }),
      expect.objectContaining({ upsert: true })
    );
  });

  it('does not record ledger entries before an order is completed', async () => {
    const result = await recordOrderLoyaltyCompletion(createOrder({ orderStatus: 'delivered' }));

    expect(result).toEqual({ recorded: false });
    expect(LoyaltyLedgerEntry.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('records only the completed-order credit when no loyalty discount was applied', async () => {
    const result = await recordOrderLoyaltyCompletion(
      createOrder({
        loyaltyDiscount: 0,
        loyaltyDiscountPercentage: 0,
        loyaltyTier: null,
      })
    );

    expect(result).toEqual({ recorded: true });
    expect(LoyaltyLedgerEntry.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(LoyaltyLedgerEntry.findOneAndUpdate).toHaveBeenCalledWith(
      { orderId: 'order-123456', type: 'order_completed' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          orderCountDelta: 1,
          discountAmount: 0,
        }),
      }),
      expect.objectContaining({ upsert: true })
    );
  });

  it('creates one reversal entry and marks earned entries as reversed', async () => {
    const order = createOrder({ orderStatus: 'canceled' });
    vi.mocked(LoyaltyLedgerEntry.findOne)
      .mockResolvedValueOnce({ _id: 'ledger-1' } as never)
      .mockResolvedValueOnce(null as never);

    const result = await reverseOrderLoyaltyRewards(order, {
      reason: 'Paid order was refunded.',
      actor: { _id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    expect(result).toEqual({ reversed: true });
    expect(LoyaltyLedgerEntry.updateMany).toHaveBeenCalledWith(
      {
        orderId: 'order-123456',
        type: { $in: ['order_completed', 'discount_applied'] },
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'reversed',
          'metadata.reversalReason': 'Paid order was refunded.',
        }),
      })
    );
    expect(LoyaltyLedgerEntry.findOneAndUpdate).toHaveBeenCalledWith(
      { orderId: 'order-123456', type: 'reward_reversed' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          orderCountDelta: -1,
          description: 'Loyalty reward for order #123456 was reversed.',
        }),
      }),
      expect.objectContaining({ upsert: true })
    );
  });

  it('serializes recent ledger entries and summary totals for the loyalty page/API', async () => {
    const query = {
      sort: vi.fn(() => query),
      limit: vi.fn(() => query),
      lean: vi.fn().mockResolvedValue([
        {
          _id: 'ledger-1',
          userId: 'user-1',
          orderId: 'order-123456',
          restaurantId: 'restaurant-1',
          type: 'discount_applied',
          status: 'active',
          tierName: 'Bronze',
          discountPercentage: 10,
          discountAmount: 4.5,
          orderTotal: 44.25,
          orderCountDelta: 0,
          description: 'Bronze reward saved 4.50 on order #123456.',
          metadata: { source: 'completed_order_discount' },
          createdAt: new Date('2026-09-28T10:00:00.000Z'),
          updatedAt: new Date('2026-09-28T10:00:00.000Z'),
        },
      ]),
    };

    vi.mocked(LoyaltyLedgerEntry.find).mockReturnValue(query as never);
    vi.mocked(LoyaltyLedgerEntry.aggregate).mockResolvedValueOnce([
      {
        earnedOrders: 3,
        reversedOrders: 1,
        totalDiscountApplied: 12.25,
        totalDiscountReversed: 4.5,
      },
    ] as never);

    const result = await getUserLoyaltyLedger('user-1', { limit: 5 });

    expect(LoyaltyLedgerEntry.find).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(result.summary).toEqual({
      earnedOrders: 3,
      reversedOrders: 1,
      totalDiscountApplied: 12.25,
      totalDiscountReversed: 4.5,
    });
    expect(result.entries[0]).toMatchObject({
      _id: 'ledger-1',
      orderId: 'order-123456',
      type: 'discount_applied',
      discountAmount: 4.5,
      createdAt: '2026-09-28T10:00:00.000Z',
    });
  });
});
