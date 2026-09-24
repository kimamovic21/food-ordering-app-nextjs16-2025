# App Folder: app/reviews

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the `/reviews` UI area. It may include pages, loading states, nested route components, and client-side workflow helpers.

## Route And Audience

- App route/group: `/reviews`
- Folder path: `app/reviews`
- Main audience/roles: `customer`
- Main interaction style: session/auth state

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/reviews?${params.toString()}`. Keep API response shapes aligned.

## Important Files

- `app/reviews/layout.tsx`: functions/components: `ReviewsLayout`
- `app/reviews/loading.tsx`: functions/components: `ReviewsLoading`
- `app/reviews/page.tsx`: functions/components: `ReviewsPage`, `loadReviews`; API calls: `/api/reviews?${params.toString()}`; client component; session-aware

## API/Data Connections

- Calls `/api/reviews?${params.toString()}`; inspect the matching API README/source before changing its response shape.

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

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `customer` UI for `/reviews`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
