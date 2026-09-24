# API Route: /api/my-deliveries/[id]

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-deliveries/[id]/route.ts`
- Route: `/api/my-deliveries/[id]`
- HTTP methods: `GET`
- Feature area: courier delivery history
- Main audience/roles: `courier`

## Plain-English Summary

Handles get work for the courier delivery history area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `order`, `user` for persistence.
- It delegates shared logic to `authOptions` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `courier` role before allowing delivery operations.

## Edge Cases Covered

- Line 13: `if (!session?.user?.email) {`
- Line 19: `if (!user || user.role !== 'courier') {`
- Line 31: `if (!order) {`

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `authOptions`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `401`, `403`, `404`
- Common response fields detected: `request`, `id`, `error`, `email`, `courierId`, `orderStatus`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-deliveries/[id]` does. Explain that it belongs to the courier delivery history workflow, serves `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
