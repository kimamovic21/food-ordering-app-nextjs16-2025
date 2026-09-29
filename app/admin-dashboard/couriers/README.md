# App Folder: app/admin-dashboard/couriers

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the superadmin-facing courier management UI for `/admin-dashboard/couriers`,
including courier availability state, assignment readiness, work-time summaries, and detailed courier
performance views.

## Route And Audience

- App route/group: `/admin-dashboard/couriers`
- Folder path: `app/admin-dashboard/couriers`
- Main audience/roles: `super admin`
- Main interaction style: client data loading with protected dashboard UI

## What Happens Here

- `page.tsx` loads all couriers through `/api/my-delivery`.
- The list shows each courier's profile, current availability status (`Online`, `Offline`, or
  `On break`), join date, and week/month tracked work time.
- The `[id]` route reuses `CourierEarningsPanel`, which combines earnings, completed deliveries,
  assignment reliability, reviews, and today/week/month/year work-time summaries.
- This route is intentionally superadmin-only. Restaurant admins should manage their own restaurant
  orders, not platform-wide courier oversight.

## Important Files

- `app/admin-dashboard/couriers/[id]/page.tsx`: `AdminCourierDetailsPage`; opens the shared courier
  report panel for one courier.
- `app/admin-dashboard/couriers/layout.tsx`: `AdminCouriersLayout`
- `app/admin-dashboard/couriers/loading.tsx`: `CouriersLoading`
- `app/admin-dashboard/couriers/page.tsx`: `CouriersPage`, `fetchCouriers`; API calls:
  `/api/my-delivery`; client component

## API/Data Connections

- Calls `/api/my-delivery`; inspect the matching API README/source before changing its response shape.
- Detail views call `/api/courier-earnings?courierId=...`; this response includes `workSummary` from
  `courier_work_sessions`.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering.
- `recharts`: renders charts inside the shared courier earnings panel.
- `lucide-react`: provides icons for dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible shadcn-style controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- Keep status labels aligned with the server values: `online`, `offline`, and `on_break`.
- Treat work-time numbers as operational visibility, not payroll. They reflect app online sessions and
  locked breaks, not GPS mileage or external HR time clocks.
- Do not expose this route to regular restaurant admins; it is platform-level courier oversight.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `super admin` UI for
`/admin-dashboard/couriers`. It lets the platform owner review courier status, see who is online or
on break, inspect week/month work time, and open a detailed courier report with earnings, delivery
reliability, ratings, and time-ledger summaries.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
