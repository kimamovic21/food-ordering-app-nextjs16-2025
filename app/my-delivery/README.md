# App Folder: app/my-delivery

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the courier active-delivery workflow: availability, locked breaks, work-time
summaries, assignment state, location sharing, pickup/handoff, and delivery problem reporting.

## Route And Audience

- App route/group: `/my-delivery`
- Folder path: `app/my-delivery`
- Main audience/roles: `courier`
- Main interaction style: TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/my-delivery/availability`, `/api/my-delivery/location`, `/api/my-delivery/orders`, `/api/my-delivery/schedule`. Keep API response shapes aligned.
- `AvailabilityToggle.tsx` shows the courier as `Online`, `Offline`, or `On break`. Breaks are
  server-authoritative: the UI can request a break, but the API decides whether the courier has
  worked long enough, has no active delivery, is inside schedule, and has enough shift time left.
- `CourierWorkSummaryCard.tsx` shows the courier's tracked work time for today, week, month, and
  year. These numbers come from persisted `courier_work_sessions`, not from browser-only timers.
- Courier schedule and work summaries are calculated in `Europe/Sarajevo`, so local business hours
  stay correct when production infrastructure runs in a different timezone.
- When a courier tries to go online outside the saved shift, the API returns a helpful next-shift
  message that the existing toast flow can show without extra client-side schedule math.

## Important Files

- `app/my-delivery/AvailabilityToggle.tsx`
- `app/my-delivery/CourierDeliveryPage.tsx`: functions/components: `CourierPage`, `fetchOrders`, `handleRealtimeDeliveryUpdate`, `refreshOffsets`, `handleCompleteOrder`, `handleAssignmentAction`, `handleFailedDeliveryRequest`, `handleToggleAvailability`, `handleShareLocation`, `handleManualLocationUpdate`, `handleToggleLocationPolling`; API calls: `/api/my-delivery/orders`, `/api/my-delivery/availability`, `/api/my-delivery/location`; client component
- `app/my-delivery/CourierScheduleCard.tsx`: functions/components: `CourierScheduleCard`, `fetchSchedule`, `updateWorkingHours`, `handleSave`; API calls: `/api/my-delivery/schedule`; client component
- `app/my-delivery/CourierWorkSummaryCard.tsx`: displays today/week/month/year net work time,
  break time, and session counts from the courier availability API response.
- `app/my-delivery/DeliveryOrderCard.tsx`
- `app/my-delivery/layout.tsx`: functions/components: `MyDeliveryLayout`
- `app/my-delivery/loading.tsx`: functions/components: `MyDeliveryLoading`
- `app/my-delivery/LocationShareButton.tsx`
- `app/my-delivery/ManualLocationSimulator.tsx`: functions/components: `handleManualSubmit`; client component
- `app/my-delivery/page.tsx`: functions/components: `MyDeliveryPage`

## API/Data Connections

- Calls `/api/my-delivery/availability`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-delivery/location`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-delivery/orders`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-delivery/schedule`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Do not let the browser be the source of truth for courier breaks or online time. The client can
  show countdowns and disable buttons, but `/api/my-delivery/availability` must enforce the actual
  break lock, minimum online time, active-delivery guard, and schedule guard.
- Keep courier assignment actions server-checked even if the card is already visible in the UI:
  accepting a pending assignment must still require the courier to be online, inside schedule, and
  assignable for that order.
- Do not allow schedule edits or offline transitions while `takenOrder` is set. The courier should
  complete, fail, or decline the delivery through the order workflow first.
- Preserve stale-session cleanup: if an active work session survives past the saved shift end, the
  server closes it at the Sarajevo shift end instead of counting extra overnight time.
- Preserve next-shift messaging for outside-schedule go-online attempts. The browser should not
  guess the next shift; it should display the API error returned by `/api/my-delivery/availability`.
- Keep the existing `availability` boolean aligned with the new `courierAvailabilityStatus`:
  `online` means assignable, `on_break` means not assignable, and `offline` means not assignable.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `courier` UI for `/my-delivery`; it lets a
courier go online, take a locked 30-minute break after enough work time, share location, manage
active assignments, and see their own work-time summary. The UI is intentionally friendly, but the
server owns the important rules so a courier cannot fake being online, skip the break lock, or take a
break while carrying an active order. Assignment acceptance is also re-checked on the server, so a
stale card cannot be accepted after the courier went offline, entered break, or left the saved shift.
The work ledger uses Sarajevo-local day/week boundaries, which keeps courier summaries consistent
between local development and Vercel production. If the courier tries to go online too early, too
late, or on an unavailable day, the backend responds with a friendly message such as the next shift
start time.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
