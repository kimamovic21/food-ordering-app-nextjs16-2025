# App Folder: app/my-reports

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the customer-facing `/my-reports` UI area. It lets signed-in users follow support tickets they submitted from order, delivery, restaurant, courier, or app-support flows.

## Route And Audience

- App route/group: `/my-reports`
- Folder path: `app/my-reports`
- Main audience/roles: `customer`
- Main interaction style: URL-synced status filters, highlighted ticket links from notifications, toast feedback

## What Happens Here

- `page.tsx` loads the current signed-in user's support tickets from `/api/support-tickets`.
- Users can filter reports by `all`, `open`, `in_review`, `resolved`, or `rejected`.
- Notification links can pass `ticketId` in the URL so the page loads and highlights the exact report.
- Each card shows the original report details, optional linked order, follow-up contact, and the public support response note.
- The page never displays `internalNote`; that field is reserved for admin support operations.

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
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is where a customer tracks the support reports they submitted. It shows whether a report is open, in review, resolved, or rejected, links back to the order when available, and displays the public support response from the admin workflow while keeping private admin notes hidden.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
