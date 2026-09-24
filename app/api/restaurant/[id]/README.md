# API Route: /api/restaurant/[id]

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/restaurant/[id]/route.ts`
- Route: `/api/restaurant/[id]`
- HTTP methods: `GET`
- Feature area: restaurant-owner operations
- Main audience/roles: `restaurant admin`

## Plain-English Summary

Handles get work for the restaurant-owner operations area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `restaurant` for persistence.
- It delegates shared logic to `mongoConnect`, `restaurantAvailabilityRequests`, `restaurantOrderingStatus`, `reviewSummary` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- dynamic route params from the App Router context

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 14: `if (!id) {`
- Line 20: `if (!restaurant) {`

## Data Dependencies

- Models: `restaurant`
- Shared libs: `mongoConnect`, `restaurantAvailabilityRequests`, `restaurantOrderingStatus`, `reviewSummary`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `200`, `400`, `404`, `500`
- Common response fields detected: `req`, `context`, `id`, `error`, `includeCourierReadiness`, `restaurantId`, `restaurantName`, `isAcceptingOrders`, `restaurant`, `name`, `street`, `city`, `postalCode`, `country`, `latitude`, `longitude`, `contact`, `email`, `webAddress`, `description`, `images`, `tax`, `courierFee`, `minimumOrderAmount`, `averagePreparationMinutes`, `averageDeliveryMinutes`, `activeOrderLimit`, `maxItemsPerOrder`, `deliveryRadiusKm`, `activeKitchenOrders`, `availableCouriers`, `capacityMessage`, `capacitySlotsRemaining`, `courierReadinessDelayMinutes`, `courierReadinessMessage`, `courierReadinessTone`, `estimatedPreparationMinutes`, `estimatedDeliveryMinutes`, `estimatedTotalMinutes`, `etaDelayMinutes`, `etaMessage`, `etaTone`, `isCourierReady`, `isBusy`, `isNearCapacity`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/restaurant/[id]` does. Explain that it belongs to the restaurant-owner operations workflow, serves `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
