# API Route: /api/verify-email

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/verify-email/route.ts`
- Route: `/api/verify-email`
- HTTP methods: `POST`
- Feature area: verify email
- Main audience/roles: `guest`, `signed-in user`

## Plain-English Summary

Handles post work for the verify email area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authEmails` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 12: `if (!token) {`
- Line 22: `if (!user) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authEmails`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `500`
- Common response fields detected: `req`, `error`, `emailVerificationTokenHash`, `emailVerificationTokenExpiresAt`, `gt`, `set`, `emailVerifiedAt`, `unset`, `success`, `message`, `ERROR`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/verify-email` does. Explain that it belongs to the verify email workflow, serves `guest`, `signed-in user`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
