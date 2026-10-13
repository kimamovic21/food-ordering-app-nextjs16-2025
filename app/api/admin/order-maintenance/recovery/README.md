# API Route: app/api/admin/order-maintenance/recovery

> Keep this file aligned with `route.ts`, `libs/orderMaintenanceRecovery.ts`, and the System Health recovery panel.

## Purpose

This superadmin-only route provides a production safety net for stale order maintenance states. It
does not replace QStash. It lets the super admin inspect and recover orders that should have been
handled by delayed maintenance jobs but may still be stuck because a background job was delayed,
skipped, misconfigured, or failed.

## Audience And Access

- Route: `/api/admin/order-maintenance/recovery`
- Methods: `GET`, `POST`
- Audience: super admin only
- Auth: NextAuth session plus MongoDB user lookup
- Role rule: signed-in user must be `admin` and match `SUPER_ADMIN_EMAIL` or
  `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`

## GET Behavior

`GET` is a dry-run inspection.

It returns a `snapshot` from `getOrderMaintenanceRecoverySnapshot()` with:

- stale unpaid `placed` orders older than the payment window
- expired unpaid inventory reservations
- stale pending courier assignments
- ready orders without a courier after the auto-cancel window
- issue counts and unique affected order count

It does not mutate MongoDB, Stripe, inventory, courier assignments, notifications, or audit logs.

## POST Behavior

`POST` runs the recovery workflow.

For each unique affected order, it reloads the latest order document and reuses the existing
idempotent business helpers:

- `applyCourierAssignmentTimeout()` for stale pending courier assignments
- `applyOrderAutoCancellation()` for stale unpaid and ready-without-courier orders
- `releaseOrderInventoryReservation()` for expired unpaid inventory reservations that were not
  already released by cancellation

The route writes one summary audit log with action `order_maintenance.recovery_run`. The underlying
business helpers can also write their own order-level audit logs and notifications.

## Edge Cases

- Missing/invalid sessions return `401`.
- Non-superadmin users return `403`.
- Missing orders are skipped safely.
- Each order is reloaded before mutation so stale dry-run data does not blindly change old state.
- Recovery is idempotent because it delegates to existing guarded helpers.
- Paid orders with reserved inventory are not force-released by this route; those should remain in
  payment/webhook/refund-review handling.

## Related Files

- `libs/orderMaintenanceRecovery.ts`
- `libs/orderAutoCancellation.ts`
- `libs/courierAssignmentTimeout.ts`
- `libs/menuItemInventoryServer.ts`
- `app/admin-dashboard/system-health/OrderMaintenanceRecoveryPanel.tsx`
- `OPERATIONS_RUNBOOK.md`
- `FEATURE_WORKFLOW_INDEX.md`
