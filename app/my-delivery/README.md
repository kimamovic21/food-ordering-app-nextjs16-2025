# App Folder: app/my-delivery

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the courier active-delivery workflow: availability, assignment state, location sharing, pickup/handoff, and delivery problem reporting.

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

## Important Files

- `app/my-delivery/AvailabilityToggle.tsx`
- `app/my-delivery/CourierDeliveryPage.tsx`: functions/components: `CourierPage`, `fetchOrders`, `handleRealtimeDeliveryUpdate`, `refreshOffsets`, `handleCompleteOrder`, `handleAssignmentAction`, `handleFailedDeliveryRequest`, `handleToggleAvailability`, `handleShareLocation`, `handleManualLocationUpdate`, `handleToggleLocationPolling`; API calls: `/api/my-delivery/orders`, `/api/my-delivery/availability`, `/api/my-delivery/location`; client component
- `app/my-delivery/CourierScheduleCard.tsx`: functions/components: `CourierScheduleCard`, `fetchSchedule`, `updateWorkingHours`, `handleSave`; API calls: `/api/my-delivery/schedule`; client component
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

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `courier` UI for `/my-delivery`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
