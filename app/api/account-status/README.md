# API Route: /api/account-status

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/account-status/route.ts`
- Route: `/api/account-status`
- HTTP methods: `POST`
- Feature area: account status
- Main audience/roles: `guest`, `signed-in user`

## Plain-English Summary

Handles post work for the account status area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to no direct shared libs detected so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 11: `if (!email) {`
- Line 17: `if (!user) {`

## Data Dependencies

- Models: `user`
- Shared libs: None detected
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `500`
- Common response fields detected: `req`, `error`, `found`, `canResetPassword`, `provider`, `emailVerified`, `ERROR`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/account-status` does. Explain that it belongs to the account status workflow, serves `guest`, `signed-in user`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
