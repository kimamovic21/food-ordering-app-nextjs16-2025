# API Route: /api/checkout

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/checkout/route.ts`
- Route: `/api/checkout`
- HTTP methods: `POST`
- Feature area: Stripe checkout
- Main audience/roles: `customer`

## Plain-English Summary

Creates or recovers a Stripe Checkout session after server-side cart, user, restaurant, coupon, loyalty, radius, capacity, delivery-readiness, and duplicate-payment validation.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses `coupon`, `order`, `user` for persistence.
- It delegates shared logic to `auditLog`, `authOptions`, `cartValidation`, `coupon`, `deliveryPin`, `loyaltyCalculator`, `money`, `notifications`, `phone`, `qstash`, `rateLimit` so behavior stays consistent across the app.
- Detected local functions/handlers: `createCheckoutBlockResponse`, `canRecoverFromStripeSessionLookupError`, `getCheckoutOrigin`, `normalizeFingerprintText`, `normalizeFingerprintCoordinate`, `createCheckoutFingerprint`, `createStripeLineItems`, `createStripeCheckoutSessionForOrder`, `createAndSaveCheckoutSessionResponse`, `getExistingCheckoutSessionResponse`.

## Checkout Integration Flow

- NextAuth identifies the customer and blocks anonymous checkout.
- Upstash rate limiting slows repeated checkout attempts.
- Cart validation re-checks menu item existence, availability, size/price validity, quantity limits, one-restaurant-per-cart behavior, and restaurant capacity.
- Restaurant checks verify open/closed state, pause reason, delivery radius, delivery location, busy/capacity state, and courier readiness before money is collected.
- Coupon and loyalty helpers recalculate discounts server-side so the browser cannot fake cheaper totals.
- Stripe line items are built from verified items and server-calculated totals.
- If the user already has an open Stripe session for the same checkout fingerprint, the route can reuse it instead of creating duplicate unpaid orders.
- QStash schedules post-checkout maintenance so stale unpaid orders or delivery readiness issues can be cleaned up later.
- Audit logs record blocked or sensitive checkout outcomes for admin visibility.

## Request Inputs

- JSON body parsed with `req.json()`
- request headers

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `@upstash/qstash`: schedules signed background checks for unpaid orders, courier assignment timeouts, and order maintenance.
- `@upstash/redis` and `@upstash/ratelimit`: protect sensitive routes from repeated abuse while keeping checks server-side.
- `libphonenumber-js`: normalizes and validates phone numbers before checkout/profile data is accepted.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Applies Upstash Redis-backed rate limiting.

## Edge Cases Covered

- Line 65: `if (user) {`
- Line 256: `if (!stripeSession.url) {`
- Line 282: `if (!order.stripeSessionId) {`
- Line 297: `if (!canRecoverFromStripeSessionLookupError(error)) {`
- Line 310: `if (stripeSession.payment_status === 'paid') {`
- Line 323: `if (stripeSession.status === 'open' && stripeSession.url) {`
- Line 341: `if (!stripe) {`
- Line 346: `if (!session?.user?.email) {`
- Line 357: `if (!rateLimit.success) {`
- Line 391: `if (!phone || !streetAddress || !postalCode || !city || !country) {`
- Line 397: `if (!normalizedPhone) {`
- Line 401: `if (!Array.isArray(cartItems) || cartItems.length === 0) {`
- Line 411: `if (!user) {`
- Line 423: `if (activeCustomerOrder) {`
- Line 441: `if (requestedCartRestaurantIds.length > 1) {`
- Line 462: `if (!restaurantId) {`
- Line 466: `if (cartValidation.restaurant?.status === 'multiple_restaurants') {`
- Line 486: `if (!restaurant && cartValidation.restaurant?.status === 'missing') {`
- Line 491: `if (restaurant && user.restaurantId?.toString() === String(restaurant._id)) {`
- Line 507: `if (ownedMenuItem) {`
- Line 511: `if (!cartValidation.canCheckout) {`
- Line 514: `if (blockingItem) {`
- Line 517: `if (blockingItem.status === 'unavailable') {`
- Line 532: `if (blockingItem.status === 'invalid_size') {`
- Line 547: `if (blockingItem.status === 'quantity_limit') {`
- Line 570: `if (blockingItem.status === 'deleted') {`
- Line 577: `if (restaurantValidation?.status === 'busy') {`
- Line 594: `if (restaurantValidation?.status === 'order_quantity_limit') {`
- Line 609: `if (restaurantValidation?.status === 'missing_delivery_location') {`
- Line 625: `if (restaurantValidation?.status === 'outside_delivery_radius') {`
- Line 644: `if (`
- Line 671: `if (!restaurant) {`
- Line 695: `if (verifiedLoyaltyPercentage > loyaltyStatus.discountPercentage) {`
- Line 714: `if (normalizedCouponCode) {`
- Line 715: `if (!coupon) {`
- Line 732: `if (couponValidationError) {`

## Data Dependencies

- Models: `coupon`, `order`, `user`
- Shared libs: `auditLog`, `authOptions`, `cartValidation`, `coupon`, `deliveryPin`, `loyaltyCalculator`, `money`, `notifications`, `phone`, `qstash`, `rateLimit`
- Shared types: `cart`

## Side Effects

- Creates MongoDB documents.
- Touches Stripe payment/session/webhook behavior.
- Schedules or handles delayed QStash jobs.
- Writes or reads audit-log records.
- May reuse an existing open Stripe Checkout session instead of creating a new one.
- Saves `stripeSessionId` on the order so later webhook, invoice, and payment-link flows can reconnect Stripe state to MongoDB state.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `409`, `500`
- Common response fields detected: `node`, `apiVersion`, `message`, `reason`, `actor`, `action`, `entityType`, `entityId`, `restaurantId`, `metadata`, `error`, `req`, `http`, `localhost`, `value`, `userId`, `verifiedItems`, `size`, `delivery`, `phone`, `streetAddress`, `postalCode`, `city`, `country`, `deliveryLatitude`, `deliveryLongitude`, `specialInstructions`, `pricing`, `subtotal`, `taxAmount`, `deliveryFee`, `loyaltyDiscount`, `loyaltyDiscountPercentage`, `couponCode`, `couponDiscountAmount`, `total`, `items`, `productId`, `quantity`, `price`, `couponLineDiscountRate`, `stripeLineItems`, `price_data`, `currency`, `unit_amount`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/checkout` does. Explain that it is the final server-side gate before payment. The cart page can warn the user, but this API makes the authoritative decision: it validates user, cart, restaurant, courier readiness, coupons, loyalty, totals, duplicate payment sessions, and only then creates or reuses a Stripe Checkout URL.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
