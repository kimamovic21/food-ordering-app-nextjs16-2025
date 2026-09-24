# API Route: /api/courier-reviews

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/courier-reviews/route.ts`
- Route: `/api/courier-reviews`
- HTTP methods: `GET`, `POST`
- Feature area: courier reviews
- Main audience/roles: `customer`

## Plain-English Summary

Handles get/post work for the courier reviews area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST requests and converts request/session data into server-side business checks.
- It uses `courierReview`, `order`, `user` for persistence.
- It delegates shared logic to `authOptions`, `mongoConnect` so behavior stays consistent across the app.
- Detected local functions/handlers: `parseRatingFilter`, `escapeRegex`, `isValidRating`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `admin` role before allowing restaurant/admin operations.
- Checks the `courier` role before allowing delivery operations.

## Edge Cases Covered

- Line 10: `if (!value || value === 'all') {`
- Line 16: `if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {`
- Line 37: `if (orderId) {`
- Line 39: `if (!session?.user?.email) {`
- Line 43: `if (!mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 48: `if (!user) {`
- Line 53: `if (!order) {`
- Line 60: `if (!isOrderOwner && !isAdmin) {`
- Line 69: `if (mine) {`
- Line 71: `if (!session?.user?.email) {`
- Line 76: `if (!courier) {`
- Line 80: `if (courier.role !== 'courier') {`
- Line 87: `if (ratingFilter === undefined) {`
- Line 117: `if (search) {`
- Line 171: `if (!courierId || !mongoose.Types.ObjectId.isValid(courierId)) {`
- Line 176: `if (!targetCourier || targetCourier.role !== 'courier') {`
- Line 247: `if (!session?.user?.email) {`
- Line 252: `if (!user) {`
- Line 261: `if (!mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 265: `if (!isValidRating(rating)) {`
- Line 272: `if (reviewText.length < 5) {`
- Line 277: `if (!order) {`
- Line 281: `if (order.userId?.toString() !== user._id.toString()) {`
- Line 285: `if (!order.courierId || !mongoose.Types.ObjectId.isValid(String(order.courierId))) {`
- Line 296: `if (order.orderStatus !== 'completed' || !paymentStatus) {`
- Line 309: `if (existingReview) {`
- Line 326: `if (error?.code === 11000) {`

## Data Dependencies

- Models: `courierReview`, `order`, `user`
- Shared libs: `authOptions`, `mongoConnect`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `409`, `500`
- Common response fields detected: `value`, `rating`, `request`, `error`, `email`, `userId`, `pipeline`, `match`, `courierId`, `lookup`, `from`, `localField`, `foreignField`, `as`, `unwind`, `path`, `preserveNullAndEmptyArrays`, `regex`, `options`, `sort`, `createdAt`, `project`, `reviewText`, `orderId`, `customer`, `name`, `group`, `averageRating`, `avg`, `totalCount`, `sum`, `meta`, `summary`, `courier`, `image`, `reviews`, `review`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/courier-reviews` does. Explain that it belongs to the courier reviews workflow, serves `customer`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
