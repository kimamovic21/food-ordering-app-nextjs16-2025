# Testing Strategy (Next.js App)

This project uses Vitest for fast TypeScript tests.

It now has two test layers:

- Unit tests in `__tests__/` (mocked dependencies)
- E2E tests in `e2e/` (real test database)

## Why Start With Register/Login

Auth is a high-value and high-risk area. Testing register and login first gives confidence in:

- input validation
- duplicate-email protection
- password verification behavior
- user role assignment for first-user bootstrap

## Current Test Scope

- Unit-level behavior tests for:
  - `app/api/register/route.ts`
  - `app/api/profile/route.ts`
  - `app/api/profile/delivery-addresses/route.ts`
  - `app/api/my-orders/active/route.ts`
  - `app/api/restaurant/operations/route.ts`
  - `app/api/restaurants/[id]/ordering-status/route.ts`
  - `app/api/upload/users/route.ts`
  - `app/api/checkout/route.ts`
  - `app/api/webhook/route.ts`
  - `libs/stripeCheckoutSession.ts`
  - `app/api/admin/order-maintenance/recovery/route.ts`
  - `app/api/coupons/route.ts`
  - `app/api/my-deliveries/route.ts`
  - credentials `authorize` handler in `libs/authOptions.ts`
  - restaurant availability helpers in `libs/restaurantAvailability.ts`
  - restaurant capacity, load-adjusted ETA, and capacity-aware ordering-status helpers in `libs/restaurantCapacity.ts`, `libs/restaurantEta.ts`, and `libs/restaurantOrderingStatus.ts`
  - menu item inventory helpers in `libs/menuItemInventory.ts`
  - server-side menu item inventory reservation/capture/release helpers in `libs/menuItemInventoryServer.ts`
  - superadmin stale order recovery orchestration in `libs/orderMaintenanceRecovery.ts`
  - order quantity limit helpers in `libs/orderQuantityLimits.ts`
  - order capacity backfill helper behavior in `libs/orderCapacityBackfill.ts`
  - restaurant operations overview summaries in `libs/restaurantOperations.ts`
  - notification copy/routing helpers in `libs/notifications.ts`
  - order delay warning helper behavior in `libs/orderDelay.ts`
  - order activity log event ordering/status behavior in `components/shared/OrderActivityLog.tsx`
  - Upstash Redis rate-limit helper behavior in `libs/rateLimit.ts`
  - shared date-fns formatting helpers in `libs/dateFormat.ts`
  - TanStack Query provider, shared query keys, profile hook cache behavior, sound settings cache/mutation behavior, and message center query rendering
  - restaurant ordering-status prefetch caching for faster first add-to-cart clicks
- E2E tests for:
  - register + login flow
  - profile management flow (info update, image upload/remove, account deletion)
  - checkout & payment flow (order creation, coupon application, payment webhook)

Recent high-priority coverage also checks best coupon suggestion rules, restaurant closed/busy/minimum/radius/cart-quantity validation helpers, checkout quantity-limit blockers, menu item sold-out/stock-limit blockers, temporary checkout stock reservations, direct server reservation rollback/release/capture helpers, webhook inventory reservation capture/direct decrement/refund-review behavior, inventory alert notifications/routing, free delivery threshold pricing with preserved courier payout, per-item cart note persistence, kitchen order queue item-note payloads, checkout blocked-attempt audit logs and reason filters, pre-cart ordering status checks, saved delivery address duplicate matching, active customer order lookup, smart partial reorder recovery, restaurant operations overview summaries, internal admin order notes staying out of customer payloads, ETA-style notification copy, unpaid payment-expiry countdowns, order activity events, order delay warnings, courier delivery summaries, delete protection for active restaurant/menu orders, Redis rate-limit helper behavior, Stripe Checkout session expiration for stale unpaid/customer-canceled orders, superadmin stale-order recovery, and app date formatting helpers.

