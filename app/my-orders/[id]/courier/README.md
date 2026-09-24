# App Folder: app/my-orders/[id]/courier

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns customer order history/detail flows, active-order visibility, invoice/reorder actions, delivery confirmation, and post-order support/review actions.

## Route And Audience

- App route/group: `/my-orders/[id]/courier`
- Folder path: `app/my-orders/[id]/courier`
- Main audience/roles: `customer`
- Main interaction style: static/server-rendered or delegated interactions

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/courier-reviews?courierId=${courierId}`. Keep API response shapes aligned.

## Important Files

- `app/my-orders/[id]/courier/[courierId]/page.tsx`: functions/components: `CourierReviewsPage`, `loadCourierReviews`; API calls: `/api/courier-reviews?courierId=${courierId}`; client component

## API/Data Connections

- Calls `/api/courier-reviews?courierId=${courierId}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `customer` UI for `/my-orders/[id]/courier`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
