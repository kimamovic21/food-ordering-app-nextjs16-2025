# App Folder: app/admin-dashboard/system-health

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns superadmin-facing UI for `/admin-dashboard/system-health`, including production integration checks, safe runtime metadata, and order maintenance recovery controls.

## Route And Audience

- App route/group: `/admin-dashboard/system-health`
- Folder path: `app/admin-dashboard/system-health`
- Main audience/roles: `super admin`
- Main interaction style: session/auth state, server-side health checks, client-side recovery actions, confirmation dialog, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- `page.tsx` performs server-side session and superadmin checks, then builds the environment/runtime health snapshot.
- `OrderMaintenanceRecoveryPanel.tsx` calls `/api/admin/order-maintenance/recovery` to dry-run stale order checks and, after confirmation, run recovery.

## Important Files

- `app/admin-dashboard/system-health/loading.tsx`: functions/components: `SummaryCardSkeleton`, `RuntimeSnapshotSkeleton`, `HealthGroupSkeleton`, `SystemHealthLoading`
- `app/admin-dashboard/system-health/OrderMaintenanceRecoveryPanel.tsx`: functions/components: `OrderMaintenanceRecoveryPanel`, `MetricCard`, `fetchSnapshot`, `runRecovery`; API calls: `/api/admin/order-maintenance/recovery`; client component; superadmin-only through backing API
- `app/admin-dashboard/system-health/page.tsx`: functions/components: `getDatabaseHealthCheck`, `SummaryCard`, `HealthCheckRow`, `RuntimeItem`, `SystemHealthPage`; server component; session-aware; redirects non-superadmins

## API/Data Connections

- Calls `/api/admin/order-maintenance/recovery`; inspect the matching API README/source before changing its response shape.
- Reads MongoDB health through `mongoConnect()` and a database ping.
- Uses `libs/systemHealth.ts` to build safe environment/configuration checks without exposing secret values.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `sonner`: shows success/error feedback for recovery checks and recovery runs.
- `mongoose`: checks the live database connection from the server runtime.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Keep this page superadmin-only. Normal restaurant admins should not see global production checks or platform recovery actions.
- Treat order recovery as an operational action: keep the dry-run snapshot, confirmation dialog, disabled running states, and audit-log behavior intact.
- Do not expose secret env values in UI. Show only variable names, presence/missing status, and safe runtime metadata.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the superadmin production health center. It verifies critical integrations like MongoDB and env configuration, then provides a controlled order-maintenance safety net for stale unpaid orders, expired inventory reservations, stuck courier assignments, and ready orders that never received a courier. The UI can inspect first, asks for confirmation before applying fixes, and delegates all real mutation to server helpers so recovery stays audited and idempotent.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
