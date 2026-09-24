# API Route: /api/menu-items

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/menu-items/route.ts`
- Route: `/api/menu-items`
- HTTP methods: `POST`, `GET`, `PUT`, `PATCH`, `DELETE`
- Feature area: menu items
- Main audience/roles: `admin`, `restaurant admin`

## Plain-English Summary

Handles post/get/put/patch/delete work for the menu items area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST/GET/PUT/PATCH/DELETE requests and converts request/session data into server-side business checks.
- It uses `category`, `menuItem`, `user` for persistence.
- It delegates shared logic to `authGuards`, `authOptions`, `cloudinary`, `orderDeletionGuards`, `orderQuantityLimits`, `reviewSummary` so behavior stays consistent across the app.
- Detected local functions/handlers: `escapeRegex`, `parseNumber`, `parsePositiveInt`, `isValidPriceType`, `resolvePriceType`, `hasRequiredPricesByType`, `toCategorySlug`, `buildSort`, `skip`.

## Request Inputs

- JSON body parsed with `req.json()`
- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `cloudinary`: stores uploaded user, restaurant, category, and menu-item images; cleanup logic removes replaced or deleted assets by public id.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 17: `if (!value) return null;`
- Line 23: `if (!value) return fallback;`
- Line 25: `if (!Number.isFinite(parsed) || parsed <= 0) return fallback;`
- Line 33: `if (isValidPriceType(data.priceType)) {`
- Line 38: `if (legacyFoodType === 'drink') {`
- Line 42: `if (data.priceLarge != null && data.priceLarge !== '') {`
- Line 46: `if (data.priceMedium != null && data.priceMedium !== '') {`
- Line 89: `if (!(await isAdmin())) {`
- Line 95: `if (!session?.user?.email) {`
- Line 100: `if (!currentUser) {`
- Line 105: `if (!currentUser.restaurantId) {`
- Line 116: `if (!hasRequiredPricesByType(priceType, data)) {`
- Line 125: `if (data.image && typeof data.image === 'string') {`
- Line 126: `if (!data.image.startsWith('http')) {`
- Line 176: `if (_id) {`
- Line 178: `if (!item) return Response.json([]);`
- Line 184: `if (adminId) {`
- Line 190: `if (groupBy === 'category') {`
- Line 223: `if (hasAdvancedQuery) {`
- Line 226: `if (query) {`
- Line 234: `if (categoriesParam) {`
- Line 250: `if (slugValues.length > 0) {`
- Line 284: `if (minPrice != null || maxPrice != null) {`
- Line 286: `if (minPrice != null) priceMatch.$gte = minPrice;`
- Line 287: `if (maxPrice != null) priceMatch.$lte = maxPrice;`
- Line 326: `if (!(await isAdmin())) {`
- Line 332: `if (!session?.user?.email) {`
- Line 337: `if (!currentUser) {`
- Line 345: `if (!existingItem) {`
- Line 349: `if (existingItem.adminId.toString() !== currentUser._id.toString()) {`
- Line 358: `if (!hasRequiredPricesByType(priceType, data)) {`
- Line 367: `if (data.image && typeof data.image === 'string') {`
- Line 368: `if (!data.image.startsWith('http')) {`
- Line 404: `if (!(await isAdmin())) {`
- Line 409: `if (!session?.user?.email) {`
- Line 414: `if (!currentUser) {`

## Data Dependencies

- Models: `category`, `menuItem`, `user`
- Shared libs: `authGuards`, `authOptions`, `cloudinary`, `orderDeletionGuards`, `orderQuantityLimits`, `reviewSummary`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- Updates existing MongoDB documents.
- Deletes or cleans up MongoDB data.
- Touches Cloudinary media upload/delete behavior.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`, `409`, `500`
- Common response fields detected: `value`, `parsed`, `fallback`, `data`, `priceType`, `sortBy`, `effectivePrice`, `createdAt`, `default`, `req`, `error`, `email`, `name`, `description`, `image`, `category`, `priceSmall`, `priceMedium`, `null`, `priceLarge`, `maxQuantityPerOrder`, `isAvailable`, `adminId`, `restaurantId`, `item`, `details`, `items`, `categories`, `matchStage`, `regex`, `options`, `in`, `pipeline`, `match`, `addFields`, `priceValues`, `filter`, `input`, `as`, `cond`, `ne`, `min`, `priceMatch`, `sort`, `project`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/menu-items` does. Explain that it belongs to the menu items workflow, serves `admin`, `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
