# API Route: /api/support-tickets

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/support-tickets/route.ts`
- Route: `/api/support-tickets`
- HTTP methods: `GET`, `POST`, `PATCH`
- Feature area: support tickets
- Main audience/roles: `customer`, `admin`, `courier`, `super admin`

## Plain-English Summary

Customers, couriers, and admins can create reports; restaurant admins can review their restaurant's reports, and the super admin can review all reports. Each response is serialized for the current database user so private handling notes cannot leak through the JSON behind the reporter UI.

## What Happens In This File

- The route receives GET/POST/PATCH requests and converts request/session data into server-side business checks.
- It uses `order`, `supportTicket`, `user` for persistence.
- It delegates shared logic to `authOptions`, `notifications`, `rateLimit`, and `auditLog` so behavior stays consistent across the app.
- `GET` defaults to role-based access: customers/couriers see their own reports, restaurant admins see restaurant support tickets for their restaurant, and the super admin can inspect all support tickets. With `scope=mine`, every role sees only personally submitted reports using the reporter-safe response.
- `POST` creates a ticket after rate limiting, validating the optional order relationship, and checking that the reporter can access the order.
- `PATCH` moves a ticket through `open`, `in_review`, `resolved`, or `rejected`, stores the reporter-facing `responseNote`, stores the private admin-only `internalNote`, sends a reporter notification for status changes, and writes an audit log.
- `canManageTicket` checks the current database role and the specific ticket's target/restaurant. Both update authorization and response serialization use this same rule.
- `serializeTicket` builds a response from explicitly allowed fields and normalizes legacy `closed` tickets to `resolved`. It includes `internalNote` and `resolvedBy` only for an admin authorized to manage that ticket.

## Privacy Contract

- A customer or courier only reads their own tickets. Supplying a `ticketId` adds to that ownership filter; it never replaces it.
- `/my-reports` explicitly requests `scope=mine`. The server filters by the authenticated database user's `reporterId` and omits private fields even for a restaurant admin or super admin. This is a narrower read view, not a grant of management privileges; supplied reporter IDs cannot override ownership.
- Restaurant admins can follow their own app-support reports and purchases from other restaurants through `scope=mine`, including when no restaurant is currently assigned to them. Default admin management reads still require a restaurant assignment, except for the super admin.
- Reporter responses include the public `responseNote`, report details, contact fields, linked order/restaurant summaries, and timestamps. They omit `internalNote` and `resolvedBy` entirely, rather than returning blank private fields.
- The configured super admin must still have the database role `admin` to receive private fields. Session role claims and query flags cannot grant access.
- Restaurant admins receive private fields only for `restaurant_support` tickets belonging to their restaurant. An admin reporting their own purchase from another restaurant receives a reporter-safe creation response.
- All successful GET, POST, and PATCH responses use `Cache-Control: private, no-store` to prevent reuse of role-specific ticket responses by browser/shared HTTP caches.
- Serialization does not mutate stored documents. Existing notes stay in MongoDB and remain available to authorized admins; no migration is required.
- New database fields must be deliberately added to the response allowlist. Never replace the serializer with a spread of the raw ticket document.

## Request Inputs

- GET: optional `status`, `ticketId`, and `scope=mine` query parameters. Only `mine` selects the personal view; other scope values do not broaden the default role-based access.
- POST: report target/category/priority, subject/description, optional linked `orderId`, and optional follow-up contact. Reporter-supplied private handling fields are not persisted.
- PATCH: `ticketId`, supported `status`, public `responseNote`, and private `internalNote`; admin authorization is required.

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

- Missing session or database user, invalid ticket/order ids, and inaccessible linked orders.
- Restaurant admins without a restaurant, cross-restaurant updates, and attempts to manage app-support tickets without superadmin privileges.
- Admins acting as customers at another restaurant cannot obtain its internal notes through the POST response.
- Personal report reads remain reporter-only across role/restaurant assignment changes. Status and direct-ticket filters remain combined with the authenticated reporter ID; personal access does not authorize PATCH.
- App-support tickets linked to an admin's own restaurant still withhold platform-internal notes from that admin.
- Customer/courier list and single-ticket reads cannot expose private fields, even with forged query flags or session role claims.
- New database-only fields are excluded by the response allowlist.
- Subject/description/note length validation, creation rate limits, and rejected tickets requiring a public explanation.
- Status notifications use the public response note only; audit metadata records whether notes changed without copying private note text.
- Deleted related documents can leave populated references null without preventing reporter serialization. Legacy `closed` responses remain normalized to `resolved`.

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

- GET returns `{ tickets }` with role-scoped results; POST returns `{ ticket }` with status `201`; PATCH returns `{ ticket }` after an authorized update.
- Errors use `{ error }` with `400`, `401`, `403`, `404`, or rate-limit `429` status as appropriate.
- Shared contracts live in `types/support-ticket.ts`: `SupportTicket` supports the authorized admin view, and `ReporterSupportTicket` excludes private handling fields for reporter clients.

## How To Explain This In A Presentation

Open this file when someone asks what `/api/support-tickets` does. Explain that it is the server-authoritative support workflow. A user can report an order, delivery, restaurant, courier, or app problem. The API checks ownership and role access, creates the ticket, notifies the right admins, and later lets authorized admins mark the report as in review, resolved, or rejected. Public `responseNote` text is shown to the reporter; private `internalNote` text stays in the admin workflow; every admin update is audit-logged. A restaurant owner can also be a customer: the personal view lets them follow their own report about another restaurant without seeing that restaurant's private notes or gaining permission to resolve the report.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
