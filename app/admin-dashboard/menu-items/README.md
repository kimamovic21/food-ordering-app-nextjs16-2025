# App Folder: app/admin-dashboard/menu-items

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/menu-items`, including menu item creation/editing, image upload, price setup, availability toggles, quantity limits, optional inventory tracking, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/menu-items`
- Folder path: `app/admin-dashboard/menu-items`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: forms and client validation, TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/ai/menu-item-description`, `/api/categories`, `/api/menu-items`, `/api/menu-items?_id=${id}`. Keep API response shapes aligned.

## Menu Item Management Workflow

- `page.tsx` renders the admin menu item table, keeps search/filter state in the URL, and lets admins edit, delete, or toggle availability.
- `MenuItems.tsx` uses TanStack Table-style behavior for professional sorting/filtering/pagination while custom cells keep images, descriptions, prices, availability, inventory status, and actions readable.
- New/edit pages load categories from `/api/categories` and send selected images together with item data to `/api/menu-items` only on Save/Update. File selection uses a local preview, with no upload or deletion.
- The AI description action calls `/api/ai/menu-item-description`, which uses the OpenAI integration to suggest polished item copy from the item context.
- Price display respects `priceType` and saved price fields so single/double/triple-size items do not show misleading size labels.
- Inventory tracking is optional per menu item. Existing menu items remain untracked until the admin enables stock tracking; new tracked items default to 10 units in stock and a low-stock threshold of 3.
- Create saves the initial inventory fields. Edit sends stock only when intentionally changed, together with its baseline; content edits do not restore units already sold. The table shows in-stock, low-stock, sold-out, or untracked inventory state next to manual availability.
- Edits and availability toggles send `expectedEditVersion`. A stale form keeps its draft and offers a confirmed reload. A stale table toggle reloads the affected row, while rollback of a failed toggle leaves other rows' changes intact. See `edit/[id]/README.md` for the full workflow.
- Open unpaid Stripe checkout sessions can temporarily increase `reservedStockQuantity`. Admin badges show the customer-available quantity and include reserved counts so the restaurant can understand why an item may look low before payment is completed.
- The table toolbar includes inventory filters for `All`, `Low stock`, `Sold out`, and `Untracked` so restaurant admins can quickly find items that need restocking without searching manually.
- When Stripe webhook inventory adjustment pushes an item into low-stock or sold-out state, admins receive an `inventory_alert` notification that links back to this table.
- A manually unavailable item is still unavailable even if stock exists. A tracked item with zero stock is treated as sold out even if the manual availability toggle is still on.
- The description preview intentionally truncates long descriptions and links to the public menu item detail route for full text.

## Important Files

- `app/admin-dashboard/menu-items/edit/[id]/layout.tsx`: functions/components: `generateMetadata`, `AdminEditMenuItemLayout`
- `app/admin-dashboard/menu-items/edit/[id]/loading.tsx`: functions/components: `Skeleton`, `EditMenuItemLoading`
- `app/admin-dashboard/menu-items/edit/[id]/page.tsx`: functions/components: `EditMenuItemPage`, `id`, `handleImageSelect`, `handleGenerateDescription`, `handleSubmit`, `handlePriceTypeChange`; API calls: `/api/categories`, `/api/menu-items?_id=${id}`, `/api/ai/menu-item-description`, `/api/menu-items`; client component; form validation
- `app/admin-dashboard/menu-items/layout.tsx`: functions/components: `AdminMenuItemsLayout`
- `app/admin-dashboard/menu-items/loading.tsx`: functions/components: `Skeleton`, `MenuItemsLoading`
- `app/admin-dashboard/menu-items/MenuItemForm.tsx`: functions/components: `MenuItemForm`, `handleDescriptionIconKeyDown`; client component
- `app/admin-dashboard/menu-items/MenuItemImage.tsx`: functions/components: `MenuItemImage`, `isValidImage`
- `app/admin-dashboard/menu-items/MenuItems.tsx`: functions/components: `AvailabilityBadge`, `ItemImage`, `InventoryBadge`, `PricesCell`, `DescriptionPreview`, `AvailabilityCell`, `MenuItemActions`, `getCategoryId`, `getCategoryName`, `formatPrice`, `getDescriptionPreview`, `getLowestPrice`, `getEffectivePriceType`, `getPriceRows`, `handleConfirmDelete`, `MenuItems`; client component
- `app/admin-dashboard/menu-items/new/layout.tsx`: functions/components: `AdminNewMenuItemLayout`
- `app/admin-dashboard/menu-items/new/loading.tsx`: functions/components: `Skeleton`, `NewMenuItemLoading`
- `app/admin-dashboard/menu-items/new/page.tsx`: functions/components: `NewMenuItemPage`, `fetchCategories`, `handleImageSelect`, `handleGenerateDescription`, `handleSubmit`, `resetForm`, `handlePriceTypeChange`; API calls: `/api/categories`, `/api/ai/menu-item-description`, `/api/menu-items`; client component; form validation
- `app/admin-dashboard/menu-items/page.tsx`: functions/components: `getAdminDashboardScrollContainer`, `MenuItemsListPage`, `handleEdit`, `handleDelete`, `handleToggleAvailability`; API calls: `/api/categories`, `/api/menu-items?_id=${id}`, `/api/menu-items`; client component
- `app/admin-dashboard/menu-items/SearchInput.tsx`: functions/components: `SearchInput`; client component

## API/Data Connections

- Calls `/api/ai/menu-item-description`; inspect the matching API README/source before changing its response shape.
- Calls `/api/categories`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items?_id=${id}`; inspect the matching API README/source before changing its response shape.
- Images are uploaded only with the complete Save/Update payload to `/api/menu-items`; the former standalone upload endpoint is retired.
- Uses `libs/menuItemInventory.ts` for client-safe stock labels/status. Do not import the server inventory helper into client components.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `@tanstack/react-table`: powers sortable/filterable admin tables while the UI stays styled with local components.
- `cloudinary`: uploads during the item-save request. Successful replacement cleans the previous image; a rejected save cleans its unused upload without deleting the current image. Environment folders remain separate.
- `openai`: supports AI-assisted content generation such as menu-item descriptions.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `nuqs`: keeps filter/search/pagination state synchronized with URL query parameters.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Keep image selection local and upload inside the complete item-save request. Never restore independent uploads on file selection or old-image deletion before the guarded save succeeds.
- Keep category ids/names aligned with `/api/categories` because filtering and badges depend on that relationship.
- Preserve disabled/loading states during image upload, AI generation, save, delete, and availability toggles to avoid duplicate mutations.
- When changing price logic, verify both the admin table and customer menu cards because the same saved fields feed both surfaces.
- When changing inventory logic, verify admin table badges/filters, public menu cards, cart validation, checkout stock reservation, reservation release on unpaid cancellation, inventory notifications, audit logs, and Stripe webhook stock adjustment together. UI warnings improve UX, but checkout/webhook remain authoritative.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the restaurant inventory workspace. Admins manage menu items, categories, images, availability, size-based prices, max-per-order limits, and optional stock tracking. Cloudinary handles images, OpenAI helps generate descriptions, TanStack improves the table UX, and the API remains the authority for what is saved. Existing menu items are intentionally not forced into stock tracking; a restaurant opts in item by item.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
