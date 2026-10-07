# API Route: /api/orders/queue

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/orders/queue/route.ts`
- Route: `/api/orders/queue`
- HTTP methods: `GET`
- Feature area: order operations
- Main audience/roles: `admin`, `restaurant admin`

## Plain-English Summary

Handles the restaurant kitchen order queue. The route keeps the local workflow server-authoritative, filters active restaurant orders, applies courier/order cleanup rules, emits late-order alerts when needed, and returns a stable payload for the `/admin-dashboard/order-queue` UI.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `notification`, `order`, `user` for persistence.
- It delegates shared logic to `authOptions`, `courierAssignmentTimeout`, `notifications`, `orderAutoCancellation` so behavior stays consistent across the app.
- It normalizes `cartProducts` into a kitchen-safe shape with `name`, `quantity`, `size`, and `note` so the queue UI can display item notes without trusting raw MongoDB document shape.
- It returns `itemCount` and `hasItemNotes` for compact kitchen badges and quick scanning.
- Detected local functions/handlers: `normalizeQueueCartProducts`, `normalizeOrder`, `getMinutesSince`, `orders`.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `admin` role before allowing restaurant/admin operations.

## Edge Cases Covered

- Returns `401` when there is no signed-in user.
- Returns `401` when the signed-in user is not an admin.
- Returns `403` when the admin is not assigned to a restaurant.
- Avoids duplicate late-order notifications by checking for an existing matching notification first.
- Cart product data is normalized defensively so missing names, invalid quantities, missing sizes, or missing notes do not break the kitchen queue.

## Data Dependencies

- Models: `notification`, `order`, `user`
- Shared libs: `authOptions`, `courierAssignmentTimeout`, `notifications`, `orderAutoCancellation`
- Shared types: None detected

## Side Effects

- May send email or app notifications.

## Response Behavior

- Status codes detected: `401`, `403`
- Common response fields detected: `order`, `paymentStatus`, `orderStatus`, `date`, `error`, `email`, `restaurantId`, `in`, `createdAt`, `minutesSincePlaced`, `orderId`, `type`, `reason`, `orders`, `cartProducts`, `itemCount`, `hasItemNotes`, `isCourierAssignmentExpired`, `isReadyWithoutCourierLate`, `isLateBeforeTransport`, `lateThresholdMinutes`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/orders/queue` does. Explain that it is the server source for the kitchen board: it proves the signed-in admin owns a restaurant, loads only active orders for that restaurant, applies courier timeout and auto-cancel rules, sends late-order notifications once, and returns normalized order cards with item counts and per-item notes.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
