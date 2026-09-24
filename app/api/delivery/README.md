# API Route: /api/delivery

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/delivery/route.ts`
- Route: `/api/delivery`
- HTTP methods: `POST`, `GET`
- Feature area: delivery
- Main audience/roles: `public or shared`

## Plain-English Summary

Handles post/get work for the delivery area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST/GET requests and converts request/session data into server-side business checks.
- It uses no direct Mongoose model imports for persistence.
- It delegates shared logic to `deliveryFeeCalculator` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 8: `if (latitude === undefined || longitude === undefined) {`
- Line 15: `if (typeof latitude !== 'number' || typeof longitude !== 'number') {`
- Line 19: `if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {`
- Line 44: `if (isNaN(latitude) || isNaN(longitude)) {`
- Line 51: `if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {`

## Data Dependencies

- Models: None detected
- Shared libs: `deliveryFeeCalculator`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `200`, `400`, `500`
- Common response fields detected: `request`, `error`, `coordinates`, `fee`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/delivery` does. Explain that it belongs to the delivery workflow, serves `public or shared`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