## Folder Layout

- `__tests__/`: all test files by domain
- `mocks/`: reusable mock fixtures and sample payloads
- `e2e/`: real-flow tests against the test database

## Best Practices For This Repository

- Add tests for critical flows first (auth, checkout, webhooks).
- Keep mocks realistic, but minimal.
- Use stable data fixtures from `mocks/` to avoid repetition.
- Test success and failure paths for each route/handler.
- Avoid brittle UI snapshots for server business logic.
- Keep tests deterministic and fast.
- When test commands, fixtures, coverage priorities, or e2e setup change, update this file together with `__tests__/README.md` and `e2e/README.md` as needed.
- For feature work, mention whether tests were added, updated, or intentionally skipped in the final task summary.

## Commands

### Choose The Scope First

The total printed by `npm run test` describes the entire unit/component/integration suite, not
the tests introduced by one feature. Keep the full suite; do not delete tests or impose a fixed
50/100-test cap to make a local run smaller.

- During local work, start with the relevant feature command or `npm run test:file -- <path>...`.
- For menu item forms, edit conflicts, availability, inventory, and save-time image behavior,
  use `npm run test:menu-items`. It selects eleven related test files, mocks Cloudinary calls,
  and uses an isolated MongoDB instance for database race tests. No real images are uploaded/deleted.
- Expand the scope when shared behavior changes. Checkout/payment/inventory integration changes
  also need the relevant cart, checkout, webhook, cancellation and e2e tests in the workflows below.
- Agents must obtain the user's explicit request or approval before running the full unit or e2e
  suite, including pre-merge checks. Default to focused tests and concise output to conserve the
  user's session budget. Explain any proposed wider coverage. Focused e2e tests use a dedicated test database.
- Report the command and actual result. A passing focused run does not mean the entire app was tested.

Courier tracking changes use `npm run test:courier-tracking -- --reporter=dot`. It selects four
files covering order/customer/restaurant authorization, terminal and stale assignments, coordinate
validation/freshness, cancellable queries, session changes, retry states, and map rendering.
These tests mock the database and external map services; they do not change real orders or locations.
Assignment writes, PIN handoff, work sessions and availability were not changed by this read-side
workflow; include their own focused tests if those behaviors are modified later.

Support-ticket privacy changes should be checked at the JSON boundary, not only in the UI. Run
`npm run test:file -- __tests__/api/support-tickets.route.test.ts` for role-based field filtering,
admin-as-customer creation, personal scope for all roles, cache headers, and authorization tests. Run `npm run test:e2e:support`
against the dedicated test database to verify that persisted private notes stay available to the
authorized admin but are absent from personal responses. The database suite also checks admin buyers,
app-support reports tied to the reporter's own restaurant, and historical reads with deleted references.

- `npm run test`: run all tests once
- `npm run typecheck`: run TypeScript plus Next generated route/page type checks
- `npm run test:watch`: run in watch mode
- `npm run test:file -- <path>`: run only one file
- `npm run test:api`: run API route tests
- `npm run test:auth`: run only auth-focused tests
- `npm run test:components`: run component tests
- `npm run test:libs`: run library/helper tests
- `npm run test:models`: run model tests
- `npm run test:menu-items`: run focused menu item API, form, availability, image-save, model, and inventory tests
- `npm run test:courier-tracking`: run only the courier-location API, freshness helper, query hook, and map tests
- `npm run test:editor-types`: validate the editor-only test TypeScript project used for Vitest globals and `@/` path aliases in `__tests__`
- `npm run test:profile`: run only profile-focused unit tests
- `npm run test:payment`: run only payment & webhook unit tests, including Stripe Checkout session expiration
- `npm run test:e2e`: run all e2e tests
- `npm run test:e2e:watch`: run e2e tests in watch mode
- `npm run test:e2e:file -- <path>`: run one e2e file
- `npm run test:e2e:admin`: run admin e2e tests
- `npm run test:e2e:auth`: run auth e2e tests
- `npm run test:e2e:courier`: run courier e2e tests
- `npm run test:e2e:favorites`: run favorites e2e tests
- `npm run test:e2e:messages`: run messages e2e tests
- `npm run test:e2e:profile`: run only profile-focused e2e tests
- `npm run test:e2e:checkout`: run only checkout & payment e2e tests
- `npm run test:all`: run unit + e2e tests

