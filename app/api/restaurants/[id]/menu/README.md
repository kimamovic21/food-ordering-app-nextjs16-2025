# API Route: /api/restaurants/[id]/menu

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/restaurants/[id]/menu/route.ts`
- Route: `/api/restaurants/[id]/menu`
- HTTP methods: `GET`
- Feature area: public restaurant discovery/details
- Main audience/roles: `customer`, `public visitor`

## Plain-English Summary

Handles get work for the public restaurant discovery/details area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET requests and converts request/session data into server-side business checks.
- It uses `category`, `menuItem` for persistence.
- It delegates shared logic to `mongoConnect`, `reviewSummary` so behavior stays consistent across the app.
- Detected local functions/handlers: `escapeRegex`, `parseNumber`, `parsePositiveInt`, `toCategorySlug`, `buildSort`, `skip`.

## Request Inputs

- URL search params for filters, pagination, ids, or options
- dynamic route params from the App Router context

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 12: `if (!value) return null;`
- Line 18: `if (!value) return fallback;`
- Line 20: `if (!Number.isFinite(parsed) || parsed <= 0) return fallback;`
- Line 52: `if (!id || !mongoose.Types.ObjectId.isValid(id)) {`
- Line 70: `if (_id) {`
- Line 71: `if (!mongoose.Types.ObjectId.isValid(_id)) {`
- Line 76: `if (!item) return NextResponse.json([], { status: 200 });`
- Line 81: `if (groupBy === 'category') {`
- Line 115: `if (hasAdvancedQuery) {`
- Line 118: `if (query) {`
- Line 126: `if (categoriesParam) {`
- Line 142: `if (slugValues.length > 0) {`
- Line 176: `if (minPrice != null || maxPrice != null) {`
- Line 178: `if (minPrice != null) priceMatch.$gte = minPrice;`
- Line 179: `if (maxPrice != null) priceMatch.$lte = maxPrice;`

## Data Dependencies

- Models: `category`, `menuItem`
- Shared libs: `mongoConnect`, `reviewSummary`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `200`, `400`, `500`
- Common response fields detected: `value`, `parsed`, `fallback`, `sortBy`, `effectivePrice`, `createdAt`, `default`, `req`, `context`, `id`, `error`, `in`, `name`, `category`, `items`, `categories`, `matchStage`, `regex`, `options`, `description`, `pipeline`, `match`, `addFields`, `priceValues`, `filter`, `input`, `as`, `cond`, `ne`, `min`, `priceMatch`, `sort`, `project`, `facet`, `skip`, `limit`, `totalCount`, `count`, `pageSize`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/restaurants/[id]/menu` does. Explain that it belongs to the public restaurant discovery/details workflow, serves `customer`, `public visitor`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
