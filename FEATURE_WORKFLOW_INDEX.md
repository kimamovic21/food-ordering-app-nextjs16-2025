# Feature Workflow Index

Use this file as the first routing map for non-trivial feature work. It tells future
development sessions which source files, tests, and docs to inspect before changing a workflow.

This file is not the source of truth. Source code, Mongoose models, route handlers, shared helpers,
and tests remain authoritative.

## How To Use This Index

1. Find the feature area below.
2. Read the listed docs first.
3. Read the listed source files before editing.
4. Run the suggested focused tests while iterating.
5. Update the same docs when behavior changes.

If a feature touches production operations, deployment, env vars, background jobs, payment recovery,
or service troubleshooting, also read `OPERATIONS_RUNBOOK.md`.

## Checkout, Cart, Stripe, And Inventory

Read first:

- `README.md` sections: Order Flow And Restaurant Capacity, Background Jobs With QStash.
- `DESCRIPTION.md` checkout and order status sections.
- `ARCHITECTURE.md` Checkout And Payment Flow, Order Lifecycle.
- `OPERATIONS_RUNBOOK.md` Checkout And Stripe Incidents, Inventory Reservation Checklist.
- `app/cart/README.md`
- `app/api/checkout/README.md`
- `app/api/webhook/README.md`
- `app/api/cart/validate/README.md`
- `app/api/admin/order-maintenance/recovery/README.md`
- `app/admin-dashboard/system-health/README.md`

Main source files:

- `app/api/checkout/route.ts`
- `app/api/webhook/route.ts`
- `app/api/cart/validate/route.ts`
- `libs/cartValidation.ts`
- `libs/menuItemInventory.ts`
- `libs/menuItemInventoryServer.ts`
- `libs/stripeCheckoutSession.ts`
- `libs/orderAutoCancellation.ts`
- `libs/orderMaintenanceRecovery.ts`
- `libs/qstash.ts`
- `app/api/admin/order-maintenance/recovery/route.ts`
- `app/admin-dashboard/system-health/OrderMaintenanceRecoveryPanel.tsx`
- `models/order.ts`
- `models/menuItem.ts`
- `contexts/CartContext.tsx`

Key rules:

- `/api/checkout` is the final server-authoritative gate.
- Cart UI warnings are useful UX, but they cannot replace checkout validation.
- Tracked inventory availability is `stockQuantity - reservedStockQuantity`.
- Paid Stripe webhook handling must stay idempotent.
- Stale unpaid and customer-canceled unpaid orders must expire the Stripe session when possible and
  release reserved tracked stock.
- Failed inventory capture after payment should not oversell silently; keep the refund-review
  fallback behavior.
- Manual order maintenance recovery is superadmin-only. It must dry-run first, reload each order
  before mutation, reuse existing idempotent helpers, and write meaningful audit logs.

Focused tests:

```bash
npm run test:payment
npm run test:file -- __tests__/libs/menuItemInventoryServer.test.ts __tests__/libs/menuItemInventory.test.ts __tests__/libs/cartValidation.test.ts __tests__/api/cart-validate.route.test.ts __tests__/api/checkout.route.test.ts __tests__/api/webhook.route.test.ts __tests__/libs/order-auto-cancellation.test.ts __tests__/libs/orderMaintenanceRecovery.test.ts __tests__/api/admin-order-maintenance-recovery.route.test.ts __tests__/models/order.model.test.ts __tests__/models/menuItem.model.test.ts
```

## Restaurant Ordering Status, ETA, Capacity, And Discovery

Read first:

- `ARCHITECTURE.md` Checkout And Payment Flow and Application Areas.
- `DESCRIPTION.md` restaurant discovery and checkout rules.
- `app/restaurants/README.md`
- `app/restaurants/[id]/README.md`
- `app/api/restaurants/README.md`
- `app/api/restaurants/[id]/ordering-status/README.md`
- `app/admin-dashboard/restaurants/README.md`
- `app/admin-dashboard/restaurants/[id]/README.md`

