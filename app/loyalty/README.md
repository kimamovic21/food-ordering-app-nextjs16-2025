# App Folder: app/loyalty

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns loyalty/reward history and customer-facing loyalty explanation UI.

## Route And Audience

- App route/group: `/loyalty`
- Folder path: `app/loyalty`
- Main audience/roles: `customer`
- Main interaction style: session/auth state

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- No direct `fetch()` calls were detected here; data may come from hooks, server components, contexts, or child components.

## Important Files

- `app/loyalty/layout.tsx`: functions/components: `LoyaltyLayout`
- `app/loyalty/loading.tsx`: functions/components: `LoyaltyLoading`
- `app/loyalty/page.tsx`: functions/components: `LoyaltyPage`, `recentCompletedOrders`; session-aware

## API/Data Connections

- No direct `fetch()` calls detected in this folder.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `customer` UI for `/loyalty`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
