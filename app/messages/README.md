# App Folder: app/messages

## Purpose And Audience

This is the signed-in customer's, restaurant admin's, and courier's messenger. It connects approved
people involved in the ordering/delivery workflow, not arbitrary public users.
The layout keeps contacts/conversations beside the selected thread and preserves existing
edit, per-user delete/hide, settings, and back-navigation actions.

## Entry Points And Dependencies

- `page.tsx`: authenticated inbox/inline conversation shell at `/messages`.
- `[participantId]/page.tsx`: authenticated participant-route entry point.
- `components/shared/MessagesCenter.tsx`: contact search, paginated threads, composer, mutations.
- `hooks/useMessageThreadScroll.ts`: reading-position anchoring, latest-message jump, viewport receipts.
- `libs/messageThread.ts`: shared limits and merge/deduplication of server pages and outgoing bubbles.
- `libs/queryKeys.ts`: viewer/context/order/participant-scoped cache keys.
- `contexts/MessagesContext.tsx`: global unread summary, SSE invalidation, polling, optional sound.
- `settings/page.tsx` and `MessageSoundSettingsForm.tsx`: separate per-user message sound setting.

Read the matching [API workflow](../api/messages/README.md) before changing a request or response.
`libs/messages.ts` remains authoritative for allowed roles/order relationships.

## Opening And Refreshing A Thread

The route or query string supplies `participantId`, optional `orderId`, and `context`.
`useProfile` supplies the viewer. TanStack Query `useInfiniteQuery` initially fetches the newest
50 messages from `/api/messages`, with an AbortSignal for obsolete reads.
Contact search pagination remains separate from history pagination.

Conversation identity includes viewer, participant, order, and context. Changing that identity
remounts local thread state: drafts, edit state, failed/pending bubbles, and dialogs do not become
active for the next recipient. Query keys also include the viewer. Placeholder data is allowed
only for a contact-search refresh within the same identity, so typing does not lose focus.
Late send responses cannot clear the next thread's draft.

SSE invalidates shared message keys; foreground polling every five seconds remains a fallback.
Already loaded infinite-query pages are revalidated sequentially. Opening a thread does not
download its entire history, but loading many pages increases subsequent refetch work.
The first page owns inbox/contact metadata; older pages contribute message history only.

## Reading Older And Incoming Messages

`Load older messages` requests the next cursor window and is disabled during another fetch.
The hook restores the previous visual position after older rows are prepended. Loading failures
leave existing rows in place and offer another attempt.

New arrivals scroll to the bottom only while the reader is already near the bottom.
When reading higher in the thread, the viewport stays anchored and a `New messages` button
offers an explicit jump. Background edits/read receipts do not force a jump.
Overlapping pages are merged by message ID; fresher copies win.

Incoming unread rows intersecting the scroll viewport are acknowledged in batches of at most 50
while the browser document is visible. Messages in unloaded history, below/above the viewport,
or in a hidden tab are not automatically marked seen. A failed receipt is retried on a later
refresh without interrupting writing. Delivered and seen remain distinct states.

## Writing, Failure, And Retry

A send gets one browser-generated UUID and an immediate outgoing bubble labeled `Sending...`.
A synchronous guard prevents rapid Enter/click events from launching duplicate sends.
Enter during IME composition or key repeat does not send; Shift+Enter still adds a newline.
The composer and API enforce the same 4,000-character limit.

On success, the saved server message replaces the optimistic bubble and shared queries refresh.
On failure, the bubble stays with `Not sent` and an accessible retry icon. Text typed for the
next message remains untouched. Retry reuses the original UUID, text, and recipient.
If the server saved a message but the response was lost, a retry returns that same message,
and polling can also reconcile it by UUID without displaying two copies.

Drafts and the local outgoing queue are intentionally memory-only. A refresh/navigation can
discard an unsent draft/failed local bubble; this is not a persistent offline delivery system.
Authorization is checked again on the server, including retries. The composer cannot bypass
the customer-to-customer or assigned-order restrictions.

Editing preserves sender-only access and disables the edit field while saving.
Deleting a message or hiding a conversation is per viewer, not a destructive delete for everyone.
A new message can bring a hidden conversation back into the inbox.

## Packages And Services

React manages local interaction state; Next.js provides route navigation; NextAuth protects the
entry points. TanStack Query owns server data/pagination/refetches, Sonner provides errors, and
Lucide plus the existing shadcn/Radix components provide controls/dialogs.
MongoDB stores conversations/messages behind the API. SSE is a refresh mechanism with polling
fallback, not an external chat provider. This change does not use Cloudinary, Resend, or Stripe.

## How To Present This Feature

Open an approved conversation, write a message, and show its sending/sent/delivered/seen states.
For a conversation with more than 50 visible messages, load older history without losing the reading
position. Scroll upward and receive a message in a second session: the UI offers a jump rather than
pulling the reader down. Simulate a failed response, type a new draft, and retry the original bubble:
the draft survives and the backend avoids a duplicate saved message. Switch contacts to demonstrate
that the previous recipient's draft and dialog do not carry across.

## Maintenance And Focused Tests

Run `npm run test:messages` for the API, isolated MongoDB persistence, merge/cursor helpers, scroll
hook, and component tests. Do not run the entire app test suite for a thread-only change.
Keep this README and the API README synchronized; preserve role checks, per-user visibility,
account-scoped caches, original retry UUIDs, and scroll/read-receipt behavior.