The unit test config runs with one Vitest worker on purpose. Many API route tests mock shared
Next.js, MongoDB, Stripe, and Mongoose modules; keeping the full suite serial avoids Windows/local
parallelism flakes where route imports can time out or consume mock state in surprising order.
Use focused commands such as `npm run test:file -- ...` for faster iteration while developing a
single feature.

Useful focused command after recent order-flow changes:

```bash
npm run test:file -- __tests__/api/coupons.route.test.ts __tests__/api/my-deliveries.route.test.ts __tests__/libs/restaurantAvailability.test.ts __tests__/libs/notifications.test.ts
```

Useful focused command after customer order UX/safety changes:

```bash
npm run test:file -- __tests__/api/orders-reviews-payment-link.route.test.ts __tests__/libs/orderDelay.test.ts __tests__/api/delivery-addresses.route.test.ts __tests__/api/my-orders-active.route.test.ts __tests__/api/restaurant-ordering-status.route.test.ts __tests__/api/menu-items.route.test.ts __tests__/api/restaurant.route.test.ts __tests__/api/profile.route.test.ts
```

Useful focused command after restaurant operations and cart/order UX changes:

```bash
npm run test:file -- __tests__/libs/restaurantOperations.test.ts __tests__/api/restaurant-operations.route.test.ts __tests__/libs/queryKeys.test.ts __tests__/libs/deliveryAddresses.test.ts __tests__/libs/paymentExpiry.test.ts __tests__/api/delivery-addresses.route.test.ts
```

Useful focused command after order quantity-limit changes:

```bash
npm run test:file -- __tests__/libs/orderQuantityLimits.test.ts __tests__/api/cart-validate.route.test.ts __tests__/api/checkout.route.test.ts __tests__/models/menuItem.model.test.ts __tests__/models/restaurant.model.test.ts
```

Useful focused command after menu item inventory/sold-out changes:

```bash
npm run test:file -- __tests__/libs/menuItemInventory.test.ts __tests__/libs/orderQuantityLimits.test.ts __tests__/libs/cartValidation.test.ts __tests__/models/menuItem.model.test.ts __tests__/api/menu-items.route.test.ts __tests__/api/checkout.route.test.ts __tests__/api/webhook.route.test.ts
```

Useful focused command after checkout inventory reservation changes:

```bash
npm run test:file -- __tests__/libs/menuItemInventory.test.ts __tests__/libs/cartValidation.test.ts __tests__/api/checkout.route.test.ts __tests__/api/webhook.route.test.ts __tests__/libs/order-auto-cancellation.test.ts __tests__/models/menuItem.model.test.ts
npm run test:file -- __tests__/libs/menuItemInventoryServer.test.ts
```

Useful focused command after stale order maintenance recovery changes:

```bash
npm run test:file -- __tests__/libs/orderMaintenanceRecovery.test.ts __tests__/api/admin-order-maintenance-recovery.route.test.ts __tests__/libs/order-auto-cancellation.test.ts __tests__/api/qstash-order-maintenance.route.test.ts
```

Useful focused command after inventory alert/notification changes:

```bash
npm run test:file -- __tests__/api/webhook.route.test.ts __tests__/api/webhook.receipt-idempotency.test.ts __tests__/libs/notifications.test.ts __tests__/libs/notificationClient.test.ts __tests__/components/AdminMenuItemsTable.test.tsx
```

Useful focused command after shared cart/checkout validation or order-index changes:

