# API Route: /api/my-delivery

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-delivery/route.ts`
- Route: `/api/my-delivery`
- HTTP methods: `GET`, `PATCH`
- Feature area: courier active delivery
- Main audience/roles: `courier`

## Plain-English Summary

Handles get/patch work for the courier active delivery area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/PATCH requests and converts request/session data into server-side business checks.
- It uses `courierReview`, `order`, `restaurant`, `user` for persistence.
- It delegates shared logic to `authGuards`, `courierAssignment`, `courierAssignmentTimeout`, `courierSchedule`, `deliveryPin`, `notifications`, `qstash` so behavior stays consistent across the app.
- Detected local functions/handlers: `toRadians`, `calculateDistanceKm`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `@upstash/qstash`: schedules signed background checks for unpaid orders, courier assignment timeouts, and order maintenance.

## Auth, Role, And Safety Checks

- Checks the `courier` role before allowing delivery operations.

## Edge Cases Covered

- Line 38: `if (!(await isAdmin())) {`
- Line 47: `if (availableOnly) {`
- Line 62: `if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 64: `if (order?.restaurantId) {`
- Line 119: `if (left.availability !== right.availability) return left.availability ? -1 : 1;`
- Line 120: `if (Boolean(left.takenOrder) !== Boolean(right.takenOrder)) return left.takenOrder ? 1 : -1;`
- Line 121: `if (left.distanceToRestaurantKm !== null && right.distanceToRestaurantKm !== null) {`
- Line 133: `if (!(await isAdmin())) {`
- Line 141: `if (!courierId || !mongoose.Types.ObjectId.isValid(courierId)) {`
- Line 145: `if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 151: `if (!courier) {`
- Line 155: `if (courier.role !== 'courier') {`
- Line 161: `if (!order) {`
- Line 167: `if (order.orderStatus !== 'ready') {`
- Line 174: `if (order.courierId && ['pending', 'accepted'].includes(order.courierAssignmentStatus || '')) {`
- Line 186: `if (courierTakenOrderId && courierTakenOrderId !== order._id.toString()) {`
- Line 196: `if (isCourierOrderOwner(order.userId, courier._id)) {`
- Line 214: `if (!order.deliveryPin) {`

## Data Dependencies

- Models: `courierReview`, `order`, `restaurant`, `user`
- Shared libs: `authGuards`, `courierAssignment`, `courierAssignmentTimeout`, `courierSchedule`, `deliveryPin`, `notifications`, `qstash`
- Shared types: None detected

## Side Effects

- Schedules or handles delayed QStash jobs.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Common response fields detected: `value`, `startLatitude`, `startLongitude`, `endLatitude`, `endLongitude`, `request`, `error`, `filter`, `role`, `courier`, `restaurant`, `match`, `courierId`, `in`, `group`, `averageRating`, `avg`, `ratingCount`, `sum`, `distanceToRestaurantKm`, `isWithinSchedule`, `left`, `right`, `couriers`, `orderId`, `notifications`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-delivery` does. Explain that it belongs to the courier active delivery workflow, serves `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
