# API Route: /api/support-tickets

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/support-tickets/route.ts`
- Route: `/api/support-tickets`
- HTTP methods: `GET`, `POST`, `PATCH`
- Feature area: support tickets
- Main audience/roles: `customer`, `admin`, `courier`, `super admin`

## Plain-English Summary

Handles get/post/patch work for the support tickets area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST/PATCH requests and converts request/session data into server-side business checks.
- It uses `order`, `supportTicket`, `user` for persistence.
- It delegates shared logic to `authOptions`, `notifications`, `rateLimit` so behavior stays consistent across the app.
- Detected local functions/handlers: `getCurrentUser`, `isSuperAdminUser`, `canAccessOrder`, `populateTicketQuery`, `normalizeTicket`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `@upstash/redis` and `@upstash/ratelimit`: protect sensitive routes from repeated abuse while keeping checks server-side.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the configured super-admin email before allowing elevated platform access.
- Checks the `admin` role before allowing restaurant/admin operations.
- Checks the `courier` role before allowing delivery operations.
- Applies Upstash Redis-backed rate limiting.

## Edge Cases Covered

- Line 35: `if (!session?.user?.email) {`
- Line 50: `if (order.userId?.toString() === user._id.toString()) {`
- Line 54: `if (user.role === 'admin') {`
- Line 61: `if (user.role === 'courier') {`
- Line 84: `if (!user) {`
- Line 93: `if (status && validStatuses.includes(status as (typeof validStatuses)[number])) {`
- Line 97: `if (ticketId) {`
- Line 98: `if (!mongoose.Types.ObjectId.isValid(ticketId)) {`
- Line 104: `if (user.role === 'admin') {`
- Line 105: `if (!isSuperAdminUser(user)) {`
- Line 106: `if (!user.restaurantId) {`
- Line 126: `if (!user) {`
- Line 137: `if (!rateLimit.success) {`
- Line 156: `if (subject.length < 4 || subject.length > 120) {`
- Line 163: `if (description.length < 10 || description.length > 1000) {`
- Line 173: `if (orderId) {`
- Line 174: `if (!mongoose.Types.ObjectId.isValid(orderId)) {`
- Line 180: `if (!order) {`
- Line 184: `if (!canAccessOrder(user, order)) {`
- Line 191: `if (target === 'restaurant_support' && !restaurantId) {`
- Line 237: `if (!user || user.role !== 'admin') {`
- Line 246: `if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {`
- Line 250: `if (!validStatuses.includes(status as (typeof validStatuses)[number])) {`
- Line 254: `if (responseNote.length > 1000) {`
- Line 263: `if (!ticket) {`
- Line 267: `if (`
- Line 280: `if (status === 'resolved') {`
- Line 290: `if (status !== previousStatus && (status === 'in_review' || status === 'resolved')) {`

## Data Dependencies

- Models: `order`, `supportTicket`, `user`
- Shared libs: `authOptions`, `notifications`, `rateLimit`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- May send email or app notifications.

## Response Behavior

- Status codes detected: `201`, `400`, `401`, `403`, `404`
- Common response fields detected: `email`, `user`, `order`, `query`, `createdAt`, `ticket`, `request`, `error`, `filter`, `tickets`, `identifier`, `limit`, `namespace`, `window`, `orderId`, `target`, `category`, `priority`, `restaurantId`, `reporterId`, `reporterRole`, `reporterName`, `reporterEmail`, `ticketId`, `notification`, `subject`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/support-tickets` does. Explain that it belongs to the support tickets workflow, serves `customer`, `admin`, `courier`, `super admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
