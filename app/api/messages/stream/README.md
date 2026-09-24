# API Route: /api/messages/stream

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/messages/stream/route.ts`
- Route: `/api/messages/stream`
- HTTP methods: `GET`
- Feature area: role-approved messaging
- Main audience/roles: `signed-in customer`, `admin`, `courier`

## Plain-English Summary

Handles get work for the role-approved messaging area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authOptions`, `messageEvents` so behavior stays consistent across the app.
- Detected local functions/handlers: `getCurrentUser`, `cleanup`, `enqueue`, `send`.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 11: `if (!email) {`
- Line 24: `if (!currentUser) {`
- Line 34: `if (isClosed) {`
- Line 42: `if (heartbeatTimer) {`
- Line 53: `if (isClosed) {`
- Line 68: `if (request.signal.aborted) {`
- Line 78: `if (event.senderUserId === currentUserId || event.recipientUserId === currentUserId) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authOptions`, `messageEvents`
- Shared types: None detected

## Side Effects

- May send email or app notifications.
- Streams realtime/SSE events.

## Response Behavior

- Status codes detected: `401`
- Common response fields detected: `request`, `heartbeatTimer`, `unsubscribe`, `chunk`, `payload`, `data`, `once`, `type`, `isIncoming`, `Connection`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/messages/stream` does. Explain that it belongs to the role-approved messaging workflow, serves `signed-in customer`, `admin`, `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
