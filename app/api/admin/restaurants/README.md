# API Route: /api/admin/restaurants

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/admin/restaurants/route.ts`
- Route: `/api/admin/restaurants`
- HTTP methods: `GET`
- Feature area: super-admin and platform management
- Main audience/roles: `super admin`

## Plain-English Summary

Handles get work for the super-admin and platform management area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `restaurant`, `user` for persistence.
- It delegates shared logic to `authOptions`, `mongoConnect`, `restaurantAvailability`, `reviewSummary` so behavior stays consistent across the app.
- Detected local functions/handlers: `escapeRegex`, `parsePositiveInt`, `parseMinRating`, `parseMaxMoney`, `normalizeDistinctStrings`, `createTextSearchFilter`, `getCapacityBucket`, `query`, `ownerQuery`, `city`, `country`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the configured super-admin email before allowing elevated platform access.
- Checks the `admin` role before allowing restaurant/admin operations.

## Edge Cases Covered

- Line 36: `if (!value) return fallback;`
- Line 38: `if (!Number.isFinite(parsed) || parsed <= 0) return fallback;`
- Line 50: `if (!Number.isFinite(parsed) || parsed <= 0) return 0;`
- Line 56: `if (!Number.isFinite(parsed) || parsed <= 0) return null;`
- Line 67: `if (!query) {`
- Line 89: `if (limit <= 10) return 'small';`
- Line 90: `if (limit <= 30) return 'medium';`
- Line 102: `if (!actorEmail) {`
- Line 108: `if (!actor || actor.role !== 'admin' || !superAdminEmail || actor.email !== superAdminEmail) {`
- Line 149: `if (city) {`
- Line 153: `if (country) {`
- Line 157: `if (maxMinimumOrder !== null) {`
- Line 161: `if (imageStatus === 'with-images') {`
- Line 165: `if (imageStatus === 'missing-images') {`
- Line 171: `if (blockedDates === 'yes') {`
- Line 175: `if (blockedDates === 'no') {`
- Line 194: `if (ownerQuery) {`
- Line 198: `if (andFilters.length > 0) {`
- Line 270: `if (status === 'accepting' && !restaurant.isAcceptingOrders) return false;`
- Line 271: `if (status === 'open' && !restaurant.isOpen) return false;`
- Line 272: `if (status === 'closed' && restaurant.isOpen) return false;`
- Line 273: `if (status === 'paused' && !restaurant.isPaused) return false;`
- Line 274: `if (capacity !== 'all' && getCapacityBucket(restaurant.activeOrderLimit) !== capacity) {`
- Line 277: `if (minRating > 0 && restaurant.averageRating < minRating) return false;`
- Line 282: `if (sort === 'name') {`
- Line 286: `if (sort === 'rating') {`
- Line 287: `if (right.averageRating !== left.averageRating) {`
- Line 294: `if (sort === 'minimum-order') {`
- Line 298: `if (sort === 'capacity') {`
- Line 302: `if (sort === 'oldest') {`
- Line 306: `if (sort === 'updated') {`

## Data Dependencies

- Models: `restaurant`, `user`
- Shared libs: `authOptions`, `mongoConnect`, `restaurantAvailability`, `reviewSummary`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `401`, `403`, `500`
- Common response fields detected: `value`, `fallback`, `allowedValues`, `values`, `query`, `or`, `name`, `regex`, `options`, `city`, `country`, `street`, `postalCode`, `description`, `email`, `contact`, `activeOrderLimit`, `req`, `error`, `filter`, `andFilters`, `lte`, `exists`, `images`, `size`, `blockedDates`, `in`, `createdAt`, `latitude`, `longitude`, `webAddress`, `tax`, `courierFee`, `minimumOrderAmount`, `averagePreparationMinutes`, `averageDeliveryMinutes`, `maxItemsPerOrder`, `deliveryRadiusKm`, `isPaused`, `pauseReason`, `workingHours`, `totalEmployees`, `imageCount`, `primaryImage`, `isOpen`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/admin/restaurants` does. Explain that it belongs to the super-admin and platform management workflow, serves `super admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