Main source files:

- `app/api/restaurants/route.ts`
- `app/api/restaurants/[id]/route.ts`
- `app/api/restaurants/[id]/ordering-status/route.ts`
- `app/api/admin/restaurants/[id]/route.ts`
- `hooks/useRestaurantDiscoveryQuery.ts`
- `hooks/useRestaurantDetailQuery.ts`
- `hooks/useRestaurantOrderingGate.ts`
- `libs/restaurantAvailability.ts`
- `libs/restaurantCapacity.ts`
- `libs/restaurantEta.ts`
- `libs/restaurantOrderingStatus.ts`
- `libs/courierReadiness.ts`
- `models/restaurant.ts`

Key rules:

- Public and superadmin restaurant filters should be server-authoritative before pagination.
- Restaurant busy/open/paused/closing/radius results should come from shared helpers, not
  duplicated UI-only checks.
- Public add-to-cart should prefetch/check ordering status before changing cart, while checkout
  remains the final gate.
- ETA copy should be based on saved restaurant estimates, kitchen load, and courier readiness.

Focused tests:

```bash
npm run test:file -- __tests__/api/restaurants-public.route.test.ts __tests__/api/admin-restaurants-detail.route.test.ts __tests__/api/restaurant-ordering-status.route.test.ts __tests__/libs/restaurantAvailability.test.ts __tests__/libs/restaurantCapacity.test.ts __tests__/libs/restaurantEta.test.ts __tests__/libs/restaurantOrderingStatus.test.ts __tests__/libs/courierReadiness.test.ts __tests__/hooks/useRestaurantDiscoveryQuery.test.ts __tests__/hooks/useRestaurantDetailQuery.test.ts __tests__/hooks/useRestaurantOrderingGate.test.ts
```

## Admin Restaurant, Menu Items, Inventory, And Operations

Read first:

- `app/admin-dashboard/restaurant/README.md`
- `app/admin-dashboard/menu-items/README.md`
- `app/admin-dashboard/operations/README.md`
- `app/admin-dashboard/order-queue/README.md`
- `app/api/menu-items/README.md`
- `app/api/restaurant/README.md`
- `app/api/restaurant/operations/README.md`
- `OPERATIONS_RUNBOOK.md` Inventory Reservation Checklist.

Main source files:

- `app/admin-dashboard/menu-items/MenuItems.tsx`
- `app/admin-dashboard/restaurant/`
- `app/admin-dashboard/operations/`
- `app/admin-dashboard/order-queue/`
- `app/api/menu-items/route.ts`
- `app/api/restaurant/route.ts`
- `app/api/restaurant/operations/route.ts`
- `app/api/orders/queue/route.ts`
- `libs/orderDeletionGuards.ts`
- `libs/restaurantOperations.ts`
- `libs/menuItemInventory.ts`
- `models/menuItem.ts`
- `models/restaurant.ts`
- `models/order.ts`

Key rules:

- Menu items can be made unavailable before destructive deletion.
- Menu item deletion and restaurant deletion must respect active-order guards.
- Inventory tracking is optional; untracked existing items should keep working.
- Admin inventory UI should show reserved stock clearly when unpaid checkout sessions hold items.
- Admin edits use `libs/menuItemEdit.ts`: expected edit version, intentional stock changes only,
  and atomic reservation guards. Read `app/admin-dashboard/menu-items/edit/[id]/README.md`
  and `app/api/upload/menu-items/README.md` before changing form saves or submit-only image uploads.
- Operations screens should summarize active stages, capacity, courier availability, today revenue,
  unpaid/canceled counts, and attention items without exposing customer-only details.

Focused tests:

```bash
npm run test:file -- __tests__/api/menu-items.route.test.ts __tests__/api/restaurant.route.test.ts __tests__/api/restaurant-operations.route.test.ts __tests__/api/order-queue.route.test.ts __tests__/libs/restaurantOperations.test.ts __tests__/libs/menuItemInventory.test.ts __tests__/libs/orderQuantityLimits.test.ts
npm run test:menu-items
```

