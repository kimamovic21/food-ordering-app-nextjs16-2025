# App Folder: app/admin-dashboard/orders

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/orders`, including restaurant operations, platform management, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/orders`
- Folder path: `app/admin-dashboard/orders`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/dev/order-time-simulator`, `/api/dev/order-time-simulator?orderId=${encodeURIComponent(orderId)}`, `/api/my-delivery`, `/api/my-delivery?availableOnly=true&orderId=${order._id}`, `/api/orders`, `/api/orders?id=${orderId}`, `/api/reviews?orderId=${orderId}`. Keep API response shapes aligned.

## Important Files

- `app/admin-dashboard/orders/[id]/CustomerInfoCard.tsx`: functions/components: `CustomerInfoCard`
- `app/admin-dashboard/orders/[id]/DevOrderTimelineSimulator.tsx`: functions/components: `DevOrderTimelineSimulator`; client component
- `app/admin-dashboard/orders/[id]/layout.tsx`: functions/components: `generateMetadata`, `AdminOrderDetailsLayout`
- `app/admin-dashboard/orders/[id]/loading.tsx`: functions/components: `OrderLoading`
- `app/admin-dashboard/orders/[id]/OrderInfoCard.tsx`: functions/components: `OrderInfoCard`
- `app/admin-dashboard/orders/[id]/OrderItemsCard.tsx`: functions/components: `OrderItemsCard`
- `app/admin-dashboard/orders/[id]/page.tsx`: functions/components: `OrderDetailPage`, `getEditableStatus`, `loadServerOffsets`, `persistTimelineOffsets`, `handleTimelineOffsetIncrement`, `handleTimelineOffsetReset`, `fetchOrder`, `handleRealtimeOrderUpdate`, `fetchCouriers`, `handleStatusUpdate`, `handleAssignCourier`, `handleConfirmAssignment`, `handleAdminInternalNoteChange`, `handleSaveAdminInternalNote`, `handleHandoffToCourier`, `handleAdminConfirmDelivery`, `handleVerifyFailedDelivery`; API calls: `/api/dev/order-time-simulator`, `/api/dev/order-time-simulator?orderId=${encodeURIComponent(orderId)}`, `/api/orders?id=${orderId}`, `/api/reviews?orderId=${orderId}`, `/api/my-delivery?availableOnly=true&orderId=${order._id}`, `/api/orders`, `/api/my-delivery`; client component
- `app/admin-dashboard/orders/layout.tsx`: functions/components: `AdminOrdersLayout`
- `app/admin-dashboard/orders/loading.tsx`: functions/components: `OrdersLoading`
- `app/admin-dashboard/orders/OrdersTable.tsx`: functions/components: `PaymentBadge`, `OrderStatusBadge`, `OrdersTable`; client component
- `app/admin-dashboard/orders/page.tsx`: functions/components: `OrdersPage`, `handleRealtimeOrderUpdate`, `OrdersPageWithSuspense`; client component

## API/Data Connections

- Calls `/api/dev/order-time-simulator`; inspect the matching API README/source before changing its response shape.
- Calls `/api/dev/order-time-simulator?orderId=${encodeURIComponent(orderId)}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-delivery`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-delivery?availableOnly=true&orderId=${order._id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/orders`; inspect the matching API README/source before changing its response shape.
- Calls `/api/orders?id=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/reviews?orderId=${orderId}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `@tanstack/react-table`: powers sortable/filterable admin tables while the UI stays styled with local components.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `nuqs`: keeps filter/search/pagination state synchronized with URL query parameters.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `admin`, `super admin` UI for `/admin-dashboard/orders`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
