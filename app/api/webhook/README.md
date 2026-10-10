# API Route: /api/webhook

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/webhook/route.ts`
- Route: `/api/webhook`
- HTTP methods: `POST`
- Feature area: Stripe webhook
- Main audience/roles: `Stripe system`

## Plain-English Summary

Receives Stripe webhook events, verifies the Stripe signature, marks orders paid, captures tracked inventory reservations or decrements tracked menu item stock, updates coupon usage, and triggers purchase notifications/receipt work.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses `coupon`, `menuItem`, `order`, `restaurant` for persistence.
- It delegates shared logic to `menuItemInventoryServer` and `notifications` so behavior stays consistent across the app.
- On the first successful `checkout.session.completed` event for an unpaid order, tracked menu item stock is adjusted once and the order stores `inventoryAdjustedAt`.
- Newer checkout orders usually arrive with `inventoryReservationStatus: reserved`; the webhook captures that reservation by decrementing both `stockQuantity` and `reservedStockQuantity`, then marks the reservation `captured`.
- Older unpaid orders without reservation metadata still use the direct stock-decrement path so legacy payment links continue to reconcile safely.
- If that decrement moves a tracked item into `low_stock` or `sold_out`, the route creates a `menu_item.inventory_alert` audit log and sends an `inventory_alert` notification to restaurant admins.
- If stock changed after checkout creation but before payment confirmation, the webhook marks the paid order as system-canceled with `refundStatus: review_required` instead of allowing a silent over-sale.
- Duplicate paid webhook events skip stock adjustment because `wasPaid`/`inventoryAdjustedAt` make the side effects idempotent.
- Detected local functions/handlers: `productIds`, `items`.

## Request Inputs

- request headers

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `@react-email/components` and `@react-email/render`: define the email templates that Resend sends.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `libs/menuItemInventoryServer.ts`: performs server-only paid-order inventory reservation capture/direct adjustment with rollback if a concurrent stock update fails.

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
- Shared libs: `menuItemInventoryServer`, `notifications`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- Touches Stripe payment/session/webhook behavior.
- May send email or app notifications.
- Captures reserved tracked menu item stock after payment confirmation and records refund-review metadata when stock is gone.
- Emits low-stock/sold-out inventory notifications and audit activity for restaurant admins.

## Response Behavior

- Status codes detected: `200`, `400`, `500`
- Common response fields detected: `apiVersion`, `req`, `event`, `err`, `Error`, `received`, `restaurantId`, `orderId`, `customerEmail`, `total`, `order`, `inc`, `usageCount`, `set`, `lastUsedAt`, `usage`, `item`, `id`, `in`, `name`, `size`, `quantity`, `price`, `image`, `couponCode`, `couponDiscountAmount`, `couponDiscountPercentage`, `specialInstructions`, `purchasedOn`, `restaurant`, `contact`, `email`, `street`, `city`, `postalCode`, `country`, `taxAmount`, `deliveryFee`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/webhook` does. Explain that it belongs to the Stripe webhook workflow, serves `Stripe system`, verifies Stripe signatures, reconciles paid orders, captures reserved inventory or adjusts tracked inventory exactly once, writes inventory alerts when stock needs attention, handles paid-but-out-of-stock refund review, and then sends admin notifications/receipts when appropriate.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
