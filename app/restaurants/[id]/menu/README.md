# App Folder: app/restaurants/[id]/menu

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns restaurant-specific public menu browsing, including add-to-cart readiness checks, inventory-aware sold-out UI, categories, search/filter UI, and item detail modals.

## Route And Audience

- App route/group: `/restaurants/[id]/menu`
- Folder path: `app/restaurants/[id]/menu`
- Main audience/roles: `customer`
- Main interaction style: TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/restaurants/${item.restaurantId}`. Keep API response shapes aligned.
- Menu cards and modals show low-stock and sold-out state with `libs/menuItemInventory.ts`. This gives customers immediate feedback, while `/api/cart/validate`, `/api/checkout`, and the Stripe webhook remain the final inventory authorities.

## Important Files

- `app/restaurants/[id]/menu/layout.tsx`: functions/components: `generateMetadata`, `RestaurantMenuLayout`
- `app/restaurants/[id]/menu/loading.tsx`: functions/components: `RestaurantMenuPageLoading`; client component
- `app/restaurants/[id]/menu/MenuItem.tsx`: functions/components: `MenuItem`, `availableSizes`, `getPrice`, `handleAddToCart`; client component
- `app/restaurants/[id]/menu/MenuItemModal.tsx`: functions/components: `MenuItemModal`, `availableSizes`, `getPrice`, `fetchRestaurant`, `handleAddToCart`, `formatDay`; API calls: `/api/restaurants/${item.restaurantId}`; client component
- `app/restaurants/[id]/menu/MenuPageSkeleton.tsx`: functions/components: `MenuPageSkeleton`
- `app/restaurants/[id]/menu/page.tsx`: functions/components: `toCategorySlug`, `isObjectId`, `RestaurantMenuPage`, `isUpdatingMenu`, `handleSearch`, `handleResetSearch`, `handleKeyPress`, `handleApplyFilters`, `handleSortChange`, `toggleCategory`, `handleClearFilters`, `handleClearAll`, `handleViewMoreCategory`, `handleLoadMore`, `retryMenu`; client component
- `app/restaurants/[id]/menu/SearchInput.tsx`: functions/components: `SearchInput`; client component

## API/Data Connections

- Calls `/api/restaurants/${item.restaurantId}`; inspect the matching API README/source before changing its response shape.

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
- Preserve add-to-cart blocking for manually unavailable items and tracked sold-out items. Untracked legacy items should still behave as unlimited stock.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `customer` UI for `/restaurants/[id]/menu`; it shows one restaurant's menu with filters, item modals, size pricing, availability/stock hints, and add-to-cart checks that still defer final validation to server APIs.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
