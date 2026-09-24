# API Route: /api/forgot-password

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/forgot-password/route.ts`
- Route: `/api/forgot-password`
- HTTP methods: `POST`
- Feature area: forgot password
- Main audience/roles: `guest`, `signed-in user`

## Plain-English Summary

Starts the password recovery workflow for credentials users. It accepts an email, rate-limits abuse, creates a one-hour reset token, stores only the token hash, and sends the raw token inside a Resend password reset email.

## What Happens In This File

- The route connects to MongoDB and safely parses the JSON request body.
- It normalizes the submitted email with `trim().toLowerCase()`.
- Empty email requests return `400`.
- Upstash-backed rate limiting allows only a small number of reset requests for the IP/email window.
- If the email is unknown, the API returns a generic success-style message so attackers cannot confirm registered accounts.
- If the account uses Google OAuth or has no local password, the API returns a message telling the user to use Google sign-in instead.
- For credentials users, it creates a random token with `crypto`, stores `hashAuthToken(token)`, sets `passwordResetTokenExpiresAt` to one hour from now, and calls `sendPasswordResetEmail`.
- Resend receives rendered HTML from `PasswordResetEmail`, but only after the token hash is already stored on the user.

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

- Line 18: `if (!email) {`
- Line 29: `if (!rateLimit.success) {`
- Line 38: `if (!user) {`
- Line 45: `if (user.provider !== 'credentials' || !user.password) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authEmails`, `rateLimit`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- May send email or app notifications.
- Writes `passwordResetTokenHash` and `passwordResetTokenExpiresAt` on the user document.
- Sends the raw token only by email; MongoDB stores the hash.

## Response Behavior

- Status codes detected: `400`, `500`
- Common response fields detected: `req`, `error`, `identifier`, `limit`, `namespace`, `window`, `success`, `message`, `canResetPassword`, `set`, `passwordResetTokenHash`, `passwordResetTokenExpiresAt`, `name`, `email`, `ERROR`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/forgot-password` does. Explain that it is deliberately privacy-preserving: it does not reveal whether an email exists, it blocks Google-only accounts from local password reset, it rate-limits attempts, and it sends a one-hour Resend reset link after storing only a hashed token.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
