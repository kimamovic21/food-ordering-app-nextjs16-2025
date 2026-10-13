import 'server-only';

import { createAuditLog, type AuditActor } from '@/libs/auditLog';
import { applyCourierAssignmentTimeout } from '@/libs/courierAssignmentTimeout';
import { releaseOrderInventoryReservation } from '@/libs/menuItemInventoryServer';
import {
  COURIER_ASSIGNMENT_RESPONSE_TIMEOUT_MINUTES,
  READY_WITHOUT_COURIER_AUTO_CANCEL_MINUTES,
  UNPAID_ORDER_AUTO_CANCEL_MINUTES,
} from '@/libs/orderMaintenanceConfig';
import { applyOrderAutoCancellation } from '@/libs/orderAutoCancellation';
import { Order } from '@/models/order';
import type {
  OrderMaintenanceRecoveryCandidate,
  OrderMaintenanceRecoveryIssue,
  OrderMaintenanceRecoveryRunResult,
  OrderMaintenanceRecoverySnapshot,
  OrderMaintenanceRecoverySummary,
} from '@/types/order-maintenance-recovery';

const DEFAULT_RECOVERY_LIMIT = 50;
const MAX_RECOVERY_LIMIT = 100;

const issueLabels: Record<OrderMaintenanceRecoveryIssue, string> = {
  expired_inventory_reservation: 'Expired inventory reservation',
  ready_without_courier: 'Ready without courier',
  stale_courier_assignment: 'Stale courier assignment',
  stale_unpaid_order: 'Stale unpaid order',
};

const issueActions: Record<OrderMaintenanceRecoveryIssue, string> = {
  expired_inventory_reservation: 'Release reserved stock or cancel stale unpaid order',
  ready_without_courier: 'Run ready-without-courier cancellation check',
  stale_courier_assignment: 'Expire pending courier assignment',
  stale_unpaid_order: 'Cancel unpaid order and expire Stripe Checkout session',
};

const normalizeLimit = (limit?: number) => {
  const parsed = Math.floor(Number(limit) || DEFAULT_RECOVERY_LIMIT);

  return Math.min(MAX_RECOVERY_LIMIT, Math.max(1, parsed));
};

const minutesAgoDate = (now: Date, minutes: number) =>
  new Date(now.getTime() - minutes * 60 * 1000);

const toIdText = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return value.toString();
  }
  return String(value);
};

