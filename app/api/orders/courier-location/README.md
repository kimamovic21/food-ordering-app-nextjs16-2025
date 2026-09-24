# API Route: /api/orders/courier-location

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/orders/courier-location/route.ts`
- Route: `/api/orders/courier-location`
- HTTP methods: `GET`
- Feature area: order operations
- Main audience/roles: `admin`, `restaurant admin`

## Plain-English Summary

Handles get work for the order operations area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `order`, `user` for persistence.
- It delegates shared logic to `authOptions` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

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

- Line 12: `if (!session || !session.user) {`
- Line 20: `if (!user) {`
- Line 27: `if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 35: `if (!order) {`
- Line 40: `if (user.role !== 'admin' && order.email !== userEmail) {`
- Line 48: `if (!courier) {`
- Line 52: `if (!courier) {`

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `authOptions`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `500`
- Common response fields detected: `request`, `error`, `email`, `authorization`, `courier`, `Fallback`, `takenOrder`, `location`, `message`, `latitude`, `longitude`, `lastLocationUpdate`, `name`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/orders/courier-location` does. Explain that it belongs to the order operations workflow, serves `admin`, `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
