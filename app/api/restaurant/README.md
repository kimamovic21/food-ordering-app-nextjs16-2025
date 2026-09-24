# API Route: /api/restaurant

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/restaurant/route.ts`
- Route: `/api/restaurant`
- HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
- Feature area: restaurant-owner operations
- Main audience/roles: `restaurant admin`

## Plain-English Summary

Handles get/post/put/delete work for the restaurant-owner operations area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST/PUT/DELETE requests and converts request/session data into server-side business checks.
- It uses `menuItem`, `restaurant`, `user` for persistence.
- It delegates shared logic to `auditLog`, `authOptions`, `cloudinary`, `mongoConnect`, `orderDeletionGuards`, `orderQuantityLimits`, `restaurantAvailabilityRequests`, `restaurantOrderingStatus` so behavior stays consistent across the app.
- Detected local functions/handlers: `normalizeBlockedDates`, `sanitizeRestaurantPayload`, `legacyTaxRules`, `legacyImage`.

## Request Inputs

- JSON body parsed with `req.json()`
- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `cloudinary`: stores uploaded user, restaurant, category, and menu-item images; cleanup logic removes replaced or deleted assets by public id.
- `@react-pdf/renderer`: creates downloadable/report PDF output for admin reporting flows.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `admin` role before allowing restaurant/admin operations.

## Edge Cases Covered

- Line 21: `if (!Array.isArray(blockedDates)) {`
- Line 31: `if (!reason || Number.isNaN(rawDate.getTime())) {`
- Line 83: `if (Array.isArray(body.images)) {`
- Line 87: `} else if (typeof body.image === 'string' && body.image.trim() !== '') {`
- Line 120: `if (includeId && body._id) {`
- Line 132: `if (!session?.user?.email) {`
- Line 138: `if (!user || user.role !== 'admin') {`
- Line 148: `if (!restaurant) {`
- Line 154: `if (legacyTaxRules && legacyTaxRules.length > 0) {`
- Line 169: `if (legacyImage && (!restaurant.images || restaurant.images.length === 0)) {`
- Line 218: `if (!session?.user?.email) {`
- Line 224: `if (!user || user.role !== 'admin') {`
- Line 230: `if (existingRestaurant) {`
- Line 238: `if (`
- Line 248: `if (payload.minimumOrderAmount < 1 || payload.minimumOrderAmount > 100) {`
- Line 255: `if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {`
- Line 262: `if (payload.images.length > 5) {`
- Line 313: `if (error instanceof Error && error.message.includes('Invalid blocked date')) {`
- Line 325: `if (!session?.user?.email) {`
- Line 331: `if (!user || user.role !== 'admin') {`
- Line 340: `if (`
- Line 350: `if (updateData.minimumOrderAmount < 1 || updateData.minimumOrderAmount > 100) {`
- Line 357: `if (!updateData.images || !Array.isArray(updateData.images) || updateData.images.length === 0) {`
- Line 364: `if (updateData.images.length > 5) {`
- Line 371: `if (!restaurant) {`
- Line 403: `if (updatedRestaurant) {`
- Line 417: `if (error instanceof Error && error.message.includes('Invalid blocked date')) {`
- Line 429: `if (!session?.user?.email) {`
- Line 435: `if (!user || user.role !== 'admin') {`
- Line 442: `if (!restaurantId) {`
- Line 449: `if (!restaurant) {`
- Line 457: `if (activeOrder) {`
- Line 470: `if (restaurant.images && Array.isArray(restaurant.images) && restaurant.images.length > 0) {`
- Line 475: `if (imageUrl && imageUrl.trim() !== '') {`
- Line 479: `if (publicId) {`
- Line 499: `if (menuItem.image) {`

## Data Dependencies

- Models: `menuItem`, `restaurant`, `user`
- Shared libs: `auditLog`, `authOptions`, `cloudinary`, `mongoConnect`, `orderDeletionGuards`, `orderQuantityLimits`, `restaurantAvailabilityRequests`, `restaurantOrderingStatus`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- Updates existing MongoDB documents.
- Deletes or cleans up MongoDB data.
- Touches Cloudinary media upload/delete behavior.
- Writes or reads audit-log records.

## Response Behavior

- Status codes detected: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`
- Common response fields detected: `blockedDates`, `date`, `reason`, `normalized`, `valid`, `body`, `includeId`, `tax`, `courierFee`, `minimumOrderAmount`, `averagePreparationMinutes`, `averageDeliveryMinutes`, `activeOrderLimit`, `maxItemsPerOrder`, `deliveryRadiusKm`, `totalEmployees`, `images`, `compatibility`, `payload`, `name`, `street`, `city`, `postalCode`, `country`, `latitude`, `longitude`, `contact`, `email`, `webAddress`, `description`, `isPaused`, `pauseReason`, `workingHours`, `error`, `ownerId`, `restaurant`, `percentage`, `set`, `unset`, `taxRules`, `image`, `includeCourierReadiness`, `orderingLoad`, `activeKitchenOrders`, `availableCouriers`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/restaurant` does. Explain that it belongs to the restaurant-owner operations workflow, serves `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
