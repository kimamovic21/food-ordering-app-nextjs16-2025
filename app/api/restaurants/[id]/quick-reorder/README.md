# API Route: /api/restaurants/[id]/quick-reorder

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/restaurants/[id]/quick-reorder/route.ts`
- Route: `/api/restaurants/[id]/quick-reorder`
- HTTP methods: `POST`
- Feature area: public restaurant discovery/details
- Main audience/roles: `customer`, `public visitor`

## Plain-English Summary

Lets a signed-in customer rebuild their latest previous order from a specific restaurant. It uses
the same smart cart recovery logic as `/api/my-orders/reorder`: current menu data wins, deleted or
unavailable items are skipped, prices are refreshed, and stock/quantity reductions are reported to
the UI.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It validates the restaurant id from route params before querying.
- It requires a signed-in customer and confirms the restaurant still exists.
- It finds the customer's most recent order from that restaurant with cart products.
- It uses `order`, `restaurant`, `user`, and current menu item data for persistence/recovery.
- It delegates shared logic to `auditLog`, `authOptions`, `orderCartSnapshot` so behavior stays consistent across the app.
- It returns `cartItems`, `skippedItems`, `priceChangedItems`, `adjustedItems`, and `recoverySummary`.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- Route param: `id` is the restaurant id.
- Session email identifies the customer whose latest restaurant order should be rebuilt.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 18: `if (!session?.user?.email) {`
- Line 23: `if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {`
- Line 32: `if (!user) {`
- Line 36: `if (!restaurant) {`
- Line 48: `if (!order) {`
- If the latest restaurant order has stale menu items, valid items can still be added to cart.
- If no item can be recovered, the route returns `400` with detailed skipped-item metadata.
- Audit metadata records how many items were added, skipped, adjusted, or price-refreshed.

## Data Dependencies

- Models: `order`, `restaurant`, `user`
- Shared libs: `auditLog`, `authOptions`, `orderCartSnapshot`
- Shared types: None detected

## Side Effects

- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Success response fields: `cartItems`, `restaurantName`, `sourceOrderId`, `skippedItems`, `priceChangedItems`, `adjustedItems`, `recoverySummary`
- Error response fields can include recovery metadata when the previous order exists but no item can currently be reordered.

## How To Explain This In A Presentation

Open this file when someone asks what `/api/restaurants/[id]/quick-reorder` does. Explain that it powers the restaurant detail "Order again" button by rebuilding the customer's latest order from that restaurant with current menu data and honest partial-recovery feedback.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
