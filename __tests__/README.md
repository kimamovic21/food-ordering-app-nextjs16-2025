# Test Suite Guide

This folder contains unit tests grouped by feature area.

## Current Coverage

- `api/support-tickets.route.test.ts`: validates reporter/admin scoping, private-note and resolver-identity omission, response field allowlisting, spoofed access claims, personal scope for every role, admin-as-customer and admin app-support creation, private cache headers, and authorized note updates/notifications.
- `auth/credentials-authorize.test.ts`: validates credentials authorization behavior.
- `api/register.route.test.ts`: validates registration rules and role assignment.
- `api/verify-email.route.test.ts`: validates verification-token route behavior.
- `api/forgot-password.route.test.ts`: validates forgot-password route behavior.
- `api/reset-password.route.test.ts`: validates reset-password route behavior.
- `api/profile.route.test.ts`: validates profile fetch/update/delete behavior.
- `api/delivery-addresses.route.test.ts`: validates saved delivery address CRUD, duplicate reuse, defaults, label-only updates, limits, and location requirements.
- `api/my-orders-active.route.test.ts`: validates active customer order lookup and stale-order cancellation filtering.
- `api/restaurant-ordering-status.route.test.ts`: validates public restaurant ordering status and active capacity responses.
- `api/profile-change-password.route.test.ts`: validates password change API behavior.
- `api/upload-users.route.test.ts`: validates profile image upload/remove behavior.
- `api/checkout.route.test.ts`: validates checkout guardrails, quantity-limit and tracked-stock blockers, temporary inventory reservation, free delivery threshold pricing with preserved courier payout, per-item cart note persistence, and failure handling.
- `api/orders-reviews-payment-link.route.test.ts`: validates customer order mutations, payment-link recovery, reviews, quick reorder, smart partial reorder recovery, and reorder audit metadata.
- `libs/orderCartSnapshot.test.ts`: checks shared quantity/stock allocation across sizes, reserved stock, legacy defaults, deterministic recovery, and accurate final adjustment metadata.
- `components/ReorderCartSafety.test.tsx`: uses the real cart provider/dialog and reorder hook to check confirmation, cancel/Escape, malformed responses, request cancellation, concurrent clicks, and quick reorder.
- `components/UsualOrderReorder.test.tsx`: verifies the usual-order page requests a fresh rebuild instead of applying cached cart items.
- `api/order-queue.route.test.ts`: validates restaurant queue access, courier timeout handling, and kitchen item-note payload normalization.
- `api/cart-validate.route.test.ts`: validates cart item revalidation plus restaurant minimum, busy, delivery-radius, and quantity-limit preflight blockers.
- `api/courier-assignment.route.test.ts`: validates courier assignment guardrails, courier-only assignment notes, and assignable courier schedule/status checks.
- `api/courier-earnings.route.test.ts`: validates courier earnings access, summaries, assignment reliability metrics, and work-summary response shape.
- `api/my-delivery-courier.route.test.ts`: validates courier availability, locked break guards, schedule updates, location updates, active delivery actions, pickup, failed-delivery requests, and delivery PIN handoff.
- `api/my-deliveries.route.test.ts`: validates courier delivery history, performance summaries, and assignment reliability metrics.
- `api/realtime-streams.route.test.ts`: validates authenticated SSE streams for messages and notifications.
- `api/restaurant.route.test.ts`: validates restaurant settings, ownership, and deletion behavior.
- `api/restaurants-public.route.test.ts`: validates public restaurant discovery search, filters, sorting, distance ordering, and pagination.
- `api/admin-restaurants-detail.route.test.ts`: validates superadmin-only restaurant detail access and operational summaries.
- `api/restaurant-operations.route.test.ts`: validates restaurant operations overview API summaries and admin restaurant scoping.
- `api/webhook.route.test.ts`: validates webhook signature/idempotency behavior, tracked-stock reservation capture/direct decrementing, low-stock inventory alert side effects, and refund-review fallback when paid inventory disappears before webhook confirmation.
- `api/admin-order-maintenance-recovery.route.test.ts`: validates superadmin-only order maintenance recovery dry-run/apply access and audit actor forwarding.
- `api/payment.test.ts`: validates payment-related helper logic and utility contracts.
- `libs/courier-assignment-timeout.test.ts`: validates stale pending courier assignment expiry and courier release rules.
- `libs/courier-assignment-history.test.ts`: validates finalized courier assignment attempt history.
- `libs/courierSchedule.test.ts`: validates Sarajevo-time courier schedule checks, report boundary helpers, and next-shift unavailable messages.
- `libs/courierWorkSessions.test.ts`: validates stale courier work-session cleanup and Sarajevo-local work summaries.
- `libs/order-auto-cancellation.test.ts`: validates stale unpaid and ready-without-courier auto-cancel rules.
- `libs/orderMaintenanceRecovery.test.ts`: validates stale order maintenance dry-run candidates, idempotent helper orchestration, audit summaries, and expired unpaid reservation release fallback.
- `libs/paymentExpiry.test.ts`: validates the customer-facing unpaid payment countdown helper.
- `libs/restaurantCapacity.test.ts`: validates shared active kitchen capacity normalization and near-capacity snapshot behavior.
- `libs/restaurantEta.test.ts`: validates load-adjusted restaurant preparation/delivery estimates and customer-facing busy timing messages.
- `libs/restaurantOrderingStatus.test.ts`: validates capacity-aware ordering status, busy copy, active-order counting, and cart validation status mapping.
- `libs/menuItemInventory.test.ts`: validates optional menu item stock tracking defaults, normalization, checkout-reserved stock math, low-stock status, and sold-out status.
- `libs/menuItemInventoryServer.test.ts`: validates server-side checkout stock reservation, atomic rollback, reservation release, paid reservation capture, and legacy paid adjustment protection when existing reservations consume stock.
- `libs/notificationClient.test.ts`: validates role-aware notification routing, including inventory alerts to the admin menu-items table.
- `libs/notifications.test.ts`: validates notification creation helpers, including inventory alerts for restaurant admins.
- `libs/orderQuantityLimits.test.ts`: validates shared per-item, per-order, and tracked-stock quantity helpers used by cart UI and checkout APIs.
- `libs/freeDelivery.test.ts`: validates customer free-delivery threshold calculations, disabled thresholds, remaining-to-free-delivery copy, and courier payout preservation.
- `libs/orderCapacityBackfill.test.ts`: validates server-side maintenance helpers for backfilling restaurant/menu item quantity-limit fields.
- `libs/authGuards.test.ts`: validates shared server-side admin and super-admin guard behavior.
- `libs/deliveryAddresses.test.ts`: validates saved delivery address normalization, blank-label fallback, and duplicate matching.
- `libs/orderDelay.test.ts`: validates active order delay warning thresholds and development time offsets.
- `libs/restaurantOperations.test.ts`: validates operations overview stage counts, capacity, courier summary, revenue, and attention-order prioritization.
- `components/OrderActivityLog.test.ts`: validates customer/admin order activity event status and cancellation behavior.
- `hooks/useOrderListQueries.test.ts`: validates shared order-list fetchers, queue normalization, and status-aware query errors.
- `hooks/useRestaurantDetailQuery.test.ts`: validates public restaurant detail response normalization and status-aware fetch errors.
- `hooks/useRestaurantDiscoveryQuery.test.ts`: validates public restaurant discovery query params, response normalization, and status-aware fetch errors.
- `hooks/useRestaurantMenuQueries.test.ts`: validates public restaurant menu query params, category/summary/result normalization, and status-aware fetch errors.
- `hooks/useRestaurantOrderingGate.test.ts`: validates restaurant ordering-status prefetch caching for visible menu items.
- `libs/realtimeClient.test.ts`: validates client-side realtime payload helpers.

