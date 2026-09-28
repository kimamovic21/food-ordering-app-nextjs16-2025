export type LoyaltyTier = {
  name: string;
  ordersRequired: number;
  discountPercentage: number;
  color: string;
};

export type LoyaltyStatus = {
  currentTier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
  totalOrders: number;
  ordersToNextTier: number;
  discountPercentage: number;
};

export type LoyaltyLedgerEntryType = 'order_completed' | 'discount_applied' | 'reward_reversed';

export type LoyaltyLedgerEntryStatus = 'active' | 'reversed';

export type LoyaltyLedgerEntry = {
  _id: string;
  userId: string;
  orderId: string;
  restaurantId: string | null;
  type: LoyaltyLedgerEntryType;
  status: LoyaltyLedgerEntryStatus;
  tierName: string | null;
  discountPercentage: number;
  discountAmount: number;
  orderTotal: number;
  orderCountDelta: number;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LoyaltyLedgerSummary = {
  earnedOrders: number;
  reversedOrders: number;
  totalDiscountApplied: number;
  totalDiscountReversed: number;
};

export type LoyaltyLedgerResult = {
  entries: LoyaltyLedgerEntry[];
  summary: LoyaltyLedgerSummary;
};
