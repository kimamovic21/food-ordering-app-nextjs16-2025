# App Folder: app/courier-dashboard

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the `/courier-dashboard` UI area for couriers: active delivery work, earnings,
reviews, and performance/work-time visibility.

## Route And Audience

- App route/group: `/courier-dashboard`
- Folder path: `app/courier-dashboard`
- Main audience/roles: `courier`
- Main interaction style: static/server-rendered or delegated interactions

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- The dashboard redirects `/courier-dashboard` to the active delivery workflow.
- The active delivery tab uses `/my-delivery` UI and APIs for online/offline state, locked breaks,
  current orders, location sharing, and failed-delivery reporting.
- The earnings page uses `/api/courier-earnings`; that response includes money/performance metrics
  plus work-time summaries from `courier_work_sessions`.
- This folder talks to `/api/courier-reviews?${params.toString()}` for the reviews tab. Keep API
  response shapes aligned.

## Important Files

- `app/courier-dashboard/CourierDashboardClientLayout.tsx`: functions/components: `CourierDashboardLayoutSkeleton`, `CourierDashboardClientLayout`, `handleLogout`, `renderNewBadge`; client component
- `app/courier-dashboard/earnings/page.tsx`: functions/components: `CourierEarningsPage`; client component
- `app/courier-dashboard/layout.tsx`: functions/components: `CourierDashboardLayout`
- `app/courier-dashboard/loading.tsx`: functions/components: `CourierDashboardLoading`; client component
- `app/courier-dashboard/my-deliveries/loading.tsx`: client component
- `app/courier-dashboard/my-deliveries/page.tsx`: client component
- `app/courier-dashboard/my-delivery/loading.tsx`: client component
- `app/courier-dashboard/my-delivery/page.tsx`
- `app/courier-dashboard/page.tsx`: functions/components: `CourierDashboardPage`
- `app/courier-dashboard/reviews/loading.tsx`: functions/components: `CourierDashboardReviewsLoading`; client component
- `app/courier-dashboard/reviews/page.tsx`: functions/components: `CourierDashboardReviewsPage`, `loadReviews`; API calls: `/api/courier-reviews?${params.toString()}`; client component

## API/Data Connections

- Calls `/api/courier-reviews?${params.toString()}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- The courier's work time comes from server-side availability sessions, not client-only timers.
- Couriers can take a locked 30-minute break only after enough online work time and only when they
  are not carrying an active delivery.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `courier` dashboard. It brings together the
active delivery workflow, courier reviews, earnings, assignment reliability, and work-time tracking.
The important availability and break rules are enforced by the API so the courier dashboard cannot
fake online time or skip locked break rules.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
