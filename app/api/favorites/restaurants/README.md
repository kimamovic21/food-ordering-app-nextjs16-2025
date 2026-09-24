# API Route: /api/favorites/restaurants

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/favorites/restaurants/route.ts`
- Route: `/api/favorites/restaurants`
- HTTP methods: `GET`, `POST`
- Feature area: favorites
- Main audience/roles: `customer`

## Plain-English Summary

Handles get/post work for the favorites area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST requests and converts request/session data into server-side business checks.
- It uses `restaurant`, `user` for persistence.
- It delegates shared logic to `authOptions`, `reviewSummary` so behavior stays consistent across the app.
- Detected local functions/handlers: `getAuthorizedUser`, `isRestaurantOpen`.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 12: `if (!email) {`
- Line 33: `if (Number.isNaN(blockedDate.getTime())) {`
- Line 44: `if (isBlocked) {`
- Line 52: `if (!todayHours || todayHours.isClosed) {`
- Line 59: `if (`
- Line 80: `if (!user) {`
- Line 121: `if (!user) {`
- Line 128: `if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {`
- Line 134: `if (!restaurant) {`
- Line 142: `if (`
- Line 169: `if (alreadyFavorite) {`

## Data Dependencies

- Models: `restaurant`, `user`
- Shared libs: `authOptions`, `reviewSummary`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`
- Common response fields detected: `workingHours`, `day`, `openTime`, `closeTime`, `blockedDates`, `date`, `targetDate`, `error`, `in`, `createdAt`, `name`, `city`, `country`, `street`, `description`, `image`, `null`, `isOpen`, `averageRating`, `ratingCount`, `restaurants`, `req`, `id`, `or`, `favoriteRestaurants`, `exists`, `not`, `type`, `set`, `pull`, `addToSet`, `success`, `isFavorite`, `action`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/favorites/restaurants` does. Explain that it belongs to the favorites workflow, serves `customer`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