If a listed test does not exist yet, use the closest existing route/helper test and add the missing
coverage when the change is high risk.

## Orders, Queue, Timeline, Reorder, And Notifications

Read first:

- `ARCHITECTURE.md` Order Lifecycle.
- `DESCRIPTION.md` order status logic.
- `app/my-orders/README.md`
- `app/my-orders/[id]/README.md`
- `app/admin-dashboard/orders/README.md`
- `app/admin-dashboard/orders/[id]/README.md`
- `app/admin-dashboard/order-queue/README.md`
- `app/api/my-orders/README.md`
- `app/api/orders/README.md`
- `app/api/orders/queue/README.md`

Main source files:

- `app/api/my-orders/route.ts`
- `app/api/my-orders/[id]/route.ts`
- `app/api/my-orders/active/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/orders/queue/route.ts`
- `components/shared/OrderActivityLog.tsx`
- `components/shared/OrderProgressStepper.tsx`
- `hooks/useOrderListQueries.ts`
- `libs/orderDelay.ts`
- `libs/orderCartSnapshot.ts`
- `hooks/useReorderCart.ts`
- `contexts/CartContext.tsx`
- `libs/notifications.ts`
- `models/order.ts`

Key rules:

- Customer payloads must not expose admin internal notes.
- Reorder must rebuild current menu data, skip unrecoverable lines, reject mixed restaurants, and share stock/per-item limits across sizes. All client entry points must await nonempty-cart replacement confirmation; usual-order previews must be rebuilt on click. See `app/my-orders/README.md` and `app/api/my-orders/reorder/README.md`.
- Active-order quick access should stay customer-only and run stale-order maintenance before
  returning data.
- Late-order warnings should compare elapsed active time against saved estimates plus grace time.

Focused tests:

```bash
npm run test:file -- __tests__/api/my-orders-active.route.test.ts __tests__/api/order-queue.route.test.ts __tests__/hooks/useOrderListQueries.test.ts __tests__/libs/orderDelay.test.ts __tests__/components/OrderActivityLog.test.ts __tests__/libs/notifications.test.ts
npm run test:file -- __tests__/libs/orderCartSnapshot.test.ts __tests__/components/ReorderCartSafety.test.tsx __tests__/components/UsualOrderReorder.test.tsx __tests__/api/orders-reviews-payment-link.route.test.ts
```

## Courier Availability, Assignment, Work Sessions, And Delivery

Read first:

- `README.md` Courier Features.
- `ARCHITECTURE.md` Delivery And Courier Flow.
- `OPERATIONS_RUNBOOK.md` Courier Operations.
- `app/courier-dashboard/README.md`
- `app/courier-dashboard/my-delivery/README.md`
- `app/courier-dashboard/my-deliveries/README.md`
- `app/api/my-delivery/courier/README.md`
- `app/api/my-deliveries/README.md`

Main source files:

- `app/api/my-delivery/courier/route.ts`
- `app/api/my-deliveries/route.ts`
- `app/api/courier-assignment/route.ts`
- `app/api/courier-location/route.ts`
- `libs/courierSchedule.ts`
- `libs/courierWorkSessions.ts`
- `libs/courierReadiness.ts`
- `libs/courierAssignmentTimeout.ts`
- `libs/courierAssignmentHistory.ts`
- `models/order.ts`
- `models/user.ts`

Key rules:

- Courier availability depends on role, schedule, active work session, locked break state, assigned
  order state, stale session cleanup, and timezone-aware reporting.
- Assignment timeout jobs should be idempotent.
- Courier location updates must remain role-checked and should not be accepted for unrelated users.
- Delivery is double-confirmed: courier PIN handoff first, then customer/admin completion.

Focused tests:

