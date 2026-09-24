# API Route: /api/audit-logs

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/audit-logs/route.ts`
- Route: `/api/audit-logs`
- HTTP methods: `GET`
- Feature area: audit logs
- Main audience/roles: `super admin`, `admin`

## Plain-English Summary

Handles get work for the audit logs area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `auditLog`, `restaurant`, `user` for persistence.
- It delegates shared logic to `authOptions` so behavior stays consistent across the app.
- Detected local functions/handlers: `serializeAuditLog`, `escapeRegExp`, `search`, `action`, `actorEmail`, `entityType`, `checkoutBlockReason`, `skip`.

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

- Line 27: `if (!session?.user?.email) {`
- Line 32: `if (!user || user.role !== 'admin') {`
- Line 41: `if (!isSuperAdmin) {`
- Line 46: `if (!restaurant) {`
- Line 71: `if (search) {`
- Line 86: `if (action) {`
- Line 90: `if (actorEmail) {`
- Line 97: `if (entityType) {`
- Line 101: `if (checkoutBlockReason) {`

## Data Dependencies

- Models: `auditLog`, `restaurant`, `user`
- Shared libs: `authOptions`
- Shared types: None detected

## Side Effects

- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `401`, `403`
- Common response fields detected: `log`, `actorEmail`, `actorRole`, `action`, `entityType`, `entityId`, `restaurantId`, `orderId`, `metadata`, `createdAt`, `value`, `request`, `error`, `email`, `query`, `ownerId`, `or`, `gte`, `lte`, `logs`, `totalPages`, `filters`, `availableActions`, `availableCheckoutBlockReasons`, `availableEntityTypes`, `summary`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/audit-logs` does. Explain that it belongs to the audit logs workflow, serves `super admin`, `admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
