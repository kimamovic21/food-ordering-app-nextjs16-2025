# Operations Runbook

Use this file when the production app behaves differently than local development, when a
deployment fails, or when a checkout, courier, email, upload, or background job flow needs a
quick operational checklist.

This runbook complements:

- `ROOT_CONFIGURATION_GUIDE.md` for root config and package ownership.
- `FEATURE_WORKFLOW_INDEX.md` for feature-area source/test routing before implementation.
- `TESTING.md` for validation commands.
- `ARCHITECTURE.md` for deeper system diagrams and data flow.
- `PROJECT_PRESENTATION_GUIDE.md` for presentation-friendly feature explanations.

## First Checks

Before changing code, verify the current state:

1. Open `/admin-dashboard/system-health` as the super admin.
2. Confirm required environment variables are present for the environment being tested.
3. Review the Order Maintenance Recovery panel if unpaid orders, inventory reservations, courier assignments, or ready orders look stuck.
4. Check the latest Vercel deployment logs for install, build, type, or runtime errors.
5. Check Sentry for recent server/client exceptions and source-map quality.
6. Reproduce locally with `npm run dev` and the same user role if the issue is UI-facing.
7. Run a focused test command from `TESTING.md` before broad validation.

## Environment Groups

Keep production, preview, and local values aligned by feature area.

- Database: `MONGODB_URL`, `MONGODB_URL_TESTS`.
- Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google OAuth keys.
- Super admin: `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` and server-side `SUPER_ADMIN_EMAIL` when used.
- App URL: `NEXT_PUBLIC_APP_URL` or `NEXTAUTH_URL` must be public HTTPS in production so emails,
  Stripe redirects, and QStash callbacks resolve correctly.
- Payments: `STRIPE_PK`, `STRIPE_SK`, `STRIPE_WEBHOOK_SECRET`.
- Background jobs: `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`,
  `QSTASH_NEXT_SIGNING_KEY`.
- Email: `RESEND_API_KEY`, `SENDER_EMAIL`, optional `RESEND_RECEIVER_EMAIL`.
- Media: Cloudinary cloud name, key, and secret.
- Cache/rate limit: Upstash Redis REST URL and token.
- Observability: Sentry DSN and auth token for source maps.
- AI: OpenAI API key for assisted menu item descriptions.

If a feature works locally but not on Vercel, the most common reason is that an env var exists only
in Production and not Preview, or exists locally but not in Vercel.

## Deployment Checklist

Use this after dependency, Next.js, env, or root-config changes:

1. `npm install` after package changes so `package-lock.json` is regenerated.
2. `npm run typecheck`
3. `npm run lint`
4. A focused test command from `TESTING.md`.
5. `npm run build` when the change touches Next config, server components, route handlers, Sentry,
   or package versions.
6. Verify the Vercel deployment uses the expected branch and commit.
7. After deployment, open `/admin-dashboard/system-health` and refresh it.

## Checkout And Stripe Incidents

Checkout is server-authoritative. The browser can warn early, but `/api/checkout` and the Stripe
webhook decide what can actually happen.

Check these areas when a customer cannot pay or an order behaves unexpectedly:

- `app/api/cart/validate/route.ts` and `libs/cartValidation.ts` for preflight blockers.
- `app/api/checkout/route.ts` for final restaurant, delivery, coupon, loyalty, quantity,
  capacity, courier-readiness, active-order, and inventory reservation checks.
- `libs/stripeCheckoutSession.ts` for session reuse, recovery, and expiration.
- `app/api/webhook/route.ts` for payment confirmation, idempotency, inventory capture, receipt
  email, notifications, and refund-review fallback.
- `libs/orderAutoCancellation.ts` for stale unpaid order cleanup.
- `app/api/qstash/order-maintenance/route.ts` for delayed QStash callbacks.
- `app/api/admin/order-maintenance/recovery/route.ts` and `libs/orderMaintenanceRecovery.ts` for superadmin dry-run/apply recovery when stale states remain after background jobs should have handled them.

Useful focused command:

```bash
npm run test:payment
```

## Inventory Reservation Checklist

Tracked menu item stock has two separate numbers:

- `stockQuantity`: physical/admin stock.
- `reservedStockQuantity`: stock held by unpaid Stripe Checkout sessions.

The customer-facing available stock is `stockQuantity - reservedStockQuantity`.

Expected flow:

1. Checkout validates cart and restaurant state.
2. `/api/checkout` reserves tracked stock for the unpaid payment window.
3. The unpaid order stores `inventoryReservationStatus`, expiration, and reserved items.
4. Stripe payment confirmation captures the reservation by decrementing both physical and reserved
   stock.
5. Stale unpaid auto-cancel or customer unpaid cancel releases reserved stock.
6. If payment succeeds but inventory can no longer be captured, the order is canceled and marked
   for refund review instead of silently overselling.
7. If an unpaid order reservation stays expired because a delayed job failed, use the System Health
   Order Maintenance Recovery panel to dry-run affected orders, then apply recovery only after review.

Check these files when debugging inventory behavior:

- `libs/menuItemInventory.ts`
- `libs/menuItemInventoryServer.ts`
- `libs/cartValidation.ts`
- `app/api/checkout/route.ts`
- `app/api/webhook/route.ts`
- `libs/orderAutoCancellation.ts`
- `models/menuItem.ts`
- `models/order.ts`

Useful focused command:

```bash
npm run test:file -- __tests__/libs/menuItemInventoryServer.test.ts __tests__/libs/menuItemInventory.test.ts __tests__/libs/cartValidation.test.ts __tests__/api/checkout.route.test.ts __tests__/api/webhook.route.test.ts __tests__/libs/order-auto-cancellation.test.ts __tests__/models/menuItem.model.test.ts
```