const dateToIso = (value: unknown) => {
  if (!value) return null;

  const date = new Date(value as Date | string);

  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const getMinutesOverdue = (now: Date, value: unknown) => {
  if (!value) return 0;

  const date = new Date(value as Date | string);

  if (!Number.isFinite(date.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
};

const isOrderPaid = (order: any) => Boolean(order?.orderPaid || order?.paymentStatus || order?.paid);

const unpaidFilter = {
  orderPaid: { $ne: true },
  paid: { $ne: true },
  paymentStatus: { $ne: true },
};

const recoverySelect =
  '_id email restaurantId orderStatus createdAt readyAt courierId courierAssignedAt courierAssignmentStatus inventoryReservationStatus inventoryReservationExpiresAt inventoryReservedItems orderPaid paid paymentStatus';

const buildCandidate = ({
  description,
  issue,
  now,
  order,
  triggerAt,
}: {
  description: string;
  issue: OrderMaintenanceRecoveryIssue;
  now: Date;
  order: any;
  triggerAt: unknown;
}): OrderMaintenanceRecoveryCandidate => ({
  action: issueActions[issue],
  description,
  email: order.email || '',
  inventoryReservedItemsCount: Array.isArray(order.inventoryReservedItems)
    ? order.inventoryReservedItems.length
    : 0,
  issue,
  label: issueLabels[issue],
  minutesOverdue: getMinutesOverdue(now, triggerAt),
  orderId: toIdText(order._id) || '',
  orderStatus: order.orderStatus || '',
  restaurantId: toIdText(order.restaurantId),
  triggerAt: dateToIso(triggerAt),
});

const getRecoverySummary = (
  candidates: OrderMaintenanceRecoveryCandidate[]
): OrderMaintenanceRecoverySummary => {
  const uniqueOrderIds = new Set(candidates.map((candidate) => candidate.orderId));

  return {
    expiredInventoryReservations: candidates.filter(
      (candidate) => candidate.issue === 'expired_inventory_reservation'
    ).length,
    readyWithoutCourierOrders: candidates.filter(
      (candidate) => candidate.issue === 'ready_without_courier'
    ).length,
    staleCourierAssignments: candidates.filter(
      (candidate) => candidate.issue === 'stale_courier_assignment'
    ).length,
    staleUnpaidOrders: candidates.filter((candidate) => candidate.issue === 'stale_unpaid_order')
      .length,
    totalIssues: candidates.length,
    uniqueOrders: uniqueOrderIds.size,
  };
};

const queryCandidates = async ({
  issue,
  now,
  query,
  description,
  triggerAtField,
  limit,
}: {
  description: string;
  issue: OrderMaintenanceRecoveryIssue;
  limit: number;
  now: Date;
  query: Record<string, unknown>;
  triggerAtField: string;
}) => {
  const orders = await Order.find(query)
    .select(recoverySelect)
    .sort({ [triggerAtField]: 1, createdAt: 1 })
    .limit(limit)
    .lean();

  return orders.map((order: any) =>
    buildCandidate({
      description,
      issue,
      now,
      order,
      triggerAt: order[triggerAtField] || order.createdAt,
    })
  );
};

export const getOrderMaintenanceRecoverySnapshot = async ({
  limit,
  now = new Date(),
}: {
  limit?: number;
  now?: Date;
} = {}): Promise<OrderMaintenanceRecoverySnapshot> => {
  const safeLimit = normalizeLimit(limit);
  const unpaidCutoff = minutesAgoDate(now, UNPAID_ORDER_AUTO_CANCEL_MINUTES);
  const assignmentCutoff = minutesAgoDate(now, COURIER_ASSIGNMENT_RESPONSE_TIMEOUT_MINUTES);
  const readyCutoff = minutesAgoDate(now, READY_WITHOUT_COURIER_AUTO_CANCEL_MINUTES);

  const [
    staleUnpaidOrders,
    expiredInventoryReservations,
    staleCourierAssignments,
    readyWithoutCourierOrders,
  ] = await Promise.all([
    queryCandidates({
      description: `Unpaid placed order is older than ${UNPAID_ORDER_AUTO_CANCEL_MINUTES} minutes.`,
      issue: 'stale_unpaid_order',
      limit: safeLimit,
      now,
      query: {
        ...unpaidFilter,
        createdAt: { $lte: unpaidCutoff },
        orderStatus: 'placed',
      },
      triggerAtField: 'createdAt',
    }),
    queryCandidates({
      description:
        'Tracked stock is still reserved after the unpaid checkout reservation window expired.',
      issue: 'expired_inventory_reservation',
      limit: safeLimit,
      now,
      query: {
        ...unpaidFilter,
        inventoryReservationExpiresAt: { $lte: now },
        inventoryReservationStatus: 'reserved',
      },
      triggerAtField: 'inventoryReservationExpiresAt',
    }),
    queryCandidates({
      description: `Courier assignment has been pending for more than ${COURIER_ASSIGNMENT_RESPONSE_TIMEOUT_MINUTES} minutes.`,
      issue: 'stale_courier_assignment',
      limit: safeLimit,
      now,
      query: {
        courierAssignmentStatus: 'pending',
        courierAssignedAt: { $lte: assignmentCutoff },
        courierId: { $ne: null },
        orderStatus: 'ready',
      },
      triggerAtField: 'courierAssignedAt',
    }),
    queryCandidates({
      description: `Ready order has no courier after ${READY_WITHOUT_COURIER_AUTO_CANCEL_MINUTES} minutes.`,
      issue: 'ready_without_courier',
      limit: safeLimit,
      now,
      query: {
        courierId: null,
        orderStatus: 'ready',
        readyAt: { $lte: readyCutoff },
      },
      triggerAtField: 'readyAt',
    }),
  ]);

  const candidates = [
    ...staleUnpaidOrders,
    ...expiredInventoryReservations,
    ...staleCourierAssignments,
    ...readyWithoutCourierOrders,
  ].sort((left, right) => {
    const leftDate = left.triggerAt ? new Date(left.triggerAt).getTime() : 0;
    const rightDate = right.triggerAt ? new Date(right.triggerAt).getTime() : 0;

    return leftDate - rightDate;
  });
  const summary = getRecoverySummary(candidates);

  return {
    canRecover: summary.uniqueOrders > 0,
    candidates,
    checkedAt: now.toISOString(),
    summary,
  };
};

const isExpiredUnpaidReservation = (order: any, now: Date) =>
  !isOrderPaid(order) &&
  order?.inventoryReservationStatus === 'reserved' &&
  order?.inventoryReservationExpiresAt &&
  new Date(order.inventoryReservationExpiresAt).getTime() <= now.getTime();

export const runOrderMaintenanceRecovery = async ({
  actor,
  limit,
  now = new Date(),
}: {
  actor: AuditActor;
  limit?: number;
  now?: Date;
}): Promise<OrderMaintenanceRecoveryRunResult> => {
  const before = await getOrderMaintenanceRecoverySnapshot({ limit, now });
  const issuesByOrderId = new Map<string, OrderMaintenanceRecoveryIssue[]>();

  before.candidates.forEach((candidate) => {
    const issues = issuesByOrderId.get(candidate.orderId) || [];
    issuesByOrderId.set(candidate.orderId, [...new Set([...issues, candidate.issue])]);
  });

  const results = [];

  for (const [orderId, issues] of issuesByOrderId.entries()) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        results.push({
          assignmentExpired: false,
          canceled: false,
          error: null,
          inventoryReservationReleased: false,
          issues,
          orderId,
          skipped: 'order_not_found',
        });
        continue;
      }

      const shouldCheckAssignment =
        issues.includes('stale_courier_assignment') || issues.includes('ready_without_courier');
      const assignmentResult = shouldCheckAssignment
        ? await applyCourierAssignmentTimeout(order)
        : { expired: false };
      const cancellationResult = await applyOrderAutoCancellation(order);
      let inventoryReservationReleased =
        order.inventoryReservationStatus === 'released' &&
        issues.includes('expired_inventory_reservation');

      if (!cancellationResult.canceled && isExpiredUnpaidReservation(order, now)) {
        const releaseResult = await releaseOrderInventoryReservation(
          order,
          'Expired checkout inventory reservation was released by maintenance recovery.'
        );

        inventoryReservationReleased = releaseResult.released;

        if (releaseResult.released) {
          await order.save();
        }
      }

      results.push({
        assignmentExpired: Boolean(assignmentResult.expired),
        canceled: Boolean(cancellationResult.canceled),
        error: null,
        inventoryReservationReleased,
        issues,
        orderId,
        skipped: null,
      });
    } catch (error) {
      results.push({
        assignmentExpired: false,
        canceled: false,
        error: error instanceof Error ? error.message : 'Unknown recovery error',
        inventoryReservationReleased: false,
        issues,
        orderId,
        skipped: null,
      });
    }
  }

  const runSummary = {
    ...before.summary,
    canceledOrders: results.filter((result) => result.canceled).length,
    expiredAssignments: results.filter((result) => result.assignmentExpired).length,
    failedOrders: results.filter((result) => result.error).length,
    releasedReservations: results.filter((result) => result.inventoryReservationReleased).length,
    skippedOrders: results.filter((result) => result.skipped).length,
  };
  const appliedAt = new Date();

  await createAuditLog({
    actor,
    action: 'order_maintenance.recovery_run',
    entityType: 'system',
    entityId: 'order-maintenance-recovery',
    metadata: {
      checkedAt: before.checkedAt,
      appliedAt: appliedAt.toISOString(),
      results,
      summary: runSummary,
    },
  });

  return {
    appliedAt: appliedAt.toISOString(),
    before,
    checkedAt: before.checkedAt,
    results,
    summary: runSummary,
  };
};
