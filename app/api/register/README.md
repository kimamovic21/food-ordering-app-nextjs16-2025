# API Route: /api/register

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/register/route.ts`
- Route: `/api/register`
- HTTP methods: `POST`
- Feature area: register
- Main audience/roles: `guest`, `signed-in user`

## Plain-English Summary

Creates a credentials account, rate-limits registration attempts, hashes the password, assigns the first user as admin, and starts email verification unless local verification skipping is enabled.

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
- `bcrypt`: compares current passwords and stores replacement passwords as hashes instead of plain text.

## Auth, Role, And Safety Checks

- Applies Upstash Redis-backed rate limiting.

## Edge Cases Covered

- Line 28: `if (!rateLimit.success) {`
- Line 35: `if (!process.env.MONGODB_URL) {`
- Line 43: `if (!pass || pass.length < 5) {`
- Line 48: `if (existingUser) {`
- Line 81: `if (verificationToken && process.env.RESEND_API_KEY) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authEmails`, `rateLimit`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- May send email or app notifications.

## Response Behavior

- Status codes detected: `201`, `400`, `500`
- Common response fields detected: `req`, `identifier`, `limit`, `namespace`, `window`, `error`, `email`, `null`, `name`, `password`, `provider`, `phone`, `streetAddress`, `postalCode`, `city`, `country`, `emailVerifiedAt`, `emailVerificationTokenHash`, `emailVerificationTokenExpiresAt`, `availability`, `takenOrder`, `restaurantId`, `token`, `verificationRequired`, `ERROR`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/register` does. Explain that it belongs to the register workflow, serves `guest`, `signed-in user`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
