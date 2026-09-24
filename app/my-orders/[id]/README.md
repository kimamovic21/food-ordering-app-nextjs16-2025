# App Folder: app/my-orders/[id]

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns customer order history/detail flows, active-order visibility, invoice/reorder actions, delivery confirmation, and post-order support/review actions.

## Route And Audience

- App route/group: `/my-orders/[id]`
- Folder path: `app/my-orders/[id]`
- Main audience/roles: `customer`
- Main interaction style: toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/courier-reviews`, `/api/courier-reviews?courierId=${courierId}`, `/api/courier-reviews?orderId=${orderId}`, `/api/my-orders`, `/api/my-orders/reorder`, `/api/my-orders?id=${orderId}`, `/api/payment-link?orderId=${order._id}`, `/api/reviews`, `/api/reviews?orderId=${orderId}`. Keep API response shapes aligned.

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

## API/Data Connections

- Calls `/api/courier-reviews`; inspect the matching API README/source before changing its response shape.
- Calls `/api/courier-reviews?courierId=${courierId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/courier-reviews?orderId=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-orders`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-orders/reorder`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-orders?id=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/payment-link?orderId=${order._id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/reviews`; inspect the matching API README/source before changing its response shape.
- Calls `/api/reviews?orderId=${orderId}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `customer` UI for `/my-orders/[id]`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