```bash
npm run test:file -- __tests__/api/my-delivery-courier.route.test.ts __tests__/api/my-deliveries.route.test.ts __tests__/api/courier-assignment.route.test.ts __tests__/api/courier-location.route.test.ts __tests__/libs/courierSchedule.test.ts __tests__/libs/courierWorkSessions.test.ts __tests__/libs/courierReadiness.test.ts __tests__/libs/courier-assignment-timeout.test.ts __tests__/libs/courier-assignment-history.test.ts
```

## Auth, Profile, Saved Addresses, And User Management

Read first:

- `README.md` Auth and Rate Limiting sections.
- `app/(auth)/README.md`
- `app/profile/README.md`
- `app/admin-dashboard/users/README.md`
- `app/api/register/README.md`
- `app/api/profile/README.md`
- `app/api/profile/delivery-addresses/README.md`
- `app/api/users/README.md`

Main source files:

- `libs/authOptions.ts`
- `libs/authEmails.tsx`
- `libs/rateLimit.ts`
- `libs/phone.ts`
- `libs/adminUserDeletion.ts`
- `app/api/register/route.ts`
- `app/api/profile/route.ts`
- `app/api/profile/delivery-addresses/route.ts`
- `app/api/users/route.ts`
- `models/user.ts`
- `components/resend/`

Key rules:

- Credentials auth, register, forgot password, and resend verification should remain rate-limited.
- Profile and checkout phone numbers should be normalized through `libs/phone.ts`.
- Saved addresses are capped at five and dedupe by normalized address/phone/coordinates.
- Superadmin user deletion must keep historical orders but clean dependent owned data and media when
  active-order guards allow it.

Focused tests:

```bash
npm run test:auth
npm run test:profile
npm run test:file -- __tests__/api/delivery-addresses.route.test.ts __tests__/api/users-delete.route.test.ts __tests__/api/users-role-guards.route.test.ts __tests__/libs/adminUserDeletion.test.ts __tests__/libs/phone.test.ts __tests__/libs/rateLimit.test.ts
```

## Support Tickets, Audit Logs, Messages, And Notifications

Read first:

- `app/admin-dashboard/support-tickets/README.md`
- `app/admin-dashboard/audit-logs/README.md`
- `app/messages/README.md`
- `app/notifications/README.md`
- `app/api/support-tickets/README.md`
- `app/api/audit-logs/README.md`
- `app/api/messages/README.md`
- `app/api/notifications/README.md`
- `OPERATIONS_RUNBOOK.md` Support, Audit Logs, And Admin Review.

Main source files:

- `app/api/support-tickets/route.ts`
- `app/api/audit-logs/route.ts`
- `app/api/messages/route.ts`
- `app/api/messages/stream/route.ts`
- `app/api/notifications/route.ts`
- `app/api/notifications/stream/route.ts`
- `libs/auditLog.ts`
- `libs/messages.ts`
- `libs/notifications.ts`
- `libs/realtimeClient.ts`
- `models/supportTicket.ts`
- `models/auditLog.ts`
- `models/message.ts`
- `models/notification.ts`

Key rules:

- Support tickets stay role-scoped between restaurant support and app support.
- Support ticket JSON must pass through the explicit response allowlist for GET, POST, and PATCH. Include `internalNote`/`resolvedBy` only for an administrator authorized to manage that ticket, using the same `canManageTicket` rule as PATCH authorization.
- `/my-reports` must request `scope=mine`: filter by the authenticated reporter ID for every role, always omit private handling fields, and keep status/ticket filters within that ownership constraint. The default management scope and PATCH permissions remain separate.
- Audit logs should record meaningful writes and blocked attempts, not every read.
- Messages stay approved and role-restricted; customer-to-customer chat remains blocked.
- SSE events should signal clients to refetch source-of-truth JSON endpoints.

Focused tests:

