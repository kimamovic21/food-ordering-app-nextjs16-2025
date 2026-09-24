# App Folder: app/menu

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns public menu browsing and menu item detail flows, including add-to-cart readiness checks, favorites, categories, and search/filter UI.

## Route And Audience

- App route/group: `/menu`
- Folder path: `app/menu`
- Main audience/roles: `customer`
- Main interaction style: TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/categories`, `/api/menu-items?${params.toString()}`, `/api/menu-items?_id=${itemId}`, `/api/menu-items?groupBy=category&perCategory=3`, `/api/restaurant/${item.restaurantId}`. Keep API response shapes aligned.

## Important Files

- `app/menu/[itemId]/loading.tsx`: functions/components: `MenuItemDetailLoading`; client component
- `app/menu/[itemId]/page.tsx`: functions/components: `formatDay`, `normalizeId`, `getCategoryName`, `MenuItemDetailPage`, `fetchItem`, `fetchRestaurant`, `handleAddToCart`; API calls: `/api/menu-items?_id=${itemId}`, `/api/restaurant/${item.restaurantId}`; client component
- `app/menu/layout.tsx`: functions/components: `MenuLayout`
- `app/menu/loading.tsx`: functions/components: `MenuPageLoading`; client component
- `app/menu/MenuItem.tsx`: functions/components: `MenuItem`, `availableSizes`, `getPrice`, `normalizeId`, `handleAddToCart`; client component
- `app/menu/MenuPageSkeleton.tsx`: functions/components: `MenuPageSkeleton`
- `app/menu/page.tsx`: functions/components: `toCategorySlug`, `isObjectId`, `getUniqueRestaurantIds`, `preloadImage`, `finish`, `preloadMenuItemImages`, `MenuPage`, `fetchCategories`, `fetchSummary`, `fetchResults`, `handleSearch`, `handleResetSearch`, `handleKeyPress`, `handleApplyFilters`, `handleSortChange`, `toggleCategory`, `handleClearFilters`, `handleClearAll`, `handleViewMoreCategory`, `handleLoadMore`; API calls: `/api/categories`, `/api/menu-items?groupBy=category&perCategory=3`, `/api/menu-items?${params.toString()}`; client component
- `app/menu/SearchInput.tsx`: functions/components: `SearchInput`; client component

## API/Data Connections

- Calls `/api/categories`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items?${params.toString()}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items?_id=${itemId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items?groupBy=category&perCategory=3`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant/${item.restaurantId}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `nuqs`: keeps filter/search/pagination state synchronized with URL query parameters.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `customer` UI for `/menu`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
