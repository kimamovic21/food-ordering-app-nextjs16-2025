# API Route: /api/reviews

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/reviews/route.ts`
- Route: `/api/reviews`
- HTTP methods: `GET`, `POST`
- Feature area: reviews
- Main audience/roles: `customer`

## Plain-English Summary

Handles get/post work for the reviews area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST requests and converts request/session data into server-side business checks.
- It uses `order`, `restaurantReview`, `user` for persistence.
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

## Edge Cases Covered

- Line 10: `if (!value || value === 'all') {`
- Line 16: `if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {`
- Line 32: `if (!session?.user?.email) {`
- Line 37: `if (!user) {`
- Line 45: `if (orderId) {`
- Line 46: `if (!mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 51: `if (!order) {`
- Line 58: `if (!isOrderOwner && !isAdmin) {`
- Line 70: `if (ratingFilter === undefined) {`
- Line 97: `if (search) {`
- Line 146: `if (!session?.user?.email) {`
- Line 151: `if (!user) {`
- Line 160: `if (!mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 164: `if (!isValidRating(rating)) {`
- Line 171: `if (reviewText.length < 5) {`
- Line 176: `if (!order) {`
- Line 180: `if (order.userId?.toString() !== user._id.toString()) {`
- Line 187: `if (order.orderStatus !== 'completed' || !paymentStatus) {`
- Line 199: `if (existingReview) {`
- Line 216: `if (error?.code === 11000) {`

## Data Dependencies

- Models: `order`, `restaurantReview`, `user`
- Shared libs: `authOptions`, `mongoConnect`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `409`, `500`
- Common response fields detected: `value`, `rating`, `request`, `error`, `email`, `pipeline`, `match`, `userId`, `lookup`, `from`, `localField`, `foreignField`, `as`, `unwind`, `regex`, `options`, `sort`, `createdAt`, `project`, `reviewText`, `restaurant`, `name`, `meta`, `totalCount`, `reviews`, `orderId`, `restaurantId`, `review`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/reviews` does. Explain that it belongs to the reviews workflow, serves `customer`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