```bash
npm run test:realtime
npm run test:file -- __tests__/api/support-tickets.route.test.ts __tests__/api/audit-logs.route.test.ts __tests__/api/messages.route.test.ts __tests__/api/notifications.route.test.ts __tests__/libs/messages.test.ts __tests__/libs/notifications.test.ts __tests__/libs/realtimeClient.test.ts
```

## Loyalty, Coupons, Free Delivery, Reports, And Money

Read first:

- `app/loyalty/README.md`
- `app/admin-dashboard/coupons/README.md`
- `app/admin-dashboard/restaurant-reports/README.md`
- `app/api/loyalty/README.md`
- `app/api/coupons/README.md`
- `app/api/restaurant-reports/README.md`
- `README.md` Loyalty Ledger Maintenance.

Main source files:

- `libs/loyaltyCalculator.ts`
- `libs/loyaltyLedger.ts`
- `libs/coupon.ts`
- `libs/freeDelivery.ts`
- `libs/deliveryFeeCalculator.ts`
- `libs/money.ts`
- `libs/restaurantReports.ts`
- `app/api/loyalty/route.ts`
- `app/api/coupons/route.ts`
- `models/order.ts`
- `models/coupon.ts`
- `models/loyaltyLedgerEntry.ts`

Key rules:

- Money calculations should use `libs/money.ts` or existing money helpers, not raw floating-point
  arithmetic.
- Loyalty ledger rows should be idempotent and explainable.
- Free delivery can make customer delivery fee `$0` while preserving courier payout snapshots.
- Report PDFs should be disabled when the selected period has no activity.

Focused tests:

```bash
npm run test:file -- __tests__/api/loyalty.route.test.ts __tests__/api/coupons.route.test.ts __tests__/libs/loyaltyCalculator.test.ts __tests__/libs/loyaltyLedger.test.ts __tests__/libs/coupon.test.ts __tests__/libs/freeDelivery.test.ts __tests__/libs/deliveryFeeCalculator.test.ts __tests__/libs/money.test.ts __tests__/libs/restaurantReports.test.ts
```

## Media, Email, AI, Observability, And Root Config

Read first:

- `ROOT_CONFIGURATION_GUIDE.md`
- `OPERATIONS_RUNBOOK.md`
- `components/resend/README.md`
- `app/api/upload/README.md`
- `app/api/ai/README.md`
- Sentry config files near root.

Main source files:

- `libs/cloudinary.ts`
- `libs/sendPurchaseReceiptEmail.tsx`
- `libs/authEmails.tsx`
- `libs/aiMenuDescription.ts`
- `libs/rateLimit.ts`
- `instrumentation.ts`
- `instrumentation-client.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `app/global-error.tsx`
- `next.config.ts`
- `example.env`
- `package.json`

Key rules:

- Server secrets stay server-side.
- Cloudinary cleanup should prefer dry-run-first maintenance.
- Resend templates should not require real external email capture in tests.
- Sentry replay should stay production-only and sampled conservatively.
- Root config/package/env changes should update `ROOT_CONFIGURATION_GUIDE.md`, `example.env`,
  and `OPERATIONS_RUNBOOK.md` when the operational contract changes.

Focused tests:

```bash
npm run typecheck
npm run lint
npm run test:file -- __tests__/libs/cloudinary.test.ts __tests__/libs/cloudinaryCleanup.test.ts __tests__/api/sendPurchaseReceiptEmail.test.ts __tests__/api/ai-menu-item-description.route.test.ts __tests__/libs/rateLimit.test.ts
```

## Branch Handoff Checklist

Before saying a branch is ready:

1. Confirm the branch is not accidentally `main` unless the user explicitly wanted that.
2. Run focused tests for the changed workflow.
3. Run `npm run typecheck` for TypeScript/API/model changes.
4. Run `npm run lint` for meaningful code or docs instruction changes.
5. Run `git diff --check`.
6. Update relevant docs and folder README files.
7. Add the intended commit title to `documentation.txt`.
8. Summarize what changed, what was tested, and any known skipped validation.
