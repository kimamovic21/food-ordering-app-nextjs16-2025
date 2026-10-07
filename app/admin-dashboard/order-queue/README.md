# App Folder: app/admin-dashboard/order-queue

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/order-queue`, including restaurant kitchen flow, courier handoff awareness, late-order warnings, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/order-queue`
- Folder path: `app/admin-dashboard/order-queue`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- The page reads the restaurant's active queue through `useOrderQueueQuery`, groups orders by lifecycle status, and invalidates the query when realtime order notifications arrive.
- Each queue card gives the kitchen a compact preparation summary: order short ID, customer email, active minutes, courier warning badges, item count, item sizes, and per-item notes from checkout.
- The item preview intentionally shows only the first few line items so the kanban columns stay readable; the full order remains available through the order detail link.

## Important Files

- `app/admin-dashboard/order-queue/loading.tsx`: functions/components: `OrderQueueLoading`
- `app/admin-dashboard/order-queue/page.tsx`: functions/components: `OrderQueuePage`, `handleRealtimeOrderUpdate`, `getQueueOrderItemCount`, `getQueueItemSizeLabel`; client component

## API/Data Connections

- Uses `useOrderQueueQuery`, which calls `/api/orders/queue`.
- The queue response includes normalized `cartProducts`, `itemCount`, and `hasItemNotes`; keep this UI aligned with `types/order.ts` and `app/api/orders/queue/README.md`.

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
- Do not hide per-item notes in the kitchen view. These notes are operational instructions, not decorative metadata.
- Keep order cards compact enough for five queue columns while still surfacing urgent states such as late orders, expired courier assignments, and notes.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the restaurant's live kitchen board. Admins can see every active order grouped by stage, spot late or courier-risk orders quickly, and read the exact items and customer item notes before opening the full order detail page. The browser presents the workflow, while `/api/orders/queue` remains responsible for ownership checks, active-order filtering, timeout cleanup, and normalized queue data.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
