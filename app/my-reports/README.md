# App Folder: app/my-reports

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the personal `/my-reports` UI area. It lets all signed-in roles follow support tickets they submitted from order, delivery, restaurant, courier, or app-support flows.

## Route And Audience

- App route/group: `/my-reports`
- Folder path: `app/my-reports`
- Main audience/roles: `customer`, `courier`, `restaurant admin`, `super admin` viewing their own reports
- Main interaction style: URL-synced status filters, highlighted ticket links from notifications, toast feedback

## What Happens Here

- `page.tsx` loads the current signed-in user's support tickets from `/api/support-tickets?scope=mine`. This scope is always included alongside status and highlighted-ticket filters.
- Users can filter reports by `all`, `open`, `in_review`, `resolved`, or `rejected`.
- Notification links can pass `ticketId` in the URL so the page loads and highlights the exact report.
- Each card shows the original report details, optional linked order, follow-up contact, and the public support response note.
- The page uses `ReporterSupportTicket`, which excludes `internalNote` and `resolvedBy`. The personal API view removes those fields for every role before sending JSON, so privacy does not depend on hiding UI elements.
- Restaurant admins see their own app-support reports and reports about purchases from other restaurants, even without a current restaurant assignment. Tickets submitted by their customers belong in the separate management view.

## Important Files

- `app/my-reports/layout.tsx`: functions/components: `MyReportsLayout`
- `app/my-reports/loading.tsx`: functions/components: `MyReportsLoading`; client component
- `app/my-reports/page.tsx`: functions/components: `getStatusClass`, `getResponseNoteClass`, `getId`, `MyReportsPage`; API calls: `/api/support-tickets?${params.toString()}`; client component

## API/Data Connections

- Calls `/api/support-tickets?${params.toString()}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `nuqs`: keeps filter/search/pagination state synchronized with URL query parameters.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- Keep rejected response notes visually neutral, not green/success, because rejected means reviewed and closed without action.
- Keep `/my-reports?ticketId=...` working because support notifications use that route to deep-link users to a specific report.
- Public support responses and report details remain visible after the API privacy filter; existing private notes stay stored for authorized admins.
- A personal ticket link cannot reveal another reporter's ticket, even for an admin. Permission to read a personal report does not grant permission to update its status or internal notes.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is where a signed-in person tracks the support reports they submitted. It shows whether a report is open, in review, resolved, or rejected, links back to the order when available, and displays the public support response from the admin workflow while keeping private admin notes out of the API response. A restaurant owner who buys food elsewhere uses this same personal view to follow a complaint, separately from managing customers' reports about their own restaurant.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
