# API Route: /api/notifications

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/notifications/route.ts`
- Route: `/api/notifications`
- HTTP methods: `GET`, `PATCH`
- Feature area: notifications and realtime refresh
- Main audience/roles: `signed-in customer`, `admin`, `courier`

## Plain-English Summary

Handles get/patch work for the notifications and realtime refresh area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/PATCH requests and converts request/session data into server-side business checks.
- It uses `notification`, `user` for persistence.
- It delegates shared logic to `authOptions`, `notificationEvents` so behavior stays consistent across the app.
- Detected local functions/handlers: `getCurrentUser`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 12: `if (!email) {`
- Line 23: `if (!user) {`
- Line 33: `if (unreadOnly) {`
- Line 49: `if (!user) {`
- Line 56: `if (!action || !['mark-read', 'mark-unread', 'mark-all-read'].includes(action)) {`
- Line 60: `if (action === 'mark-all-read') {`
- Line 68: `if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {`
- Line 83: `if (!updated) {`

## Data Dependencies

- Models: `notification`, `user`
- Shared libs: `authOptions`, `notificationEvents`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- May send email or app notifications.

## Response Behavior

- Status codes detected: `400`, `401`, `404`
- Common response fields detected: `request`, `error`, `baseFilter`, `recipientUserId`, `createdAt`, `isRead`, `set`, `readAt`, `type`, `success`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/notifications` does. Explain that it belongs to the notifications and realtime refresh workflow, serves `signed-in customer`, `admin`, `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
