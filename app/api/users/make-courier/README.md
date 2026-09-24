# API Route: /api/users/make-courier

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/users/make-courier/route.ts`
- Route: `/api/users/make-courier`
- HTTP methods: `PATCH`
- Feature area: user role management
- Main audience/roles: `super admin`

## Plain-English Summary

Handles patch work for the user role management area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives PATCH requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authGuards`, `userRoleAudit` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 9: `if (!(await isAdmin())) {`
- Line 15: `if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {`
- Line 21: `if (!user) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authGuards`, `userRoleAudit`
- Shared types: None detected

## Side Effects

- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Common response fields detected: `request`, `error`, `targetUser`, `nextRole`, `action`, `user`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/users/make-courier` does. Explain that it belongs to the user role management workflow, serves `super admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
