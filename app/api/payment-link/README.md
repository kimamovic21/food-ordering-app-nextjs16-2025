# API Route: /api/payment-link

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/payment-link/route.ts`
- Route: `/api/payment-link`
- HTTP methods: `GET`
- Feature area: payment link
- Main audience/roles: `public or shared`

## Plain-English Summary

Handles get work for the payment link area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `order`, `user` for persistence.
- It delegates shared logic to `authOptions` so behavior stays consistent across the app.
- Detected local functions/handlers: `isPaid`, `roundToTwoDecimals`, `canRecoverFromStripeSessionLookupError`, `createCheckoutSessionForOrder`, `createAndSaveCheckoutSessionForOrder`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 30: `if (total <= 0) {`
- Line 66: `if (!stripeSession.url) {`
- Line 77: `if (!stripe) {`
- Line 85: `if (!session || !session.user?.email) {`
- Line 92: `if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 98: `if (!user) {`
- Line 104: `if (!order) {`
- Line 108: `if (order.userId?.toString() !== user._id.toString()) {`
- Line 112: `if (isPaid(order)) {`
- Line 116: `if (order.orderStatus === 'canceled') {`
- Line 120: `if (order.orderStatus !== 'placed') {`
- Line 124: `if (user.restaurantId?.toString() === order.restaurantId?.toString()) {`
- Line 131: `if (!order.stripeSessionId) {`
- Line 145: `if (!canRecoverFromStripeSessionLookupError(error)) {`
- Line 163: `if (stripeSession.payment_status === 'paid') {`
- Line 175: `if (stripeSession.status === 'open' && stripeSession.url) {`

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `authOptions`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- Touches Stripe payment/session/webhook behavior.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `500`
- Common response fields detected: `apiVersion`, `order`, `value`, `error`, `request`, `email`, `http`, `localhost`, `mode`, `payment_method_types`, `customer_email`, `metadata`, `orderId`, `line_items`, `quantity`, `price_data`, `currency`, `unit_amount`, `product_data`, `name`, `success_url`, `cancel_url`, `paymentLinkStatus`, `url`, `session`, `stripeSession`, `paid`, `message`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/payment-link` does. Explain that it belongs to the payment link workflow, serves `public or shared`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
