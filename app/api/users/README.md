# API Route: /api/users

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/users/route.ts`
- Route: `/api/users`
- HTTP methods: `GET`, `DELETE`
- Feature area: user role management
- Main audience/roles: `super admin`

## Plain-English Summary

Handles get/delete work for the user role management area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/DELETE requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `adminUserDeletion`, `authOptions` so behavior stays consistent across the app.
- Detected local functions/handlers: `getUserOrderActivitySummary`, `skip`.

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

- Line 77: `if (!actorEmail) {`
- Line 83: `if (!actor || actor.role !== 'admin' || !superAdminEmail || actor.email !== superAdminEmail) {`
- Line 90: `if (id) {`
- Line 91: `if (!mongoose.Types.ObjectId.isValid(id)) {`
- Line 102: `if (!user) {`
- Line 140: `if (!actorEmail) {`
- Line 146: `if (!actor || actor.role !== 'admin' || !superAdminEmail || actor.email !== superAdminEmail) {`
- Line 153: `if (!id) {`
- Line 169: `if (error instanceof AdminUserDeletionError) {`

## Data Dependencies

- Models: `user`
- Shared libs: `adminUserDeletion`, `authOptions`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `500`
- Common response fields detected: `userId`, `or`, `orderStatus`, `in`, `and`, `ne`, `paid`, `orderPaid`, `match`, `group`, `totalSpent`, `sum`, `createdAt`, `lastOrderAt`, `request`, `error`, `email`, `user`, `targetUserId`, `message`, `details`, `admin`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/users` does. Explain that it belongs to the user role management workflow, serves `super admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
