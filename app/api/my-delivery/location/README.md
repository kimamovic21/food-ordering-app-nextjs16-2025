# API Route: /api/my-delivery/location

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-delivery/location/route.ts`
- Route: `/api/my-delivery/location`
- HTTP methods: `POST`, `GET`
- Feature area: courier active delivery
- Main audience/roles: `courier`

## Plain-English Summary

Handles post/get work for the courier active delivery area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST/GET requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authOptions` so behavior stays consistent across the app.
- Detected local functions/handlers: `calculateDistance`, `dLat`, `dLon`.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `courier` role before allowing delivery operations.

## Edge Cases Covered

- Line 28: `if (!session || !session.user) {`
- Line 35: `if (!user || user.role !== 'courier') {`
- Line 43: `if (latitude === undefined || longitude === undefined) {`
- Line 47: `if (typeof latitude !== 'number' || typeof longitude !== 'number') {`
- Line 52: `if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {`
- Line 57: `if (user.latitude !== null && user.longitude !== null) {`
- Line 60: `if (distance > MAX_DISTANCE_KM) {`
- Line 102: `if (!session || !session.user) {`
- Line 109: `if (!user || user.role !== 'courier') {`

## Data Dependencies

- Models: `user`
- Shared libs: `authOptions`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `500`
- Common response fields detected: `lat1`, `lon1`, `lat2`, `lon2`, `request`, `error`, `email`, `rejected`, `lastLocationUpdate`, `message`, `location`, `latitude`, `longitude`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-delivery/location` does. Explain that it belongs to the courier active delivery workflow, serves `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
