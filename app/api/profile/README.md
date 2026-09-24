# API Route: /api/profile

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/profile/route.ts`
- Route: `/api/profile`
- HTTP methods: `PUT`, `GET`, `DELETE`
- Feature area: profile and saved addresses
- Main audience/roles: `signed-in user`

## Plain-English Summary

Handles put/get/delete work for the profile and saved addresses area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives PUT/GET/DELETE requests and converts request/session data into server-side business checks.
- It uses `menuItem`, `restaurant`, `user` for persistence.
- It delegates shared logic to `authOptions`, `cloudinary`, `orderDeletionGuards`, `phone` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `cloudinary`: stores uploaded user, restaurant, category, and menu-item images; cleanup logic removes replaced or deleted assets by public id.
- `@upstash/redis` and `@upstash/ratelimit`: protect sensitive routes from repeated abuse while keeping checks server-side.
- `bcrypt`: compares current passwords and stores replacement passwords as hashes instead of plain text.
- `libphonenumber-js`: normalizes and validates phone numbers before checkout/profile data is accepted.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 19: `if (!email) {`
- Line 35: `if (key in data) {`
- Line 40: `if ('phone' in data) {`
- Line 43: `if (rawPhone) {`
- Line 46: `if (!normalizedPhone) {`
- Line 69: `if (!email) {`
- Line 84: `if (!email) {`
- Line 91: `if (!user) {`
- Line 96: `if (user.image && user.image !== '/user-default-image.webp') {`
- Line 102: `if (match) {`
- Line 115: `if (restaurant) {`
- Line 117: `if (activeOrder) {`
- Line 136: `if (match) {`
- Line 153: `if (match) {`

## Data Dependencies

- Models: `menuItem`, `restaurant`, `user`
- Shared libs: `authOptions`, `cloudinary`, `orderDeletionGuards`, `phone`
- Shared types: `user`

## Side Effects

- Updates existing MongoDB documents.
- Deletes or cleans up MongoDB data.
- Touches Cloudinary media upload/delete behavior.

## Response Behavior

- Status codes detected: `400`, `401`, `404`, `409`
- Common response fields detected: `req`, `error`, `allowedFields`, `updateData`, `set`, `or`, `ownerId`, `activeOrderId`, `activeOrderStatus`, `images`, `restaurantId`, `pull`, `favoriteRestaurants`, `favoriteMenuItems`, `in`, `menuItem`, `success`, `message`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/profile` does. Explain that it belongs to the profile and saved addresses workflow, serves `signed-in user`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
