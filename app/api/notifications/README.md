# API Route: /api/notifications

## Purpose And Audience

This endpoint reads and updates the signed-in recipient's notification inbox. Customers,
restaurant admins, the super admin, and couriers use the same contract. Being an administrator
does not grant access to another recipient's notifications.

Read this file together with `route.ts`, `libs/notificationPagination.ts`,
`libs/notificationInbox.ts`, and `types/notifications.ts` before changing the contract.

## Authentication And Dependencies

Both handlers connect to MongoDB, obtain the NextAuth session through `authOptions`, and
resolve its email to an existing `User`. Missing sessions or deleted accounts return 401.
Every list, aggregate, and update includes that user's `recipientUserId`; query parameters
cannot select a different user. Mongoose performs persistence and Zod validates inputs.
These handlers do not upload images, send emails, create orders, or change payment state.

Responses, including errors, use `Cache-Control: private, no-store, max-age=0` and `Vary: Cookie`.
Client-side TanStack Query caching is separate and must remain account-scoped.

## GET: List, Filter, And Count

1. Capture a server-time `readBefore` boundary when the request starts.
2. Authenticate and validate query parameters.
3. Apply recipient, read-status, category, and cursor restrictions in MongoDB before pagination.
4. Fetch one extra row to determine `hasMore`. Order by `createdAt DESC, _id DESC` so equal
   timestamps do not lose or duplicate rows.
5. In parallel, aggregate Total/Unread/Read across the recipient's entire inbox. Counts are
   deliberately independent of the active filters and the number of loaded rows.
6. Return `notifications`, legacy-compatible `unreadCount`, `counts`, `readBefore`,
   `hasMore`, and `nextCursor`.

Supported parameters:

| Parameter         | Behavior                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| `limit`           | Integer 1-50; default 15. The bell requests 12 and displays its newest five.   |
| `status`          | `all`, `unread`, or `read`; default `all`.                                     |
| `category`        | `all`, `orders`, `delivery`, `support`, `restaurants`, or `inventory`.         |
| `before`          | Opaque base64url cursor returned by the previous page.                         |
| `skip`            | Legacy integer offset 0-100000; do not combine a nonzero offset with a cursor. |
| `unreadOnly=true` | Legacy alias for unread status when an explicit status is absent.              |

Category membership lives in `NOTIFICATION_CATEGORIES`. Delivery means courier assignment
notifications; order status, late-order, cancellation, refund, and payment updates belong to Orders.

Cursors contain the last visible date/ID, recipient ID, and selected filters. Invalid cursors,
cross-recipient/filter reuse, and invalid parameters return 400. A cursor is a pagination hint,
not an authorization token: ownership is always independently enforced. Empty pages are successful
responses with an empty array and no next cursor, not errors. The compound model indexes include
recipient/date/ID and recipient/read-status/date/ID. Existing shorter indexes are retained.

## PATCH: Read State

The validated action is one of:

- `mark-read` with a 24-character hexadecimal `notificationId`.
- `mark-unread` with the same ID requirement.
- `mark-all-read` with an optional ISO `readBefore` from a previously loaded GET response.

Single-item updates set `isRead` and `readAt` on a recipient-owned row. An unknown or
other-recipient ID returns 404 without disclosing whether another user owns it.

Bulk read affects the recipient's unread rows with `createdAt < readBefore`, including older
pages and other categories. It is not restricted to the selected filter. Rows created at or after
the boundary stay unread, including new arrivals while the action is pending. The browser must
not generate the boundary from its own clock. A future boundary is rejected. Older clients that
omit it use PATCH request-start time, preserving compatibility while bounding the update.

After a successful write, the handler computes authoritative counts and emits the existing
`notifications-read` event through `emitNotificationEvent`. The response contains
`success: true`, `unreadCount`, and `counts`.

Malformed JSON/actions return 400. Database or other handler failures return 500 with a retryable
message. A lost response or a failure after a completed database write is not proof that nothing
changed: clients refetch the authoritative state and can safely repeat a read-state action.

## Consistency And Realtime

MongoDB is the source of truth. SSE signals refreshes; it does not replace this endpoint or
guarantee cross-instance delivery. Foreground polling remains the fallback. Row and count queries
are not a transactional snapshot, so a concurrent arrival can temporarily make them differ;
the next refresh reconciles them. The read boundary is an action cutoff, not a database snapshot token.

## Verification And Presentation

Run `npm run test:notifications`, not the full application suite. Route tests cover validation,
ownership, counts, cursors, compatibility, and failures. Persistence tests use a disposable isolated
MongoDB instance to verify equal-timestamp pagination, incoming rows between pages, private/global
counts, and bounded bulk reads. UI tests cover both the shared bell state and the full inbox.

Presentation example: "The server filters before pagination and counts the complete inbox. Mark
all as read includes older notifications but protects new arrivals. The page and bell refresh the
same account-scoped queries, so a failed request cannot silently leave the UI claiming success."
