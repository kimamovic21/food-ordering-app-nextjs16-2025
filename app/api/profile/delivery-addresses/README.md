# API Route: /api/profile/delivery-addresses

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/profile/delivery-addresses/route.ts`
- Route: `/api/profile/delivery-addresses`
- HTTP methods: `GET`, `POST`, `PATCH`, `DELETE`
- Feature area: profile and saved addresses
- Main audience/roles: `signed-in user`

## Plain-English Summary

Handles get/post/patch/delete work for the profile and saved addresses area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST/PATCH/DELETE requests and converts request/session data into server-side business checks.
- It uses `user` for persistence.
- It delegates shared logic to `authOptions`, `deliveryAddresses`, `mongoConnect` so behavior stays consistent across the app.
- Detected local functions/handlers: `getCurrentUser`.

## Request Inputs

- JSON body parsed with `req.json()`
- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 16: `if (!session?.user?.email) {`
- Line 27: `if (!user) {`
- Line 40: `if (!user) {`
- Line 46: `if (!result.ok) {`
- Line 51: `if (matchingAddress) {`
- Line 52: `if (result.address.isDefault && !matchingAddress.isDefault) {`
- Line 67: `if (currentAddresses.length >= MAX_SAVED_DELIVERY_ADDRESSES) {`
- Line 74: `if (result.address.isDefault || currentAddresses.length === 0) {`
- Line 105: `if (!user) {`
- Line 112: `if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {`
- Line 119: `if (!address) {`
- Line 140: `if (!user) {`
- Line 147: `if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {`
- Line 154: `if (!addressExists) {`
- Line 159: `if (nextAddresses.length > 0 && !nextAddresses.some((item: any) => item.isDefault)) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authOptions`, `deliveryAddresses`, `mongoConnect`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `201`, `400`, `401`, `404`
- Common response fields detected: `email`, `error`, `addresses`, `req`, `deliveryAddresses`, `address`, `duplicate`, `item`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/profile/delivery-addresses` does. Explain that it belongs to the profile and saved addresses workflow, serves `signed-in user`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
