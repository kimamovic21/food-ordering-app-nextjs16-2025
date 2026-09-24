# API Route: /api/reset-password

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/reset-password/route.ts`
- Route: `/api/reset-password`
- HTTP methods: `POST`
- Feature area: reset password
- Main audience/roles: `guest`, `signed-in user`

## Plain-English Summary

Completes password recovery by validating a reset token, enforcing strong-password rules, hashing the new password with bcrypt, and clearing the one-time reset token fields.

## What Happens In This File

- The route connects to MongoDB and parses the JSON request.
- Zod validates that the token exists, the new password passes `strongPasswordSchema`, and confirmation matches.
- The submitted raw token is hashed with `hashAuthToken`.
- MongoDB searches for a user whose stored `passwordResetTokenHash` matches and whose `passwordResetTokenExpiresAt` is still in the future.
- If no matching user exists, the route returns `400` with `Invalid or expired reset token`.
- Google OAuth accounts are rejected because the app does not own their password.
- Credentials users get a new bcrypt hash generated with a fresh salt.
- The user document is updated with the new password hash and `$unset` clears both reset-token fields.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `bcrypt`: compares current passwords and stores replacement passwords as hashes instead of plain text.

## Auth, Role, And Safety Checks

- This route is intentionally public because guests arrive from an email link after losing access to login.
- The reset token is the authorization mechanism; it must be valid, hashed, unexpired, and tied to a credentials account.
- Browser validation is repeated on the server so forged requests cannot bypass password strength or confirmation checks.

## Edge Cases Covered

- Line 18: `if (data.newPassword !== data.confirmNewPassword) {`
- Line 34: `if (!parsedBody.success) {`
- Line 49: `if (!user) {`
- Line 53: `if (user.provider !== 'credentials' || !user.password) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authEmails`, `password`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- Replaces the user's stored password hash.
- Clears `passwordResetTokenHash` and `passwordResetTokenExpiresAt` so the link cannot be reused.

## Response Behavior

- Status codes detected: `400`, `500`
- Common response fields detected: `token`, `message`, `newPassword`, `confirmNewPassword`, `code`, `path`, `req`, `error`, `passwordResetTokenHash`, `passwordResetTokenExpiresAt`, `gt`, `set`, `password`, `unset`, `success`, `ERROR`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/reset-password` does. Explain that this is the server-side gate that makes the emailed link safe: it hashes the submitted token, checks expiry, blocks OAuth accounts, validates the new password, stores a bcrypt hash, and invalidates the link after one successful use.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
