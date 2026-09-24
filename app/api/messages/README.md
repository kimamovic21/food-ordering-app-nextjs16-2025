# API Route: /api/messages

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/messages/route.ts`
- Route: `/api/messages`
- HTTP methods: `GET`, `POST`, `PATCH`
- Feature area: role-approved messaging
- Main audience/roles: `signed-in customer`, `admin`, `courier`

## Plain-English Summary

Handles get/post/patch work for the role-approved messaging area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives GET/POST/PATCH requests and converts request/session data into server-side business checks.
- It uses `conversation`, `message`, `user` for persistence.
- It delegates shared logic to `authOptions`, `messageEvents`, `messages` so behavior stays consistent across the app.
- Detected local functions/handlers: `getCurrentUser`, `toIso`.

## Request Inputs

- URL search params for filters, pagination, ids, or options

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `admin` role before allowing restaurant/admin operations.

## Edge Cases Covered

- Line 20: `if (!email) {`
- Line 28: `if (!date) {`
- Line 39: `if (!currentUser) {`
- Line 78: `if (!participantId) {`
- Line 102: `if ('error' in resolution) {`
- Line 125: `if (!selectedConversation) {`
- Line 214: `if (!currentUser) {`
- Line 224: `if (!text) {`
- Line 228: `if (!recipientUserId || !isValidObjectId(recipientUserId)) {`
- Line 239: `if ('error' in resolution) {`
- Line 314: `if (!currentUser) {`
- Line 324: `if (!isValidObjectId(conversationId)) {`
- Line 333: `if (!conversation) {`
- Line 337: `if (action === 'mark-seen') {`
- Line 369: `if (action === 'hide-conversation') {`
- Line 385: `if (action === 'edit-message') {`
- Line 386: `if (!isValidObjectId(messageId) || !text) {`
- Line 397: `if (!message) {`
- Line 417: `if (action === 'delete-message') {`
- Line 418: `if (!isValidObjectId(messageId)) {`
- Line 428: `if (!message) {`

## Data Dependencies

- Models: `conversation`, `message`, `user`
- Shared libs: `authOptions`, `messageEvents`, `messages`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- Updates existing MongoDB documents.
- May send email or app notifications.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `404`
- Common response fields detected: `date`, `request`, `error`, `participantUserIds`, `hiddenFor`, `ne`, `lastMessageAt`, `updatedAt`, `currentUserId`, `query`, `contacts`, `hasMore`, `total`, `contactSuggestions`, `contactSearch`, `contactPage`, `contactHasMore`, `contactTotal`, `selectedConversation`, `currentUser`, `recipientUserId`, `false`, `length`, `conversation`, `contact`, `orderId`, `contextType`, `messages`, `conversationId`, `deliveredAt`, `deletedFor`, `set`, `createdAt`, `senderUserId`, `body`, `seenAt`, `editedAt`, `id`, `page`, `participantIds`, `participantKey`, `restaurantId`, `lastMessageText`, `lastMessageSenderId`, `context`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/messages` does. Explain that it belongs to the role-approved messaging workflow, serves `signed-in customer`, `admin`, `courier`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
