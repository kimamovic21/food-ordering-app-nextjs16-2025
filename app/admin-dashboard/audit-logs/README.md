# App Folder: app/admin-dashboard/audit-logs

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/audit-logs`, including restaurant operations, platform management, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/audit-logs`
- Folder path: `app/admin-dashboard/audit-logs`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: TanStack Query or query cache

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- No direct `fetch()` calls were detected here; data may come from hooks, server components, contexts, or child components.

## Important Files

- `app/admin-dashboard/audit-logs/page.tsx`: functions/components: `formatTitleCase`, `formatActionLabel`, `formatEntityLabel`, `formatCheckoutBlockReasonLabel`, `getCheckoutBlockReasonBadgeClassName`, `getCheckoutBlockReasonTextClassName`, `getActionBadgeClassName`, `getMetadataEntries`, `formatMetadataValue`, `stringifyMetadata`, `AuditLogDetailsDialog`, `checkoutBlockHighlights`, `buildAuditLogsUrl`, `AuditLogsPageContent`, `fetchLogs`, `json`, `setFilter`, `applyFilters`, `resetFilters`, `clearAppliedFilter`, `AuditLogsPage`; client component

## API/Data Connections

- No direct `fetch()` calls detected in this folder.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `@tanstack/react-table`: powers sortable/filterable admin tables while the UI stays styled with local components.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `nuqs`: keeps filter/search/pagination state synchronized with URL query parameters.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `admin`, `super admin` UI for `/admin-dashboard/audit-logs`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
