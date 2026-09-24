# App Folder: app/my-deliveries

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the `/my-deliveries` UI area. It may include pages, loading states, nested route components, and client-side workflow helpers.

## Route And Audience

- App route/group: `/my-deliveries`
- Folder path: `app/my-deliveries`
- Main audience/roles: `courier`
- Main interaction style: static/server-rendered or delegated interactions

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/my-deliveries`, `/api/my-deliveries/${orderId}`, `/api/my-orders?id=${encodeURIComponent(orderId)}`. Keep API response shapes aligned.

## Important Files

- `app/my-deliveries/[id]/layout.tsx`: functions/components: `generateMetadata`, `MyDeliveryDetailsLayout`
- `app/my-deliveries/[id]/loading.tsx`: functions/components: `Loading`; client component
- `app/my-deliveries/[id]/page.tsx`: functions/components: `DeliveryDetailsPage`, `fetchDeliveryDetails`; API calls: `/api/my-deliveries/${orderId}`, `/api/my-orders?id=${encodeURIComponent(orderId)}`; client component
- `app/my-deliveries/layout.tsx`: functions/components: `MyDeliveriesLayout`
- `app/my-deliveries/loading.tsx`: functions/components: `MyDeliveriesLoading`; client component
- `app/my-deliveries/page.tsx`: functions/components: `MyDeliveriesPage`, `fetchDeliveredOrders`; API calls: `/api/my-deliveries`; client component

## API/Data Connections

- Calls `/api/my-deliveries`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-deliveries/${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-orders?id=${encodeURIComponent(orderId)}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `recharts`: renders dashboard charts and statistics visualizations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `courier` UI for `/my-deliveries`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
