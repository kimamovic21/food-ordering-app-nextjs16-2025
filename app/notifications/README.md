# Notifications Inbox And Settings

## Purpose, Routes, And Audience

`/notifications` is the shared inbox for signed-in customers, admins, super admins, and couriers.
`page.tsx` checks the session and the current database user, redirects missing accounts to
`/login`, and passes the role/back-navigation destination to `NotificationsCenter`.
`/notifications/settings` remains the separate sound-preference screen.

This workflow does not grant admins a global notification inbox. Each account sees only its
own notifications. Destination routing remains in `libs/notificationClient.ts`, including
customer/admin order details, courier assignments, support tickets, restaurant availability,
and inventory alerts.

## What The User Sees

- Total, Unread, and Read counters describe the entire inbox, not just loaded cards.
- All / Unread / Read status controls and category selection filter on the server.
- Categories are Orders, Courier assignments, Support, Restaurants, and Inventory.
- Filters live in URL parameters `status` and `category` using nuqs. Browser history and
  direct links preserve them; Clear filters resets them without changing read state.
- The first page contains up to 15 notifications. Load more appends older pages.
- Individual cards support Mark as read/unread. Mark all as read applies across pages and
  filters, using the server boundary captured when loading the inbox.
- View details navigates immediately; a slow read-state request does not delay navigation.
- Refresh and SSE/polling update loaded pages without resetting the inbox to the first page.
- Loading, request errors with retry, genuinely empty inboxes, and empty filtered results have
  distinct states. Filter controls stay mounted during fetches so focus is not discarded.

## Data Flow And File Responsibilities

1. `contexts/NotificationsContext.tsx` resolves the signed-in viewer from the session and owns
   the summary query, read mutations, pending operation, arrival sound baseline, and SSE connection.
2. `hooks/useNotificationInbox.ts` uses TanStack Query's infinite query for filtered cursor pages.
   Both queries call the same abort-aware `fetchNotificationPage` helper.
3. `libs/queryKeys.ts` groups summary and filtered inbox keys under the viewer. SSE events and
   read actions invalidate that viewer's group rather than maintaining an independent local list.
4. `libs/notificationInbox.ts` merges/deduplicates pages by ID, applies optimistic row read state,
   and shares category definitions. Refreshing the same row uses the fresher page's version.
5. `components/shared/NotificationsCenter.tsx` renders global counters, filters, cards, retry,
   read controls, and cursor pagination.
6. `components/shared/NotificationBell.tsx` displays the newest five summary rows and the same
   global unread count. Its read actions use the provider, not separate mutation logic.
7. `app/api/notifications/route.ts` validates ownership, filters, cursor boundaries, and writes.
   See its adjacent README for the exact request/response contract.

The summary fetches up to 12 rows; that is not a total-count limit. Both active query surfaces
poll every ten seconds while foregrounded, with SSE providing earlier invalidation signals.
An infinite-query refresh revalidates loaded pages; it does not download the entire inbox.

## Optimistic Updates And Failure Recovery

A pending operation temporarily changes matching rows in both surfaces. Global counters remain
server-authoritative until the response confirms them; they are never recalculated from a short
loaded page. Only one read mutation per viewer is admitted at a time.

On success, shared cached rows/counts are updated and the viewer's active queries are revalidated.
On HTTP/network failure, a toast explains the problem, the pending overlay is removed, and a
refetch reconciles the server state. This avoids restoring an old whole-cache snapshot that could
erase notifications received while the request was pending.

Bulk read sends the server's `readBefore` timestamp, not the browser clock. A notification created
at or after that timestamp stays unread even if it arrives while bulk marking is in flight.
This action includes older pages and other categories; the tooltip makes that scope explicit.

## Account And Realtime Edge Cases

- Summary and inbox cache keys include the viewer; no previous-account placeholder data is used.
- Account changes cancel/remove old notification queries and close the old EventSource.
- Late responses from a previous account cannot overwrite the new account's notification state.
- SSE payloads trigger a JSON refetch; malformed events also refresh, and unavailable streams
  leave polling functional. The stream's initial ready message does not cause a redundant refresh.
- Initial loading and manual read/unread changes do not play arrival sounds. A new latest
  notification after initial loading can play the user's enabled sound, including the first
  arrival into an initially empty inbox.
- Repeated read clicks cannot create overlapping local writes. Other tabs/devices may still
  update the server, so background refresh remains important.
- A failed refresh preserves already loaded rows and shows a retryable error, not a false
  "No notifications yet" result.

## Packages And Services

Next.js and NextAuth own route/session boundaries. MongoDB/Mongoose store notifications.
TanStack Query manages cancellation, caching, refetches, and cursor pages; nuqs owns URL filters.
Radix/local UI primitives and Lucide provide controls/icons; Sonner reports mutation failures.
The existing SoundSettings context respects the user's sound preference. No Cloudinary, Stripe,
Resend, or QStash operations are added by this inbox update.

## Verification And Future Maintenance

Run `npm run test:notifications` for the focused API, persistence, helper, routing, query-key,
and component tests. Persistence tests use a disposable MongoDB server, not application data.
Also check the inbox and bell on narrow/wide screens after layout changes.

When extending notification types, update category membership, role-aware routing, shared DTOs,
this README, and the API README. Preserve server-authoritative counts, account isolation,
request-time bulk boundaries, optimistic rollback, and loaded cursor pages.

## Presentation Example

"This page is an account-specific activity inbox, not just a list of the latest alerts. Its
counters still describe all notifications when the user filters or loads only one page. The
header bell and full page share updates, errors can be retried, and marking existing items read
does not silently consume notifications that arrive during that action."
