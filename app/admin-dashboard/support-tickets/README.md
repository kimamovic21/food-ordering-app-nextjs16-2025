# App Folder: app/admin-dashboard/support-tickets

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the super-admin support ticket console for `/admin-dashboard/support-tickets`. It is where platform support reviews customer, courier, restaurant, delivery, and app issue reports without exposing private admin notes to reporters.

## Route And Audience

- App route/group: `/admin-dashboard/support-tickets`
- Folder path: `app/admin-dashboard/support-tickets`
- Main audience/roles: `super admin`
- Main interaction style: URL-synced filters, manual refresh, toast feedback, protected admin mutations

## What Happens Here

- `page.tsx` verifies the current profile and redirects non-admin users away from the route.
- Super admins can filter by `all`, `open`, `in_review`, `resolved`, or `rejected` status.
- Each ticket card shows reporter contact, category, support target, linked order, the original description, a public response note, and a private internal handling note.
- Public response notes are sent back through `/my-reports`; internal handling notes remain admin-only.
- The page can move tickets to `in_review`, `resolved`, or `rejected`. Rejected tickets must include enough public context for the reporter.
- This folder talks to `/api/support-tickets`, `/api/support-tickets?${params.toString()}`. Keep API response shapes aligned.

## Important Files

- `app/admin-dashboard/support-tickets/page.tsx`: functions/components: `getStatusClass`, `getId`, `SupportTicketsPage`, `updateTicket`, `SupportTicketsPageWithSuspense`; API calls: `/api/support-tickets?${params.toString()}`, `/api/support-tickets`; client component

## API/Data Connections

- Calls `/api/support-tickets`; inspect the matching API README/source before changing its response shape.
- Calls `/api/support-tickets?${params.toString()}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `nuqs`: keeps filter/search/pagination state synchronized with URL query parameters.
- `next-auth`/profile data through `useProfile`: protects the console so only the configured super admin can remain on this page.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- Keep public response and internal note copy distinct. Reporters should never see the private internal note.
- Keep rejected tickets visually distinct from resolved tickets; rejected means reviewed and closed without further action, not successfully fixed.
- Do not remove the server-side access checks just because the client redirects non-super-admin users.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the super-admin support operations screen. It lets the platform owner review issue reports, check the linked order, write a public response for the reporter, keep a private internal handling note, and close the ticket as resolved or rejected. The UI is helpful, but the API still enforces role access, notification delivery, and audit logging.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
