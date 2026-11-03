# API Route: /api/messages

## Purpose And Ownership

This is the JSON source of truth for approved in-app conversations. Customers, restaurant admins,
and couriers use it through `components/shared/MessagesCenter.tsx`; the global
`contexts/MessagesContext.tsx` uses the inbox response for unread badges.
It does not send email, upload attachments, or call Cloudinary.

Read `route.ts`, `libs/messages.ts`, `libs/messagePagination.ts`, `libs/messageThread.ts`,
`models/conversation.ts`, `models/message.ts`, and `types/messages.ts` before changing this workflow.

## Authentication And Privacy

All three methods require a NextAuth session and a matching MongoDB user. The server loads the
current user's role rather than trusting the browser. Missing sessions/users return 401.
`resolveConversationContext` preserves the existing approved role/order relationships:
customer-to-customer chat is blocked, and an order thread must match the relevant restaurant
owner or assigned courier. An opaque cursor is a pagination position, never an authorization token.

PATCH requires membership in the supplied conversation. Editing additionally requires being
the message sender; deleting hides a message only for the current viewer.
JSON responses use private, no-store cache headers. SSE remains a participant-scoped refresh signal,
not the authoritative message store.

## GET: Inbox And Bounded History

- Without `participantId`, return conversation summaries, unread totals, and suggested contacts.
- With `participantId`, resolve `context` and optional `orderId` before returning a thread.
  An allowed contact without a conversation returns an empty thread; GET does not create one.
- Admin contact search keeps its independent `search`, `page`, and `limit` parameters.
  The contact limit is at most 20; it does not control message history.
- A thread request returns at most 50 messages, newest window first but ordered chronologically
  inside the response. The query reads 51 documents to decide whether another page exists.
- `selectedConversation.hasOlderMessages` and `olderCursor` accompany `messages`. Pass that cursor
  as `before` to load the next older window. No cursor means the newest page.
- The cursor encodes conversation ID, creation timestamp, and message ID. Validation rejects
  malformed/oversized tokens and tokens for another conversation with 400. The descending
  `createdAt, _id` ordering handles equal timestamps without skipping or duplicating rows.
- Every window filters by authorized conversation and `deletedFor != currentUser`.
  Only returned incoming messages are marked delivered. Delivery is not a read receipt.
- Older-window requests skip inbox/contact queries and return empty summary/contact arrays.
  The client must keep those values from the first page, not overwrite the inbox with an older page.

The inbox conversation list itself is not paginated by this change. Its unread count covers the
conversation summaries, not just the currently loaded message window.

## POST: Send And Retry

Input: `recipientUserId`, `text`, optional `orderId`, `context`, and `clientMessageId`.
Text is trimmed, must be nonempty, and is capped at 4,000 characters.
Malformed JSON, invalid recipient IDs, and invalid supplied UUIDs return 400.
Disallowed role/order relationships return 403 before message writes.

1. Resolve the authorized participants/context and reuse or create their conversation.
   A concurrent first-message insert that hits the unique participant key reloads that conversation.
2. If a client UUID is supplied, look for the sender's existing message with that UUID.
3. Otherwise create the message. A unique-key conflict on simultaneous retries reloads the winner.
   The response contains the same saved message ID; it is not a second message.
4. Reusing a UUID for different text, recipient, or conversation returns 409.
5. Only after message persistence, update the inbox preview. A timestamp precondition prevents an
   older retry from replacing a newer preview. Newly sent messages unhide the conversation for its
   participants; a replay alone does not undo a participant's hide action.
6. Count recipient unread messages and emit `message-created` for a new insert, not a replay.
   Failure of the preview/realtime follow-up is logged but does not turn a saved message into a
   failed send. Polling still finds persisted messages; a later send/retry can repair the preview.
7. Return the saved message, including its UUID when present. Persistence failures return 500
   with a retryable error message.

The UUID is scoped by sender. The partial unique index excludes legacy messages without a UUID.
Older clients can still send without this field, but do not gain retry deduplication.
This is message-level idempotency, not a durable offline outbox or guaranteed SSE delivery.

## PATCH: Read, Edit, And Hide

- `mark-seen`: accepts optional `messageIds`, a nonempty batch of at most 50 valid IDs.
  Update only unseen incoming messages in that conversation which are visible to this user.
  The new UI sends the IDs intersecting the thread viewport while the document is visible.
  Legacy calls without IDs keep the previous whole-conversation behavior.
- `edit-message`: requires a valid message ID, sender ownership, nonempty text, and the same
  4,000-character limit. Persist `editedAt` and `editedByUserId`.
- `delete-message`: add the viewer to `deletedFor`; do not delete the other participant's copy.
- `hide-conversation`: add the viewer to the conversation's `hiddenFor`.
- Unknown actions/invalid payloads return 400; inaccessible conversations/messages return 404.

Read/edit/hide events invalidate client queries. The existing polling fallback still refreshes
receipt states when SSE cannot reach another browser/serverless instance.

## Packages, Indexes, And Compatibility

Next.js Route Handlers use native Request/Response; NextAuth resolves the session; Mongoose stores
the data; Zod validates cursor fields, bounded contact pagination, and client UUIDs.
TanStack Query, not this route, coordinates client pagination/refetching. No new package/env is needed.

New message indexes are `{ conversationId: 1, createdAt: -1, _id: -1 }` for history and the partial
unique `{ senderUserId: 1, clientMessageId: 1 }` for retries. Existing messages need no backfill and
are not rewritten. Ensure these indexes exist after deployment; if automatic index creation is
disabled, provision them before relying on retry deduplication. Do not drop unrelated indexes.
Never give all historical messages a shared/default UUID.

## Verification And Future Changes

Run `npm run test:messages`. Its MongoDB race/pagination tests start an isolated in-memory server,
not the app database. It covers equal timestamps, cursor boundaries, overlapping pages,
simultaneous first sends, legacy messages, failed sends, role rejection, bounded receipts,
draft isolation, and scroll behavior. Existing role/order/edit/hide integration flows are also in
`e2e/messages/messages-flow.e2e.test.ts`; use only a dedicated or disposable test database.

When changing this API, update this file, `app/messages/README.md`, shared types, and focused tests.
Do not remove participant checks, make cursors authorize access, replace retry UUIDs on retry,
or label fetched-but-unseen history as read.
