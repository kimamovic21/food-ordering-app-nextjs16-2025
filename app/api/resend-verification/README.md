# API Route: /api/resend-verification

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/resend-verification/route.ts`
- Route: `/api/resend-verification`
- HTTP methods: `POST`
- Feature area: resend verification
- Main audience/roles: `guest`, `signed-in user`

## Plain-English Summary

Handles post work for the resend verification area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authEmails`, `rateLimit` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `@upstash/redis` and `@upstash/ratelimit`: protect sensitive routes from repeated abuse while keeping checks server-side.

## Auth, Role, And Safety Checks

- Applies Upstash Redis-backed rate limiting.

## Edge Cases Covered

- Line 23: `if (!email) {`
- Line 34: `if (!rateLimit.success) {`
- Line 41: `if (isSkipVerifyEmail()) {`
- Line 50: `if (!user) {`
- Line 57: `if (user.provider !== 'credentials') {`
- Line 64: `if (user.emailVerifiedAt) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authEmails`, `rateLimit`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- May send email or app notifications.

## Response Behavior

- Status codes detected: `400`, `500`
- Common response fields detected: `req`, `error`, `identifier`, `limit`, `namespace`, `window`, `success`, `message`, `set`, `emailVerificationTokenHash`, `emailVerificationTokenExpiresAt`, `name`, `email`, `ERROR`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/resend-verification` does. Explain that it belongs to the resend verification workflow, serves `guest`, `signed-in user`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
