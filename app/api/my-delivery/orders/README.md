# API Route: /api/my-delivery/orders

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-delivery/orders/route.ts`
- Route: `/api/my-delivery/orders`
- HTTP methods: `GET`, `PATCH`
- Feature area: courier active delivery
- Main audience/roles: `courier`

## Plain-English Summary

Handles get/patch work for the courier active delivery area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/PATCH requests and converts request/session data into server-side business checks.
- It uses `order`, `user` for persistence.
- It delegates shared logic to `authOptions`, `courierAssignmentHistory`, `courierAssignmentTimeout`, `deliveryPin`, `devOrderTimeSimulator`, `devOrderTimeSimulatorStore`, `notifications` so behavior stays consistent across the app.
- Detected local functions/handlers: `normalizeOrder`, `normalizedOrders`.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `courier` role before allowing delivery operations.

## Edge Cases Covered

- Line 38: `if (!session || !session.user) {`
- Line 45: `if (!user || user.role !== 'courier') {`
- Line 71: `if (timeoutNormalizedOrder.courierId?.toString() !== user._id.toString()) {`
- Line 75: `if (!timeoutNormalizedOrder.deliveryPin) {`
- Line 93: `if (!session || !session.user) {`
- Line 100: `if (!user || user.role !== 'courier') {`
- Line 107: `if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 113: `if (!order) {`
- Line 121: `if (timeoutResult.expired) {`
- Line 132: `if (order.courierId?.toString() !== user._id.toString()) {`
- Line 136: `if (action === 'accept-assignment') {`
- Line 137: `if (order.courierAssignmentStatus !== 'pending') {`
- Line 151: `if (order.restaurantId) {`
- Line 167: `if (action === 'decline-assignment') {`
- Line 168: `if (!['pending', 'accepted'].includes(order.courierAssignmentStatus || '')) {`
- Line 187: `if (order.restaurantId) {`
- Line 203: `if (action === 'pick-up') {`
- Line 204: `if (order.courierAssignmentStatus !== 'accepted') {`
- Line 208: `if (!order.restaurantHandedToCourierAt) {`
- Line 223: `if (order.restaurantId) {`
- Line 232: `if (order.userId) {`
- Line 247: `if (action === 'request-failed-delivery') {`
- Line 248: `if (order.orderStatus !== 'transportation') {`
- Line 255: `if (order.failedDeliveryRequestedAt) {`
- Line 263: `if (!transportStartedAt) {`
- Line 285: `if (transportMinutes < FAILED_DELIVERY_MIN_TRANSPORT_MINUTES) {`
- Line 303: `if (order.restaurantId) {`
- Line 319: `if (order.orderStatus !== 'transportation') {`
- Line 326: `if (order.failedDeliveryRequestedAt) {`
- Line 333: `if (!deliveryPin || String(deliveryPin).trim() !== String(order.deliveryPin || '').trim()) {`
- Line 348: `if (order.userId && order.restaurantId) {`

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `authOptions`, `courierAssignmentHistory`, `courierAssignmentTimeout`, `deliveryPin`, `devOrderTimeSimulator`, `devOrderTimeSimulatorStore`, `notifications`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`
- Common response fields detected: `order`, `deliveryPin`, `paymentStatus`, `orderStatus`, `error`, `email`, `courierId`, `in`, `or`, `courierAssignmentStatus`, `exists`, `orders`, `request`, `assignedAt`, `respondedAt`, `restaurantId`, `orderId`, `courierName`, `notification`, `userId`, `estimatedMinutes`, `remainingMinutes`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-delivery/orders` does. Explain that it belongs to the courier active delivery workflow, serves `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
