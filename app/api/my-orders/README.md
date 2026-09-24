# API Route: /api/my-orders

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-orders/route.ts`
- Route: `/api/my-orders`
- HTTP methods: `GET`, `PATCH`
- Feature area: customer orders
- Main audience/roles: `customer`

## Plain-English Summary

Handles get/patch work for the customer orders area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/PATCH requests and converts request/session data into server-side business checks.
- It uses `menuItem`, `order`, `restaurant`, `user` for persistence.
- It delegates shared logic to `auditLog`, `authOptions`, `notifications`, `orderAutoCancellation`, `orderNormalizer`, `restaurantAvailabilityRequests`, `stripeCheckoutSession` so behavior stays consistent across the app.
- Detected local functions/handlers: `productIds`, `receiptItems`, `skip`, `normalizedOrders`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `@react-pdf/renderer`: creates downloadable/report PDF output for admin reporting flows.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 23: `if (!session || !session.user?.email) {`
- Line 34: `if (!user) {`
- Line 38: `if (sessionId) {`
- Line 44: `if (!order) {`
- Line 98: `if (id) {`
- Line 99: `if (!mongoose.Types.ObjectId.isValid(id)) {`
- Line 105: `if (!order) {`
- Line 110: `if (order.userId?.toString() !== user._id.toString()) {`
- Line 145: `if (!session || !session.user?.email) {`
- Line 151: `if (!user) {`
- Line 157: `if (action !== 'confirm-delivery' && action !== 'cancel-order') {`
- Line 161: `if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 167: `if (!order) {`
- Line 171: `if (order.userId?.toString() !== user._id.toString()) {`
- Line 175: `if (action === 'cancel-order') {`
- Line 180: `if (isPaid) {`
- Line 184: `if (order.orderStatus !== 'placed') {`
- Line 235: `if (order.orderStatus !== 'delivered') {`

## Data Dependencies

- Models: `menuItem`, `order`, `restaurant`, `user`
- Shared libs: `auditLog`, `authOptions`, `notifications`, `orderAutoCancellation`, `orderNormalizer`, `restaurantAvailabilityRequests`, `stripeCheckoutSession`
- Shared types: None detected

## Side Effects

- Touches Stripe payment/session/webhook behavior.
- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`
- Common response fields detected: `request`, `error`, `email`, `userId`, `stripeSessionId`, `order`, `item`, `productId`, `in`, `image`, `lineTotal`, `restaurant`, `name`, `contact`, `street`, `city`, `postalCode`, `country`, `orders`, `actor`, `action`, `entityType`, `entityId`, `restaurantId`, `orderId`, `metadata`, `total`, `stripeCheckoutSessionExpired`, `stripeCheckoutSessionExpirationReason`, `stripeCheckoutSessionId`, `customerEmail`, `notification`, `completedAt`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-orders` does. Explain that it belongs to the customer orders workflow, serves `customer`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
