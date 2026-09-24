# API Route: /api/courier-earnings

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/courier-earnings/route.ts`
- Route: `/api/courier-earnings`
- HTTP methods: `GET`
- Feature area: courier earnings
- Main audience/roles: `courier`

## Plain-English Summary

Handles get work for the courier earnings area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authOptions`, `courierEarnings`, `mongoConnect` so behavior stays consistent across the app.
- Detected local functions/handlers: `isSameId`.

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
- Checks the `courier` role before allowing delivery operations.

## Edge Cases Covered

- Line 15: `if (!session?.user?.email) {`
- Line 21: `if (!requester) {`
- Line 33: `if (!mongoose.Types.ObjectId.isValid(String(courierId))) {`
- Line 37: `if (requestedCourierId && !isSuperAdmin && !isSameId(requester._id, requestedCourierId)) {`
- Line 44: `if (!requestedCourierId && requester.role !== 'courier') {`
- Line 50: `if (!courier || courier.role !== 'courier') {`

## Data Dependencies

- Models: `user`
- Shared libs: `authOptions`, `courierEarnings`, `mongoConnect`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`
- Common response fields detected: `left`, `right`, `request`, `error`, `email`, `courier`, `name`, `image`, `availability`, `createdAt`, `orders`, `earningsChart`, `summary`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/courier-earnings` does. Explain that it belongs to the courier earnings workflow, serves `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
