# API Route: /api/restaurants

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/restaurants/route.ts`
- Route: `/api/restaurants`
- HTTP methods: `GET`
- Feature area: public restaurant discovery/details
- Main audience/roles: `customer`, `public visitor`

## Plain-English Summary

Handles get work for the public restaurant discovery/details area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `restaurant` for persistence.
- It delegates shared logic to `mongoConnect`, `restaurantAvailability`, `reviewSummary` so behavior stays consistent across the app.
- Detected local functions/handlers: `escapeRegex`, `parsePositiveInt`, `parseCoordinate`, `isValidCoordinatePair`, `parseMinRating`, `parseMaxMoney`, `normalizeDistinctStrings`, `createTextSearchFilter`, `compareNullableDistance`, `query`, `city`, `country`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 21: `if (!value) return fallback;`
- Line 23: `if (!Number.isFinite(parsed) || parsed <= 0) return fallback;`
- Line 28: `if (!value) return null;`
- Line 34: `if (latitude === null || longitude === null) {`
- Line 49: `if (!Number.isFinite(parsed) || parsed <= 0) return 0;`
- Line 55: `if (!Number.isFinite(parsed) || parsed <= 0) return null;`
- Line 66: `if (!query) {`
- Line 122: `if (city) {`
- Line 126: `if (country) {`
- Line 130: `if (maxMinimumOrder !== null) {`
- Line 178: `if (status === 'accepting' && !restaurant.isAcceptingOrders) return false;`
- Line 179: `if (status === 'open' && !restaurant.isOpen) return false;`
- Line 180: `if (status === 'closed' && restaurant.isOpen) return false;`
- Line 181: `if (status === 'paused' && !restaurant.isPaused) return false;`
- Line 182: `if (delivery === 'to-me' && restaurant.isWithinDeliveryRadius !== true) return false;`
- Line 183: `if (minRating > 0 && restaurant.averageRating < minRating) return false;`
- Line 188: `if (sort === 'name') {`
- Line 192: `if (sort === 'rating') {`
- Line 193: `if (right.averageRating !== left.averageRating) {`
- Line 200: `if (sort === 'minimum-order') {`
- Line 201: `if (left.minimumOrderAmount !== right.minimumOrderAmount) {`
- Line 208: `if (sort === 'nearest') {`
- Line 213: `if (sort === 'newest') {`
- Line 217: `if (left.isAcceptingOrders !== right.isAcceptingOrders) {`
- Line 221: `if (hasValidLocation) {`
- Line 223: `if (distanceSort) return distanceSort;`

## Data Dependencies

- Models: `restaurant`
- Shared libs: `mongoConnect`, `restaurantAvailability`, `reviewSummary`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `200`, `500`
- Common response fields detected: `value`, `fallback`, `parsed`, `latitude`, `longitude`, `allowedValues`, `values`, `query`, `or`, `name`, `regex`, `options`, `city`, `country`, `street`, `postalCode`, `description`, `left`, `right`, `req`, `filter`, `lte`, `createdAt`, `deliveryLatitude`, `deliveryLongitude`, `image`, `null`, `isOpen`, `isPaused`, `isAcceptingOrders`, `distanceKm`, `deliveryRadiusKm`, `minimumOrderAmount`, `averagePreparationMinutes`, `averageDeliveryMinutes`, `averageRating`, `ratingCount`, `isWithinDeliveryRadius`, `restaurants`, `filterOptions`, `cities`, `countries`, `pagination`, `pageSize`, `hasNextPage`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/restaurants` does. Explain that it belongs to the public restaurant discovery/details workflow, serves `customer`, `public visitor`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
