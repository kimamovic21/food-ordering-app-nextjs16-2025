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
- This folder talks to `/api/menu-items` and `/api/restaurants/map`. Keep API response shapes aligned.

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
- `app/(home)/RestaurantLocationsMap.tsx`: functions/components: `RestaurantLocationsMap`, `RestaurantMapBounds`, `getStatusLabel`, `getStatusClassName`; client-only Leaflet map for public restaurant pins
- `app/(home)/RestaurantLocationsSection.tsx`: functions/components: `RestaurantLocationsSection`, `RestaurantMapSkeleton`, `fetchRestaurants`; API calls: `/api/restaurants/map`; client component
- `app/(home)/Testimonials.tsx`: functions/components: `Testimonials`

## API/Data Connections

- Calls `/api/menu-items`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurants/map`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `leaflet` and `react-leaflet`: render the home restaurant location map. The map component must
  stay client-only/dynamically imported because Leaflet touches browser globals.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Keep the restaurant location map separate from `OrderMap`. The home map only shows restaurant
  pins; courier tracking and delivery routes belong to order/delivery screens.
- Keep `scrollWheelZoom` disabled on the home map so the map does not trap normal page scrolling.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `public visitor` UI for `/`; it shows the hero, featured menu, feature blocks, testimonials, a public map of restaurant locations, and the registration CTA. It delegates menu and restaurant location data to API routes instead of hard-coding public data in the page.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
