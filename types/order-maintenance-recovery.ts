import type { EntityId, ISODateString } from '@/types/common';

export type OrderMaintenanceRecoveryIssue =
  | 'stale_unpaid_order'
  | 'expired_inventory_reservation'
  | 'stale_courier_assignment'
  | 'ready_without_courier';

export type OrderMaintenanceRecoveryCandidate = {
  issue: OrderMaintenanceRecoveryIssue;
  orderId: EntityId;
  restaurantId: EntityId | null;
  email: string;
  orderStatus: string;
  label: string;
  description: string;
  action: string;
  triggerAt: ISODateString | null;
  minutesOverdue: number;
  inventoryReservedItemsCount: number;
};

export type OrderMaintenanceRecoverySummary = {
  staleUnpaidOrders: number;
  expiredInventoryReservations: number;
  staleCourierAssignments: number;
  readyWithoutCourierOrders: number;
  totalIssues: number;
  uniqueOrders: number;
};

export type OrderMaintenanceRecoverySnapshot = {
  checkedAt: ISODateString;
  canRecover: boolean;
  candidates: OrderMaintenanceRecoveryCandidate[];
  summary: OrderMaintenanceRecoverySummary;
};

export type OrderMaintenanceRecoveryResultItem = {
  orderId: EntityId;
  issues: OrderMaintenanceRecoveryIssue[];
  canceled: boolean;
  assignmentExpired: boolean;
  inventoryReservationReleased: boolean;
  skipped: string | null;
  error: string | null;
};

export type OrderMaintenanceRecoveryRunResult = {
  checkedAt: ISODateString;
  appliedAt: ISODateString;
  before: OrderMaintenanceRecoverySnapshot;
  results: OrderMaintenanceRecoveryResultItem[];
  summary: OrderMaintenanceRecoverySummary & {
    canceledOrders: number;
    expiredAssignments: number;
    releasedReservations: number;
    skippedOrders: number;
    failedOrders: number;
  };
};
