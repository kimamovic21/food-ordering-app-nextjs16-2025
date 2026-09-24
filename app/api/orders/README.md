# API Route: /api/orders

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/orders/route.ts`
- Route: `/api/orders`
- HTTP methods: `GET`, `PATCH`
- Feature area: order operations
- Main audience/roles: `admin`, `restaurant admin`

## Plain-English Summary

Handles get/patch work for the order operations area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/PATCH requests and converts request/session data into server-side business checks.
- It uses `order`, `user` for persistence.
- It delegates shared logic to `auditLog`, `authOptions`, `courierAssignmentTimeout`, `devOrderTimeSimulatorStore`, `notifications`, `orderAutoCancellation`, `qstash`, `restaurantAvailabilityRequests` so behavior stays consistent across the app.
- Detected local functions/handlers: `normalizeOrder`, `getSuperAdminEmail`, `isSuperAdminUser`, `skip`, `normalizedOrders`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `@upstash/qstash`: schedules signed background checks for unpaid orders, courier assignment timeouts, and order maintenance.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the configured super-admin email before allowing elevated platform access.
- Checks the `admin` role before allowing restaurant/admin operations.

## Edge Cases Covered

- Line 37: `if (!userEmail) {`
- Line 43: `if (!user || user.role !== 'admin') {`
- Line 49: `if (!user.restaurantId && !isSuperAdmin) {`
- Line 57: `if (id) {`
- Line 58: `if (!mongoose.Types.ObjectId.isValid(id)) {`
- Line 67: `if (!order) {`
- Line 119: `if (!userEmail) {`
- Line 125: `if (!user || user.role !== 'admin') {`
- Line 131: `if (!user.restaurantId && !isSuperAdmin) {`
- Line 137: `if (!id || !mongoose.Types.ObjectId.isValid(id)) {`
- Line 142: `if (action && !allowedActions.includes(action)) {`
- Line 154: `if (!action && !allowedStatuses.includes(orderStatus)) {`
- Line 158: `if (!action && orderStatus === 'delivered') {`
- Line 165: `if (!action && orderStatus === 'transportation') {`
- Line 177: `if (!order) {`
- Line 181: `if (action === 'update-admin-note') {`
- Line 184: `if (note.length > 1000) {`
- Line 213: `if (previousStatus === 'canceled') {`
- Line 217: `if (!hasPaid) {`
- Line 224: `if (action === 'handoff-to-courier') {`
- Line 225: `if (order.orderStatus !== 'ready') {`
- Line 232: `if (!order.courierId || order.courierAssignmentStatus !== 'accepted') {`
- Line 266: `if (action === 'verify-failed-delivery') {`
- Line 267: `if (order.orderStatus !== 'transportation') {`
- Line 274: `if (!order.failedDeliveryRequestedAt) {`
- Line 295: `if (courierId) {`
- Line 297: `if (courier?.takenOrder?.toString() === order._id.toString()) {`
- Line 319: `if (order.userId && order.restaurantId) {`
- Line 339: `if (orderStatus === 'completed' && previousStatus !== 'delivered') {`
- Line 351: `if (orderStatus === 'processing' && !order.processingAt) {`
- Line 354: `if (orderStatus === 'ready' && !order.readyAt) {`
- Line 357: `if (orderStatus === 'completed') {`
- Line 365: `if (['completed', 'canceled'].includes(orderStatus)) {`
- Line 369: `if (previousStatus !== orderStatus && orderStatus === 'ready') {`
- Line 373: `if (previousStatus !== orderStatus) {`
- Line 385: `if (previousStatus !== orderStatus && order.userId) {`

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `auditLog`, `authOptions`, `courierAssignmentTimeout`, `devOrderTimeSimulatorStore`, `notifications`, `orderAutoCancellation`, `qstash`, `restaurantAvailabilityRequests`
- Shared types: None detected

## Side Effects

- Schedules or handles delayed QStash jobs.
- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`
- Common response fields detected: `order`, `paymentStatus`, `orderStatus`, `user`, `request`, `error`, `email`, `restaurantId`, `orders`, `actor`, `action`, `entityType`, `entityId`, `orderId`, `metadata`, `hasInternalNote`, `courierId`, `notification`, `canceledBy`, `userId`, `estimatedMinutes`, `estimatedPreparationMinutes`, `estimatedDeliveryMinutes`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/orders` does. Explain that it belongs to the order operations workflow, serves `admin`, `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