```bash
npm run test:file -- __tests__/libs/cartValidation.test.ts __tests__/libs/freeDelivery.test.ts __tests__/api/cart-validate.route.test.ts __tests__/api/checkout.route.test.ts __tests__/models/order.model.test.ts
```

Useful focused command after restaurant ordering capacity/status changes:

```bash
npm run test:file -- __tests__/libs/restaurantCapacity.test.ts __tests__/libs/restaurantEta.test.ts __tests__/libs/restaurantOrderingStatus.test.ts __tests__/libs/cartValidation.test.ts __tests__/api/restaurant-ordering-status.route.test.ts __tests__/api/restaurant.route.test.ts __tests__/api/cart-validate.route.test.ts __tests__/api/checkout.route.test.ts
```

Useful focused command after checkout capacity/audit maintenance changes:

```bash
npm run test:file -- __tests__/libs/orderCapacityBackfill.test.ts __tests__/api/checkout.route.test.ts __tests__/api/profile-change-password.route.test.ts
npm run test:e2e:file -- e2e/checkout/checkout-order-quantity-limits.e2e.test.ts
```

Useful focused command after rate-limit changes:

```bash
npm run test:file -- __tests__/libs/rateLimit.test.ts __tests__/auth/credentials-authorize.test.ts __tests__/api/register.route.test.ts __tests__/api/forgot-password.route.test.ts __tests__/api/support-tickets.route.test.ts __tests__/api/checkout.route.test.ts __tests__/api/ai-menu-item-description.route.test.ts
```

Useful focused command after date-format changes:

```bash
npm run test:file -- __tests__/libs/dateFormat.test.ts __tests__/libs/restaurantAvailability.test.ts
```

## Environment Variables

In local development, add this to `.env.local`:

- `MONGODB_URL_TESTS=mongodb://localhost:27017/[your-database-name]`

Test setup will use:

1. `MONGODB_URL` if already set
2. otherwise `MONGODB_URL_TESTS` (required; no fallback)

## Test Editor TypeScript Project

`__tests__/tsconfig.json` exists for VS Code and TypeScript language-service support inside test
files. The main app `tsconfig.json` intentionally excludes `__tests__`, so without this nested
config the editor can lose `@/` path aliases and Vitest globals such as `vi`, `describe`, `it`, and
`expect`.

This config is not a replacement for production type checking. Use `npm run typecheck` for the app
and `npm run test` or focused `npm run test:file -- ...` commands for behavior. Use
`npm run test:editor-types` when test files show editor-only module/global diagnostics.

## E2E Notes

- E2E tests use real MongoDB data and perform cleanup of test-created users.
- Keep e2e coverage focused on high-risk user journeys.
- For order-flow work, prioritize tests around checkout validation, reorder validation, coupon selection, restaurant availability, delivery status changes, support ticket permissions, and courier route summaries.
- Detailed e2e guide: `e2e/README.md`.

### New Auth E2E Coverage

- We added comprehensive e2e coverage for the email verification and password reset flows under `e2e/auth/`:
  - `e2e/auth/register-login.e2e.test.ts` — register + login (now verifies email before allowing credentials login in tests).
  - `e2e/auth/verify-email.e2e.test.ts` — covers registration with verification required, prevent login when unverified, verify flow, resend verification, invalid/expired token cases.
  - `e2e/auth/forgot-password.e2e.test.ts` — covers forgot-password, reset-password, OAuth-excluded behavior, token expiry, confirmation matching, and full flow (register → verify → forgot → reset → login).

Run these tests with:

```bash
npm run test:e2e -- e2e/auth/
```

Notes:

- Ensure `MONGODB_URL_TESTS` is set in `.env.local` before running e2e tests.
- The tests perform direct DB updates in places where tokens are hashed and cannot be retrieved from email in the test environment (this keeps tests stable without relying on third-party email capture).
