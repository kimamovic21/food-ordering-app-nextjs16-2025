# API Route: /api/restaurants/[id]/quick-reorder

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/restaurants/[id]/quick-reorder/route.ts`
- Route: `/api/restaurants/[id]/quick-reorder`
- HTTP methods: `POST`
- Feature area: public restaurant discovery/details
- Main audience/roles: `customer`, `public visitor`

## Plain-English Summary

Handles post work for the public restaurant discovery/details area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses `order`, `restaurant`, `user` for persistence.
- It delegates shared logic to `auditLog`, `authOptions`, `orderCartSnapshot` so behavior stays consistent across the app.
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

## Edge Cases Covered

- Line 18: `if (!session?.user?.email) {`
- Line 23: `if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {`
- Line 32: `if (!user) {`
- Line 36: `if (!restaurant) {`
- Line 48: `if (!order) {`

## Data Dependencies

- Models: `order`, `restaurant`, `user`
- Shared libs: `auditLog`, `authOptions`, `orderCartSnapshot`
- Shared types: None detected

## Side Effects

- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Common response fields detected: `id`, `error`, `email`, `userId`, `cartProducts`, `exists`, `ne`, `createdAt`, `message`, `actor`, `action`, `entityType`, `entityId`, `restaurantId`, `orderId`, `metadata`, `itemCount`, `sourceOrderId`, `restaurantName`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/restaurants/[id]/quick-reorder` does. Explain that it belongs to the public restaurant discovery/details workflow, serves `customer`, `public visitor`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
