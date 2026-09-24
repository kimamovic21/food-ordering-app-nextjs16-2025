# API Route: /api/couriers

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/couriers/route.ts`
- Route: `/api/couriers`
- HTTP methods: `GET`, `PATCH`
- Feature area: courier management
- Main audience/roles: `admin`, `restaurant admin`

## Plain-English Summary

Handles get/patch work for the courier management area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/PATCH requests and converts request/session data into server-side business checks.
- It uses `order`, `user` for persistence.
- It delegates shared logic to `authGuards`, `courierAssignment`, `courierAssignmentTimeout`, `courierSchedule`, `deliveryPin`, `notifications`, `qstash` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `@upstash/qstash`: schedules signed background checks for unpaid orders, courier assignment timeouts, and order maintenance.

## Auth, Role, And Safety Checks

- Checks the `courier` role before allowing delivery operations.

## Edge Cases Covered

- Line 15: `if (!(await isAdmin())) {`
- Line 23: `if (availableOnly) {`
- Line 42: `if (!(await isAdmin())) {`
- Line 50: `if (!courierId || !mongoose.Types.ObjectId.isValid(courierId)) {`
- Line 54: `if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 60: `if (!courier) {`
- Line 64: `if (courier.role !== 'courier') {`
- Line 70: `if (!order) {`
- Line 77: `if (order.orderStatus !== 'ready') {`
- Line 84: `if (order.courierId && ['pending', 'accepted'].includes(order.courierAssignmentStatus || '')) {`
- Line 96: `if (courierTakenOrderId && courierTakenOrderId !== order._id.toString()) {`
- Line 106: `if (isCourierOrderOwner(order.userId, courier._id)) {`
- Line 125: `if (!order.deliveryPin) {`

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `authGuards`, `courierAssignment`, `courierAssignmentTimeout`, `courierSchedule`, `deliveryPin`, `notifications`, `qstash`
- Shared types: None detected

## Side Effects

- Schedules or handles delayed QStash jobs.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Common response fields detected: `request`, `error`, `filter`, `role`, `courier`, `couriers`, `orderId`, `notifications`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/couriers` does. Explain that it belongs to the courier management workflow, serves `admin`, `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
