# API Route: /api/profile/change-password

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/profile/change-password/route.ts`
- Route: `/api/profile/change-password`
- HTTP methods: `PUT`
- Feature area: profile and saved addresses
- Main audience/roles: `signed-in user`

## Plain-English Summary

Handles put work for the profile and saved addresses area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives PUT requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authOptions`, `password`, `rateLimit` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `@upstash/redis` and `@upstash/ratelimit`: protect sensitive routes from repeated abuse while keeping checks server-side.
- `bcrypt`: compares current passwords and stores replacement passwords as hashes instead of plain text.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Applies Upstash Redis-backed rate limiting.

## Edge Cases Covered

- Line 28: `if (data.newPassword !== data.confirmNewPassword) {`
- Line 43: `if (!email) {`
- Line 54: `if (!rateLimit.success) {`
- Line 64: `if (!parsedBody.success) {`
- Line 75: `if (!user) {`
- Line 79: `if (!user.password || !bcrypt.compareSync(parsedBody.data.currentPassword, user.password)) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authOptions`, `password`, `rateLimit`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Common response fields detected: `currentPassword`, `message`, `newPassword`, `confirmNewPassword`, `code`, `path`, `req`, `error`, `identifier`, `limit`, `namespace`, `window`, `set`, `password`, `success`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/profile/change-password` does. Explain that it belongs to the profile and saved addresses workflow, serves `signed-in user`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
