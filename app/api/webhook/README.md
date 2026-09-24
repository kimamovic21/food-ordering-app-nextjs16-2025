# API Route: /api/webhook

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/webhook/route.ts`
- Route: `/api/webhook`
- HTTP methods: `POST`
- Feature area: Stripe webhook
- Main audience/roles: `Stripe system`

## Plain-English Summary

Receives Stripe webhook events, verifies the Stripe signature, marks orders paid, updates coupon usage, and triggers purchase notifications/receipt work.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses `coupon`, `menuItem`, `order`, `restaurant` for persistence.
- It delegates shared logic to `notifications` so behavior stays consistent across the app.
- Detected local functions/handlers: `productIds`, `items`.

## Request Inputs

- request headers

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `@react-email/components` and `@react-email/render`: define the email templates that Resend sends.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.

## Auth, Role, And Safety Checks

- Verifies the Stripe webhook signature before trusting payment events.

## Edge Cases Covered

- Line 19: `if (!stripe) {`
- Line 24: `if (!webhookSecret) {`
- Line 30: `if (!signature) {`
- Line 43: `if (event.type === 'checkout.session.completed') {`
- Line 47: `if (orderId) {`
- Line 50: `if (order) {`
- Line 51: `if ((order as any).orderStatus === 'canceled') {`
- Line 58: `if (!(order as any).orderStatus) {`
- Line 64: `if (!wasPaid) {`
- Line 77: `if (!wasPaid && order.couponId && Number((order as any).couponDiscountAmount || 0) > 0) {`
- Line 90: `if (shouldSendReceipt) {`
- Line 138: `if (emailResult.sent) {`

## Data Dependencies

- Models: `coupon`, `menuItem`, `order`, `restaurant`
- Shared libs: `notifications`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- Touches Stripe payment/session/webhook behavior.
- May send email or app notifications.

## Response Behavior

- Status codes detected: `200`, `400`, `500`
- Common response fields detected: `apiVersion`, `req`, `event`, `err`, `Error`, `received`, `restaurantId`, `orderId`, `customerEmail`, `total`, `order`, `inc`, `usageCount`, `set`, `lastUsedAt`, `usage`, `item`, `id`, `in`, `name`, `size`, `quantity`, `price`, `image`, `couponCode`, `couponDiscountAmount`, `couponDiscountPercentage`, `specialInstructions`, `purchasedOn`, `restaurant`, `contact`, `email`, `street`, `city`, `postalCode`, `country`, `taxAmount`, `deliveryFee`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/webhook` does. Explain that it belongs to the Stripe webhook workflow, serves `Stripe system`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
