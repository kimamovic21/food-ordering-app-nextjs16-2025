# API Route: /api/coupons

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/coupons/route.ts`
- Route: `/api/coupons`
- HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
- Feature area: coupons
- Main audience/roles: `admin`, `restaurant admin`

## Plain-English Summary

Handles get/post/put/delete work for the coupons area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST/PUT/DELETE requests and converts request/session data into server-side business checks.
- It uses `coupon`, `order`, `restaurant`, `user` for persistence.
- It delegates shared logic to `auditLog`, `authOptions`, `coupon`, `mongoConnect` so behavior stays consistent across the app.
- Detected local functions/handlers: `serializeCoupon`, `getRestaurantForAdmin`, `buildCouponPayload`, `skip`, `body`.

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

- Line 51: `if (!user || user.role !== 'admin') {`
- Line 59: `if (!restaurant) {`
- Line 121: `if (wantsBestCoupon) {`
- Line 122: `if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {`
- Line 148: `if (needsUser && !user) {`
- Line 169: `if (validationError) {`
- Line 183: `if (right.discountAmount !== left.discountAmount) {`
- Line 199: `if (code) {`
- Line 201: `if (!isValidCouponCode(normalizedCode)) {`
- Line 208: `if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {`
- Line 221: `if (!coupon) {`
- Line 231: `if (coupon.firstOrderOnly || coupon.usagePerCustomer) {`
- Line 235: `if (!user) {`
- Line 259: `if (validationError) {`
- Line 274: `if (id) {`
- Line 275: `if (!mongoose.Types.ObjectId.isValid(id)) {`
- Line 280: `if (!session?.user?.email) {`
- Line 285: `if (!adminContext) {`
- Line 296: `if (!coupon) {`
- Line 304: `if (!session?.user?.email) {`
- Line 309: `if (!adminContext) {`
- Line 337: `if (!session?.user?.email) {`
- Line 342: `if (!adminContext) {`
- Line 349: `if (!payload.code || !isValidCouponCode(payload.code)) {`
- Line 356: `if (!payload.title || !payload.description) {`
- Line 360: `if (`
- Line 376: `if (dateValidationError) {`
- Line 385: `if (existingCoupon) {`
- Line 415: `if (!session?.user?.email) {`
- Line 420: `if (!adminContext) {`
- Line 427: `if (!id || !mongoose.Types.ObjectId.isValid(id)) {`
- Line 436: `if (!existingCoupon) {`
- Line 442: `if (!payload.code || !isValidCouponCode(payload.code)) {`
- Line 449: `if (!payload.title || !payload.description) {`
- Line 453: `if (`
- Line 469: `if (dateValidationError) {`

## Data Dependencies

- Models: `coupon`, `order`, `restaurant`, `user`
- Shared libs: `auditLog`, `authOptions`, `coupon`, `mongoConnect`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- Updates existing MongoDB documents.
- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `200`, `201`, `400`, `401`, `403`, `404`
- Common response fields detected: `coupon`, `restaurantId`, `createdBy`, `updatedBy`, `code`, `title`, `description`, `discountType`, `discountValue`, `minimumOrderAmount`, `maxDiscountAmount`, `usageLimit`, `usagePerCustomer`, `usageCount`, `startsAt`, `expiresAt`, `isActive`, `isPublic`, `firstOrderOnly`, `terms`, `tags`, `lastUsedAt`, `createdAt`, `updatedAt`, `email`, `ownerId`, `body`, `null`, `request`, `discountAmount`, `message`, `lte`, `or`, `gte`, `userId`, `orderStatus`, `couponId`, `ne`, `orderPaid`, `paid`, `paymentStatus`, `found`, `valid`, `error`, `coupons`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/coupons` does. Explain that it belongs to the coupons workflow, serves `admin`, `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
