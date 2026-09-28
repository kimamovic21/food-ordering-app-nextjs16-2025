import { model, models, Schema } from 'mongoose';

const LoyaltyLedgerEntrySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['order_completed', 'discount_applied', 'reward_reversed'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'reversed'],
      default: 'active',
      index: true,
    },
    tierName: {
      type: String,
      default: null,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderCountDelta: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { collection: 'loyalty_ledger_entries', timestamps: true }
);

LoyaltyLedgerEntrySchema.index({ userId: 1, createdAt: -1 });
LoyaltyLedgerEntrySchema.index({ userId: 1, type: 1, createdAt: -1 });
LoyaltyLedgerEntrySchema.index({ restaurantId: 1, createdAt: -1 });
LoyaltyLedgerEntrySchema.index({ orderId: 1, type: 1 }, { unique: true });

try {
  if (models.LoyaltyLedgerEntry) {
    delete models.LoyaltyLedgerEntry;
  }
} catch {}

export const LoyaltyLedgerEntry =
  models?.LoyaltyLedgerEntry ||
  model('LoyaltyLedgerEntry', LoyaltyLedgerEntrySchema, 'loyalty_ledger_entries');
