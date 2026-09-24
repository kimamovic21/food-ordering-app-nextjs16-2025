import 'server-only';
import type { HydratedDocument } from 'mongoose';

type OrderDocument = HydratedDocument<any>;
type RefundReadiness =
  | { canRefund: false; reason: string; refundAmount?: undefined }
  | { canRefund: true; reason: ''; refundAmount: number };
type RefundSimulationResult =
  | { canRefund: false; reason: string; refundAmount?: undefined; simulationId?: undefined }
  | { canRefund: true; reason: ''; refundAmount: number; simulationId: string };

export const SIMULATED_REFUND_PROVIDER = 'simulated_stripe' as const;
export const DEFAULT_REFUND_READY_REASON =
  'Paid order was canceled after fulfillment could not continue.';

const roundMoney = (amount: number) => Math.max(0, Math.round(amount * 100) / 100);

export const isOrderPaymentCaptured = (order: OrderDocument | Record<string, unknown>) =>
  Boolean((order as any).orderPaid || (order as any).paymentStatus || (order as any).paid);

export const markOrderRefundReviewRequired = (
  order: OrderDocument,
  {
    reason = DEFAULT_REFUND_READY_REASON,
    now = new Date(),
    wasPaid = isOrderPaymentCaptured(order),
  }: {
    reason?: string;
    now?: Date;
    wasPaid?: boolean;
  } = {}
) => {
  if (!wasPaid || (order as any).refundStatus === 'refunded') {
    return false;
  }

  const refundAmount = roundMoney(Number((order as any).total) || 0);

  if (refundAmount <= 0) {
    return false;
  }

  (order as any).refundStatus = 'review_required';
  (order as any).refundReason = reason.slice(0, 500);
  (order as any).refundAmount = refundAmount;
  (order as any).refundRequestedAt = (order as any).refundRequestedAt || now;
  (order as any).refundProcessedAt = null;
  (order as any).refundProcessedBy = null;
  (order as any).refundProvider = null;
  (order as any).refundSimulationId = null;

  return true;
};

export const getOrderRefundReadiness = (
  order: OrderDocument | Record<string, unknown>
): RefundReadiness => {
  const refundStatus = String((order as any).refundStatus || 'not_required');
  const refundAmount = roundMoney(Number((order as any).refundAmount) || 0);

  if ((order as any).orderStatus !== 'canceled') {
    return {
      canRefund: false,
      reason: 'Only canceled orders can be reviewed for a simulated refund.',
    };
  }

  if (refundStatus === 'refunded') {
    return {
      canRefund: false,
      reason: 'This order has already been marked as refunded.',
    };
  }

  if (refundStatus !== 'review_required') {
    return {
      canRefund: false,
      reason: 'This order is not marked as refund review required.',
    };
  }

  if (refundAmount <= 0) {
    return {
      canRefund: false,
      reason: 'Refund amount is missing or invalid.',
    };
  }

  return { canRefund: true, reason: '', refundAmount };
};

export const simulateOrderRefund = (
  order: OrderDocument,
  {
    actorId,
    now = new Date(),
  }: {
    actorId: unknown;
    now?: Date;
  }
): RefundSimulationResult => {
  const readiness = getOrderRefundReadiness(order);

  if (!readiness.canRefund) {
    return readiness;
  }

  const simulationId = `sim_ref_${order._id.toString().slice(-8)}_${now.getTime()}`;

  (order as any).refundStatus = 'refunded';
  (order as any).refundProcessedAt = now;
  (order as any).refundProcessedBy = actorId;
  (order as any).refundProvider = SIMULATED_REFUND_PROVIDER;
  (order as any).refundSimulationId = simulationId;

  return {
    canRefund: true,
    reason: '',
    refundAmount: readiness.refundAmount,
    simulationId,
  };
};
