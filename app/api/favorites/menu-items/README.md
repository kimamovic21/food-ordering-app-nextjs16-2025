# API Route: /api/favorites/menu-items

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/favorites/menu-items/route.ts`
- Route: `/api/favorites/menu-items`
- HTTP methods: `GET`, `POST`
- Feature area: favorites
- Main audience/roles: `customer`

## Plain-English Summary

Handles get/post work for the favorites area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST requests and converts request/session data into server-side business checks.
- It uses `menuItem`, `user` for persistence.
- It delegates shared logic to `authOptions` so behavior stays consistent across the app.
- Detected local functions/handlers: `normalizeObjectIdString`, `getAuthorizedUser`.

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

- Line 10: `if (!value) return '';`
- Line 11: `if (typeof value === 'object' && value !== null && '$oid' in (value as Record<string, unknown>)) {`
- Line 14: `if (typeof value === 'string') return value;`
- Line 15: `if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {`
- Line 25: `if (!email) {`
- Line 39: `if (!user) {`
- Line 49: `if (favoriteIdStrings.length === 0) {`
- Line 64: `if (items.length === 0 && favoriteIdStrings.length > 0) {`
- Line 91: `if (fallbackIds.length > 0) {`
- Line 112: `if (!user) {`
- Line 119: `if (!menuItemId || !mongoose.Types.ObjectId.isValid(menuItemId)) {`
- Line 125: `if (!menuItem) {`
- Line 134: `if (`
- Line 163: `if (alreadyFavorite) {`

## Data Dependencies

- Models: `menuItem`, `user`
- Shared libs: `authOptions`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `500`
- Common response fields detected: `value`, `error`, `id`, `items`, `in`, `createdAt`, `Fallback`, `addFields`, `idString`, `toString`, `match`, `project`, `sort`, `req`, `or`, `favoriteMenuItems`, `exists`, `not`, `type`, `set`, `pull`, `addToSet`, `success`, `isFavorite`, `action`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/favorites/menu-items` does. Explain that it belongs to the favorites workflow, serves `customer`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
