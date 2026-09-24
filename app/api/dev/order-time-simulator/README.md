# API Route: /api/dev/order-time-simulator

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/dev/order-time-simulator/route.ts`
- Route: `/api/dev/order-time-simulator`
- HTTP methods: `GET`, `PATCH`, `DELETE`
- Feature area: dev
- Main audience/roles: `developer`

## Plain-English Summary

Handles get/patch/delete work for the dev area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/PATCH/DELETE requests and converts request/session data into server-side business checks.
- It uses `order`, `user` for persistence.
- It delegates shared logic to `authOptions`, `devOrderTimeSimulator`, `devOrderTimeSimulatorStore` so behavior stays consistent across the app.
- Detected local functions/handlers: `ensureDevelopmentUser`, `getOrderIdFromRequest`.

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

- Line 14: `if (process.env.NODE_ENV !== 'development') {`
- Line 21: `if (!email) {`
- Line 29: `if (!user || !allowedRoles.includes(user.role)) {`
- Line 44: `if (!orderId) {`
- Line 49: `if ('error' in auth) return auth.error;`
- Line 51: `if (!['admin', 'courier'].includes(auth.user.role)) {`
- Line 56: `if (!order) {`
- Line 66: `if ('error' in auth) return auth.error;`
- Line 71: `if (!orderId) {`
- Line 85: `if ('error' in auth) return auth.error;`
- Line 88: `if (!orderId) {`

## Data Dependencies

- Models: `order`, `user`
- Shared libs: `authOptions`, `devOrderTimeSimulator`, `devOrderTimeSimulatorStore`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`
- Common response fields detected: `error`, `request`, `userId`, `offsets`, `success`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/dev/order-time-simulator` does. Explain that it belongs to the dev workflow, serves `developer`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
