# API Route: /api/restaurants/[id]/ordering-status

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/restaurants/[id]/ordering-status/route.ts`
- Route: `/api/restaurants/[id]/ordering-status`
- HTTP methods: `GET`
- Feature area: public restaurant discovery/details
- Main audience/roles: `customer`, `public visitor`

## Plain-English Summary

Returns the current restaurant accepting-order status used before add-to-cart and checkout, including open/paused/busy state, capacity, ETA, quantity limits, and courier readiness.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `restaurant` for persistence.
- It delegates shared logic to `mongoConnect`, `restaurantAvailabilityRequests`, `restaurantOrderingStatus` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- dynamic route params from the App Router context

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 12: `if (!id || !mongoose.Types.ObjectId.isValid(id)) {`
- Line 22: `if (!restaurant) {`

## Data Dependencies

- Models: `restaurant`
- Shared libs: `mongoConnect`, `restaurantAvailabilityRequests`, `restaurantOrderingStatus`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `404`
- Common response fields detected: `context`, `id`, `error`, `includeCourierReadiness`, `restaurantId`, `restaurantName`, `isAcceptingOrders`, `isOpen`, `isPaused`, `isBusy`, `activeKitchenOrders`, `activeOrderLimit`, `availableCouriers`, `capacityMessage`, `capacitySlotsRemaining`, `courierReadinessDelayMinutes`, `courierReadinessMessage`, `courierReadinessTone`, `estimatedPreparationMinutes`, `estimatedDeliveryMinutes`, `estimatedTotalMinutes`, `etaDelayMinutes`, `etaMessage`, `etaTone`, `isCourierReady`, `maxItemsPerOrder`, `orderingMessage`, `reason`, `totalCouriers`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/restaurants/[id]/ordering-status` does. Explain that it belongs to the public restaurant discovery/details workflow, serves `customer`, `public visitor`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
