# App Folder: app/admin-dashboard/menu-items/new

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/menu-items/new`, including restaurant operations, platform management, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/menu-items/new`
- Folder path: `app/admin-dashboard/menu-items/new`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: forms and client validation, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/ai/menu-item-description`, `/api/categories`, `/api/menu-items`, `/api/upload/menu-items`. Keep API response shapes aligned.

## Important Files

- `app/admin-dashboard/menu-items/new/layout.tsx`: functions/components: `AdminNewMenuItemLayout`
- `app/admin-dashboard/menu-items/new/loading.tsx`: functions/components: `Skeleton`, `NewMenuItemLoading`
- `app/admin-dashboard/menu-items/new/page.tsx`: functions/components: `NewMenuItemPage`, `fetchCategories`, `handleImageSelect`, `uploadImage`, `handleGenerateDescription`, `handleSubmit`, `resetForm`, `handlePriceTypeChange`; API calls: `/api/categories`, `/api/upload/menu-items`, `/api/ai/menu-item-description`, `/api/menu-items`; client component; form validation

## API/Data Connections

- Calls `/api/ai/menu-item-description`; inspect the matching API README/source before changing its response shape.
- Calls `/api/categories`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items`; inspect the matching API README/source before changing its response shape.
- Calls `/api/upload/menu-items`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `openai`: supports AI-assisted content generation such as menu-item descriptions.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `admin`, `super admin` UI for `/admin-dashboard/menu-items/new`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
