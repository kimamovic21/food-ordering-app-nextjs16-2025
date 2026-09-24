# App Folder: app/admin-dashboard/statistics/users

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/statistics/users`, including restaurant operations, platform management, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/statistics/users`
- Folder path: `app/admin-dashboard/statistics/users`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: static/server-rendered or delegated interactions

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/statistics/users`. Keep API response shapes aligned.

## Important Files

- `app/admin-dashboard/statistics/users/layout.tsx`: functions/components: `AdminUserStatisticsLayout`
- `app/admin-dashboard/statistics/users/loading.tsx`: functions/components: `UsersStatisticsLoading`; client component
- `app/admin-dashboard/statistics/users/page.tsx`: functions/components: `formatPercent`, `UsersStatisticsPage`, `fetchStatistics`; API calls: `/api/statistics/users`; client component

## API/Data Connections

- Calls `/api/statistics/users`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `recharts`: renders dashboard charts and statistics visualizations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `admin`, `super admin` UI for `/admin-dashboard/statistics/users`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
