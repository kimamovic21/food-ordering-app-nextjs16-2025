# API Route: /api/my-delivery/schedule

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-delivery/schedule/route.ts`
- Route: `/api/my-delivery/schedule`
- HTTP methods: `GET`, `PATCH`
- Feature area: courier active delivery
- Main audience/roles: `courier`

## Plain-English Summary

Handles courier schedule reads and updates for the active delivery area. The route keeps the saved
working-hours rules server-authoritative so assignment, availability, breaks, and readiness checks all
use the same schedule.

## What Happens In This File

- `GET` returns normalized weekday working hours.
- `PATCH` validates and saves normalized weekday working hours.
- The route rejects schedule edits while the courier is online or on break. This prevents a courier
  from changing the active shift while a work session is being counted.
- Validation is delegated to `libs/courierSchedule`, including no overnight shifts and the delivery
  service window.
- Detected local functions/handlers: `getCourier`.

## Request Inputs

- JSON body for `PATCH`: `{ workingHours: CourierWorkingHour[] }`.
- Each day must use `HH:mm` time strings and a known weekday key.
- Available shifts must start before they end and stay between `08:00` and `23:00`.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `courier` role before allowing delivery operations.
- Blocks updates while `availability` is true or `courierAvailabilityStatus` is `online`/`on_break`.

## Edge Cases Covered

- Line 10: `if (!session?.user?.email) {`
- Line 16: `if (!user || user.role !== 'courier') {`
- Line 30: `if (error) return error;`
- Line 46: `if (error) return error;`
- Line 51: `if (validationError) {`
- Rejects `23:00` to `08:00` overnight shifts.
- Rejects shifts before 08:00 or after 23:00.
- Normalizes missing days back to the default courier schedule.
- Keeps unavailable days in the schedule while ignoring their start/end range for assignment checks.

## Data Dependencies

- Models: `user`
- Shared libs: `authOptions`, `courierSchedule`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `500`
- Common response fields detected: `error`, `email`, `workingHours`, `schedule`, `request`, `message`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-delivery/schedule` does. Explain that it saves the
courier's weekly work plan and protects the rest of the delivery system from unrealistic shift data.
Couriers cannot save overnight work like `23:00-08:00`, cannot work outside the supported delivery
window, and cannot edit the schedule while an online session or locked break is active.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