## Structure Rules

- Keep test files close to business domain in nested folders.
- Name test files with `*.test.ts`.
- Put reusable input fixtures in the root `mocks/` folder.
- Use `utils/testFactories.ts` for generated fake users, restaurants, and orders.
- Use `utils/mongoMemoryServer.ts` when a test needs an isolated in-memory MongoDB instance.
- Focus on behavior contracts, not implementation details.
- Update this README when new unit-test domains, helper utilities, or focused test commands are added.
- Keep this file aligned with `TESTING.md` and `e2e/README.md` when the test strategy changes.

## Running Tests

- Run all tests: `npm run test`
- Watch mode: `npm run test:watch`
- Run a single test file: `npm run test:file -- __tests__/api/register.route.test.ts`
- Run profile unit tests: `npm run test:profile`
- Run menu item edit/form/image-save/availability/inventory tests: `npm run test:menu-items`
- Run courier tracking privacy/freshness/query/map tests: `npm run test:courier-tracking`
- Run payment/webhook-focused unit tests: `npm run test:payment`
- Run realtime/SSE tests: `npm run test:realtime`
- Run stale order recovery tests: `npm run test:file -- __tests__/libs/orderMaintenanceRecovery.test.ts __tests__/api/admin-order-maintenance-recovery.route.test.ts`
- Validate test editor TypeScript config: `npm run test:editor-types`

The default unit suite intentionally uses a single Vitest worker through `vitest.config.ts`. This
keeps the full run stable for route tests that mock shared framework and database modules. For day
to day work, prefer the focused commands above because they are much faster than the complete
serial suite.

Choose tests by the affected workflow, not by an arbitrary maximum count. The menu-items command
selects eleven files rather than the whole app. It includes mocked image-service calls and isolated
database tests; it does not manipulate real Cloudinary assets. Add checkout/webhook/cart tests when
those contracts change. Agents must obtain the user's explicit request or approval before running
the full unit or e2e suite, including pre-merge verification; use focused tests and concise output by default.

Courier tracking has four focused files: `api/courier-location.route.test.ts`,
`libs/courierTracking.test.ts`, `hooks/useCourierTracking.test.tsx`, and
`components/OrderMap.test.tsx`. They cover authorization before location reads, terminal/reassigned
orders, old readings, cache identity, canceled requests, connectivity failures and accessible map
states. The hook tests use fake clocks; map tests mock Leaflet, so a browser smoke check remains useful.

## Editor TypeScript Support

`__tests__/tsconfig.json` is intentionally scoped to tests so VS Code can resolve `@/` imports and
Vitest globals in `*.test.ts` and `*.test.tsx` files. The root `tsconfig.json` excludes tests because
the main Next.js typecheck should stay focused on app/source files.

If test files show editor-only errors such as `Cannot find name 'vi'` or `Cannot find module '@/...'`,
run `npm run test:editor-types`, then restart the TypeScript server in VS Code.

## E2E Tests

- End-to-end style tests are kept in `e2e/`.
- See `e2e/README.md` for e2e commands and behavior.

## Environment

- Tests use `MONGODB_URL_TESTS` when available.
- If missing, setup falls back to the local default test DB URL.
