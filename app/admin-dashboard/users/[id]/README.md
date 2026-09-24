# App Folder: app/admin-dashboard/users/[id]

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/users/[id]`, including restaurant operations, platform management, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/users/[id]`
- Folder path: `app/admin-dashboard/users/[id]`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/users/make-admin`, `/api/users/make-courier`, `/api/users/remove-admin`, `/api/users/remove-courier`, `/api/users?id=${params.id}`. Keep API response shapes aligned.

## Important Files

- `app/admin-dashboard/users/[id]/layout.tsx`: functions/components: `generateMetadata`, `AdminUserDetailsLayout`
- `app/admin-dashboard/users/[id]/loading.tsx`: functions/components: `UserLoading`
- `app/admin-dashboard/users/[id]/page.tsx`: functions/components: `getRoleBadgeVariant`, `formatBoolean`, `formatOptionalDate`, `getRestaurantLabel`, `getRestaurantId`, `InfoItem`, `UserDetailsPage`, `fetchUser`, `handleMakeCourier`, `handleRemoveCourier`, `handleMakeAdmin`, `handleRemoveAdmin`; API calls: `/api/users?id=${params.id}`, `/api/users/make-courier`, `/api/users/remove-courier`, `/api/users/make-admin`, `/api/users/remove-admin`; client component
- `app/admin-dashboard/users/[id]/UserLocationMap.tsx`: functions/components: `fetchGeocode`, `data`, `MapLoader`, `useGeocodedLocation`, `loadGeocode`, `buildQuery`, `UserLocationMap`; client component

## API/Data Connections

- Calls `/api/users/make-admin`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users/make-courier`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users/remove-admin`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users/remove-courier`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users?id=${params.id}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `leaflet` and `react-leaflet`: render maps, markers, and location-based delivery/courier UI.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `admin`, `super admin` UI for `/admin-dashboard/users/[id]`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
