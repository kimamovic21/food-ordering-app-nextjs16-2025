# API Route: /api/my-orders/reorder

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-orders/reorder/route.ts`
- Route: `/api/my-orders/reorder`
- HTTP methods: `POST`
- Feature area: customer orders
- Main audience/roles: `customer`

## Plain-English Summary

Rebuilds a customer's previous order into fresh cart items using the current menu data. The route
does not trust the old order snapshot blindly: it reloads menu items from MongoDB, skips deleted or
unavailable items, refreshes prices, reduces quantities when stock or per-item limits changed, and
returns a recovery summary so the UI can explain what changed.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It requires the signed-in customer and only reads orders owned by that customer.
- It validates `orderId` as a MongoDB ObjectId before querying.
- It uses `order`, `user`, and current `menuItem` documents through `orderCartSnapshot`.
- It returns valid cart items even when part of the original order can no longer be reordered.
- It returns `skippedItems`, `priceChangedItems`, `adjustedItems`, and `recoverySummary` for smart UI feedback.
- It writes an audit log with item, skipped, adjusted, and price-change counts.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- JSON body: `{ "orderId": "<customer order id>" }`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 13: `if (!session?.user?.email) {`
- Line 18: `if (!user) {`
- Line 24: `if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 29: `if (!order) {`
- Deleted menu items are skipped instead of crashing the entire reorder when other items remain valid.
- Unavailable or sold-out menu items are skipped, with a customer-friendly reason in `skippedItems`.
- Price changes are accepted from current menu data and reported in `priceChangedItems`.
- Quantity is reduced when current stock or per-item limits are lower than the old order quantity.
- If nothing can be reordered, the route returns `400` with detailed recovery metadata.

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `auditLog`, `authOptions`, `orderCartSnapshot`
- Shared types: None detected

## Side Effects

- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Success response fields: `cartItems`, `skippedItems`, `priceChangedItems`, `adjustedItems`, `recoverySummary`
- Error response fields can include the same recovery metadata so the UI can explain why nothing was added.

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-orders/reorder` does. Explain that it lets a signed-in customer order again from an old order, but rebuilds the cart from today's menu data. If one item disappeared, the rest can still be added. If prices, limits, or stock changed, the API reports that clearly so the cart UI can show an honest recovery message.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
