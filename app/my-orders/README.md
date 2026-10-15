# App Folder: app/my-orders

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns customer order history/detail flows, active-order visibility, invoice/reorder actions, delivery confirmation, and post-order support/review actions.

## Route And Audience

- App route/group: `/my-orders`
- Folder path: `app/my-orders`
- Main audience/roles: `customer`
- Main interaction style: TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/courier-reviews`, `/api/courier-reviews?courierId=${courierId}`, `/api/courier-reviews?orderId=${orderId}`, `/api/my-orders`, `/api/my-orders/reorder`, `/api/my-orders?id=${orderId}`, `/api/payment-link?orderId=${order._id}`, `/api/payment-link?orderId=${orderId}`, `/api/reviews`, `/api/reviews?orderId=${orderId}`. Keep API response shapes aligned.
- Reorder actions use smart cart recovery: they replace the cart with the valid current menu items returned by the API and show a toast when old items were skipped, prices changed, or quantities were reduced.

## Important Files

- `app/my-orders/[id]/courier/[courierId]/page.tsx`: functions/components: `CourierReviewsPage`, `loadCourierReviews`; API calls: `/api/courier-reviews?courierId=${courierId}`; client component
- `app/my-orders/[id]/CustomerInfoCard.tsx`: functions/components: `CustomerInfoCard`
- `app/my-orders/[id]/DeliveryFeeBreakdown.tsx`: functions/components: `DeliveryFeeBreakdown`, `DeliveryFeeSimple`
- `app/my-orders/[id]/layout.tsx`: functions/components: `generateMetadata`, `MyOrderDetailsLayout`
- `app/my-orders/[id]/LeaveCourierReviewDialog.tsx`: functions/components: `getRatingLabel`, `LeaveCourierReviewDialog`, `handleStarClick`, `handleSubmit`; API calls: `/api/courier-reviews`; client component
- `app/my-orders/[id]/LeaveReviewDialog.tsx`: functions/components: `getRatingLabel`, `LeaveReviewDialog`, `handleStarClick`, `handleSubmit`; API calls: `/api/reviews`; client component
- `app/my-orders/[id]/loading.tsx`: functions/components: `MyOrderLoading`
- `app/my-orders/[id]/OrderInfoCard.tsx`: functions/components: `OrderInfoCard`
- `app/my-orders/[id]/OrderItemsCard.tsx`: functions/components: `OrderItemsCard`
- `app/my-orders/[id]/OrderStatusBanner.tsx`: functions/components: `formatEstimate`, `OrderStatusBanner`
- `app/my-orders/[id]/page.tsx`: functions/components: `MyOrderDetailPage`, `loadTimelineOffsets`, `loadServerOffsets`, `handleStorageChange`, `fetchOrder`, `handleRealtimeOrderUpdate`, `handleConfirmDelivery`, `handleCancelOrder`, `handleReorder`, `handleFinishPayment`, `json`; API calls: `/api/my-orders?id=${orderId}`, `/api/reviews?orderId=${orderId}`, `/api/courier-reviews?orderId=${orderId}`, `/api/my-orders`, `/api/my-orders/reorder`, `/api/payment-link?orderId=${order._id}`; client component
- `app/my-orders/layout.tsx`: functions/components: `MyOrdersLayout`
- `app/my-orders/loading.tsx`: functions/components: `MyOrdersLoading`
- `app/my-orders/MyOrdersTable.tsx`: functions/components: `PaymentBadge`, `OrderStatusBadge`, `MyOrdersTable`, `handleFinishPayment`, `data`, `handleIconKeyDown`, `handleReorder`, `handleCancelOrder`; API calls: `/api/payment-link?orderId=${orderId}`, `/api/my-orders/reorder`, `/api/my-orders`; client component
- `app/my-orders/page.tsx`: functions/components: `MyOrdersPage`, `handleRealtimeOrderUpdate`, `handleAddUsualOrder`, `handleOrderUpdated`, `MyOrdersPageWithSuspense`; client component

## API/Data Connections

- Calls `/api/courier-reviews`; inspect the matching API README/source before changing its response shape.
- Calls `/api/courier-reviews?courierId=${courierId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/courier-reviews?orderId=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-orders`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-orders/reorder`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-orders?id=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/payment-link?orderId=${order._id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/payment-link?orderId=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/reviews`; inspect the matching API README/source before changing its response shape.
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
- For reorder/usual-order flows, never assume old order snapshots are still valid. The UI should trust `/api/my-orders/reorder` and `/api/my-orders/usual` response metadata and explain partial recovery with toast copy.
- If `recoverySummary.hasChanges` is true, prefer a neutral info toast instead of a plain success toast so customers know the cart was rebuilt with today's menu, stock, and prices.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `customer` UI for `/my-orders`; it lists past orders, opens order details, lets users finish unpaid checkout links, cancel eligible unpaid orders, confirm delivery, leave reviews, report problems, and reorder. The reorder UX is smart: the browser only applies cart items returned by server checks, then explains skipped unavailable items, refreshed prices, and reduced quantities.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