## QStash And Background Jobs

QStash is used for delayed checks that should happen even if nobody refreshes a page later.

- Checkout schedules unpaid order maintenance.
- Courier assignment schedules assignment timeout maintenance.
- Ready orders can schedule ready-without-courier maintenance.

Expected safety behavior:

- Missing QStash env vars should not block checkout or order updates.
- Signed callback verification protects `/api/qstash/order-maintenance`.
- A stale job reloads the order from MongoDB before changing anything.
- Jobs should be idempotent: running twice should not double-cancel, double-release inventory, or
  double-expire a courier assignment.
- If delayed jobs were skipped, blocked by env/app URL issues, or failed transiently, open
  `/admin-dashboard/system-health` and use the Order Maintenance Recovery panel. The panel first
  shows a dry-run snapshot, then POSTs to the superadmin API only after confirmation.
- Manual recovery reuses the existing idempotent helpers for courier assignment timeouts, order
  auto-cancellation, and inventory reservation release. It writes a summary audit log instead of
  silently mutating orders.

Useful focused command:

```bash
npm run test:qstash
npm run test:file -- __tests__/libs/orderMaintenanceRecovery.test.ts __tests__/api/admin-order-maintenance-recovery.route.test.ts
```

## Email And Auth Incidents

If verification, password reset, or purchase receipt emails fail:

- Check `RESEND_API_KEY`, `SENDER_EMAIL`, and optional `RESEND_RECEIVER_EMAIL`.
- Check `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL`; email links need the correct public base URL.
- Check `components/resend/` templates and `libs/authEmails.tsx`.
- Check rate limits if repeated test submissions suddenly stop working.

Useful focused commands:

```bash
npm run test:auth
npm run test:file -- __tests__/api/forgot-password.route.test.ts __tests__/api/reset-password.route.test.ts __tests__/api/sendPurchaseReceiptEmail.test.ts
```

## Cloudinary Media Maintenance

Cloudinary stores user avatars, restaurant images, category images, and menu item images.

- Menu item uploads use separate development/production folders.
- Deleting users/restaurants/menu items should delete owned Cloudinary assets where the workflow is
  designed to clean them up.
- The menu item cleanup script can detect orphaned Cloudinary menu item images.
- Menu-item forms only preview selected images locally. Save/Update submits the file and item data
  to `/api/menu-items` together; standalone `/api/upload/menu-items` returns 410 with reload guidance.
- The server validates before upload, cleans replaced images after a successful save, and attempts
  cleanup of failed-save uploads only after checking that no item references them. It only deletes
  from the configured cloud and current environment's menu folder. Cleanup failures are logged.
- A server termination or unavailable database/Cloudinary cleanup can still leave an orphan. Run
  the audit only after reviewing its results and avoiding in-flight saves. There is no persistent
  pending-upload registry. Never delete based only on a browser error: the save may have committed.

Dry run first:

```bash
npm run cloudinary:menu-items:audit
```

Apply only after reviewing output:

```bash
npm run cloudinary:menu-items:cleanup
```

## Courier Operations

Courier availability depends on role, schedule, active work session, locked breaks, stale session
cleanup, assigned order state, and local Sarajevo-time reporting.

Check these files first:

- `app/api/my-delivery/availability/route.ts`
- `app/api/my-delivery/orders/route.ts`
- `app/api/orders/courier-location/route.ts`
- `libs/courierSchedule.ts`
- `libs/courierWorkSessions.ts`
- `libs/courierReadiness.ts`
- `libs/courierAssignmentTimeout.ts`
- `app/courier-dashboard/my-delivery/`

Useful focused command:

```bash
npm run test:file -- __tests__/api/my-delivery-courier.route.test.ts __tests__/libs/courierSchedule.test.ts __tests__/libs/courierWorkSessions.test.ts __tests__/libs/courierReadiness.test.ts __tests__/libs/courier-assignment-timeout.test.ts
```

For tracking-map issues, run only `npm run test:courier-tracking`. Check the current order's
status, accepted assignment, courier `takenOrder`, and `lastLocationUpdate`. A pending assignment,
handoff, completed/canceled order, or unrelated restaurant admin must not receive current coordinates.
An old reading remains explicitly stale; HTTP/network failures do not imply that the courier moved.
The waiting state after acceptance can be resolved by the courier's next normal location update.
Do not bypass the API guard or modify historical orders to make a map pin appear.

## Support, Audit Logs, And Admin Review

Operational review happens mainly through:

- `/admin-dashboard/support-tickets`
- `/admin-dashboard/audit-logs`
- `/admin-dashboard/operations`
- `/admin-dashboard/system-health`

Audit logs should explain important admin/system actions without storing unnecessary secrets or noisy
view-only events. For new operational workflows, log meaningful writes and blocked attempts, not
every page read.

For order maintenance recovery, start with the System Health dry-run snapshot, check the candidate
types, then run recovery only when the stale state is real. After running, review audit logs for
`order_maintenance.recovery_run` and any order-level cancellation or courier-assignment entries.

## Documentation Maintenance

When a production workflow changes, update the closest docs in the same branch:

- Feature overview: `README.md`, `DESCRIPTION.md`, `PROJECT_PRESENTATION_GUIDE.md`.
- System/data flow: `ARCHITECTURE.md`.
- Test strategy and commands: `TESTING.md`, `__tests__/README.md`, `e2e/README.md`.
- Route/folder behavior: nearest `app/**/README.md` or `app/api/**/README.md`.
- Root tooling/env behavior: `ROOT_CONFIGURATION_GUIDE.md`.
- Operational response and troubleshooting: this `OPERATIONS_RUNBOOK.md`.
- Commit title log: `documentation.txt`.
