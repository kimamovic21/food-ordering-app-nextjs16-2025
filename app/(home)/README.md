# App Folder: app/(home)

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the `/` UI area. It may include pages, loading states, nested route components, and client-side workflow helpers.

## Route And Audience

- App route/group: `/`
- Folder path: `app/(home)`
- Main audience/roles: `public visitor`
- Main interaction style: TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/menu-items`. Keep API response shapes aligned.

## Important Files

- `app/(home)/CallToAction.tsx`: functions/components: `CallToAction`
- `app/(home)/FeaturesSection.tsx`: functions/components: `FeaturesSection`
- `app/(home)/Hero.tsx`: functions/components: `fetchPizzas`, `Hero`; API calls: `/api/menu-items`; client component
- `app/(home)/HeroWrapper.tsx`: functions/components: `HeroWrapper`; client component
- `app/(home)/HomeMenu.tsx`: functions/components: `MenuSkeleton`, `HomeMenu`, `fetchMenuItems`; API calls: `/api/menu-items`; client component
- `app/(home)/layout.tsx`: functions/components: `HomeLayout`
- `app/(home)/loading.tsx`: functions/components: `HomePageLoading`
- `app/(home)/MenuItem.tsx`: functions/components: `MenuItem`, `getPrice`, `handleAddToCart`; client component
- `app/(home)/page.tsx`: functions/components: `HomePage`
- `app/(home)/Testimonials.tsx`: functions/components: `Testimonials`

## API/Data Connections

- Calls `/api/menu-items`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `public visitor` UI for `/`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
