# API Route: /api/my-delivery/availability

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/my-delivery/availability/route.ts`
- Route: `/api/my-delivery/availability`
- HTTP methods: `GET`, `PATCH`
- Feature area: courier active delivery
- Main audience/roles: `courier`

## Plain-English Summary

Handles courier availability state for the active delivery area. It keeps the courier's online,
offline, and locked-break workflow server-authoritative and writes durable work-session data that can
later be shown to the courier or super admin.

## What Happens In This File

- `GET` returns the current courier availability state, break countdown metadata, break eligibility,
  and work-time summary.
- `PATCH` accepts an action such as `go-online`, `go-offline`, or `start-break`.
- The route loads the signed-in courier, delegates work-session rules to `libs/courierWorkSessions`,
  then returns a stable JSON state used by `/my-delivery`.
- It uses `User` for current status fields and `CourierWorkSession` for durable online/break history.
- Detected local functions/handlers: `userRole`.

## Request Inputs

- Optional JSON body:
  - `action: "go-online"` starts or resumes an online work session when the courier is inside their
    saved schedule.
  - `action: "go-offline"` completes the active work session unless a locked break is still running
    or the courier still has an assigned delivery.
  - `action: "start-break"` starts a 30-minute break when all break rules pass.
- If the body is missing, the route keeps backward-compatible toggle behavior.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `@date-fns/tz`: keeps courier schedule, break, and work-summary calculations pinned to
  `Europe/Sarajevo` instead of relying on the server machine timezone.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Only users with role `courier` can read or mutate courier availability.
- The server rejects break/online changes when the courier is outside schedule, still inside a locked
  break, already carrying an order, or has not worked long enough for a break.
- The server rejects `go-offline` while `takenOrder` is set, forcing the courier to finish or decline
  the active delivery before leaving the delivery pool.

## Edge Cases Covered

- Line 12: `if (!session?.user?.email) {`
- Line 19: `if (userRole !== 'courier') {`
- Line 26: `if (!currentUser) {`
- A courier cannot start a break before 60 minutes online.
- A courier cannot take a break unless the saved shift is at least 5 hours.
- A courier cannot start a break while assigned to an active order.
- A courier cannot go offline while assigned to an active delivery.
- A courier cannot end a break early by clicking online/offline repeatedly.
- Expired breaks are normalized server-side, closing the current work session and moving the courier
  back to offline.
- Stale active work sessions are auto-closed at the saved Sarajevo shift end when a courier leaves
  the app open, closes the browser, or production server time differs from local business time.

## Data Dependencies

- Models: `user`, `courierWorkSession`
- Shared libs: `authOptions`, `courierWorkSessions`
- Shared types: `CourierAvailabilityState`, `CourierWorkSummary`

## Side Effects

- Updates courier availability fields on `User`.
- Creates and completes `courier_work_sessions`.
- Appends break windows to the active work session.
- Calculates work summaries for today, week, month, and year using Sarajevo-local report
  boundaries.

## Response Behavior

- Status codes detected: `200`, `400`, `401`, `403`, `404`, `500`
- Common response fields: `availability`, `availabilityStatus`, `breakStartedAt`, `breakEndsAt`,
  `canStartBreak`, `breakUnavailableReason`, `currentSessionStartedAt`, `workSummary`, `message`,
  `error`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/my-delivery/availability` does. Explain that it is the
server authority for courier online/offline/break state. It prevents fake availability by checking
the saved courier schedule, active delivery state, minimum work time before break, and locked
30-minute break windows, then stores the time ledger used by courier and superadmin reports. The
time ledger is calculated in `Europe/Sarajevo`, so Vercel/server timezone differences do not shift
the courier's workday or weekly totals.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
