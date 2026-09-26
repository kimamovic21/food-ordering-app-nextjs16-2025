# API Route: /api/support-tickets

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/support-tickets/route.ts`
- Route: `/api/support-tickets`
- HTTP methods: `GET`, `POST`, `PATCH`
- Feature area: support tickets
- Main audience/roles: `customer`, `admin`, `courier`, `super admin`

## Plain-English Summary

Handles get/post/patch work for the support tickets area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs. Customers, couriers, and admins can create reports; admins can review restaurant-scoped reports; the super admin can review app-level and restaurant-level reports.

## What Happens In This File

- The route receives GET/POST/PATCH requests and converts request/session data into server-side business checks.
- It uses `order`, `supportTicket`, `user` for persistence.
- It delegates shared logic to `authOptions`, `notifications`, `rateLimit`, and `auditLog` so behavior stays consistent across the app.
- `GET` returns tickets scoped by role. Customers/couriers see their own reports, restaurant admins see restaurant support tickets for their restaurant, and the super admin can inspect all support tickets.
- `POST` creates a ticket after rate limiting, validating the optional order relationship, and checking that the reporter can access the order.
- `PATCH` moves a ticket through `open`, `in_review`, `resolved`, or `rejected`, stores the reporter-facing `responseNote`, stores the private admin-only `internalNote`, sends a reporter notification for status changes, and writes an audit log.
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
- Rejected tickets require a short public response note so the reporter is not left without context.
- Restaurant admins cannot update app-support tickets or tickets owned by another restaurant.
- Legacy `closed` tickets are normalized to `resolved` when returned to the UI.

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

- Models: `order`, `supportTicket`, `user`, `auditLog`
- Shared libs: `authOptions`, `notifications`, `rateLimit`, `auditLog`
- Shared types: `types/support-ticket.ts`

## Side Effects

- Creates MongoDB documents.
- Updates support ticket workflow fields.
- Creates in-app notifications for admins and reporters.
- Writes audit log entries for admin ticket updates.

## Response Behavior

- Status codes detected: `201`, `400`, `401`, `403`, `404`
- Common response fields detected: `email`, `user`, `order`, `query`, `createdAt`, `ticket`, `request`, `error`, `filter`, `tickets`, `identifier`, `limit`, `namespace`, `window`, `orderId`, `target`, `category`, `priority`, `restaurantId`, `reporterId`, `reporterRole`, `reporterName`, `reporterEmail`, `ticketId`, `notification`, `subject`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/support-tickets` does. Explain that it is the server-authoritative support workflow. A user can report an order, delivery, restaurant, courier, or app problem. The API checks ownership and role access, creates the ticket, notifies the right admins, and later lets authorized admins mark the report as in review, resolved, or rejected. Public `responseNote` text is shown to the reporter; private `internalNote` text stays in the admin workflow; every admin update is audit-logged.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
