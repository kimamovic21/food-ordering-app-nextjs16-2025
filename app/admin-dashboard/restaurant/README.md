# App Folder: app/admin-dashboard/restaurant

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard/restaurant`, including restaurant operations, platform management, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard/restaurant`
- Folder path: `app/admin-dashboard/restaurant`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: session/auth state, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/restaurant`, `/api/restaurant/statistics`, `/api/restaurant?id=${restaurant._id}`, `/api/upload/restaurants`. Keep API response shapes aligned.

## Restaurant Management Workflow

- Create/edit screens collect restaurant identity, contact, address, delivery radius, minimum order amount, preparation/delivery estimates, active order limit, pause status, working hours, blocked dates, and image gallery data.
- `RestaurantForm.tsx` normalizes coordinate input as strings so latitude/longitude fields can be emptied and pasted without forced leading zeroes.
- In development, `DevRestaurantLocationDialog` lets the admin simulate restaurant coordinates without affecting production behavior.
- `RestaurantImagesUpload.tsx` manages local image selection, removal, and drag-and-drop ordering before final form submission.
- New image files are uploaded to `/api/upload/restaurants`, which stores them in Cloudinary and returns URLs; `/api/restaurant` stores those URLs with the restaurant document.
- Restaurant statistics are fetched separately from `/api/restaurant/statistics` so operational data does not bloat the form save workflow.

## Important Files

- `app/admin-dashboard/restaurant/create/layout.tsx`: functions/components: `AdminCreateRestaurantLayout`
- `app/admin-dashboard/restaurant/create/page.tsx`: functions/components: `CreateRestaurantPage`, `checkExistingRestaurant`; API calls: `/api/restaurant`; client component; session-aware
- `app/admin-dashboard/restaurant/DevRestaurantLocationDialog.tsx`: functions/components: `DevRestaurantLocationDialog`, `handleOpenChange`, `handleSubmit`; client component
- `app/admin-dashboard/restaurant/edit/[restaurantId]/layout.tsx`: functions/components: `generateMetadata`, `AdminEditRestaurantLayout`
- `app/admin-dashboard/restaurant/edit/[restaurantId]/page.tsx`: functions/components: `EditRestaurantPage`; API calls: `/api/restaurant`; client component; session-aware
- `app/admin-dashboard/restaurant/layout.tsx`: functions/components: `AdminRestaurantLayout`
- `app/admin-dashboard/restaurant/loading.tsx`: functions/components: `RestaurantLoading`
- `app/admin-dashboard/restaurant/page.tsx`: functions/components: `RestaurantPage`, `fetchRestaurant`, `handleDelete`, `getDayLabel`; API calls: `/api/restaurant`, `/api/restaurant?id=${restaurant._id}`; client component; session-aware
- `app/admin-dashboard/restaurant/RestaurantForm.tsx`: functions/components: `formatRestaurantDataForForm`, `formatCoordinateInputValue`, `normalizeCoordinateInputValue`, `RestaurantForm`, `handleImageItemsChange`, `toIsoDate`, `buildPayload`, `handleInputChange`, `handleNumberChange`, `updateCoordinateInput`, `handleCoordinateInputChange`, `handleCoordinateInputFocus`, `handleCoordinateInputPaste`, `getCurrentLocation`, `handleManualRestaurantLocationUpdate`, `handleCourierFeeChange`, `handleEmployeesChange`, `handleWorkingHoursChange`, `addBlockedDate`, `removeBlockedDate`, `validateForm`, `handleSubmit`, `getDayLabel`; API calls: `/api/upload/restaurants`, `/api/restaurant`; client component
- `app/admin-dashboard/restaurant/RestaurantImagesUpload.tsx`: functions/components: `SortableImageItem`, `RestaurantImagesUpload`, `handleDragEnd`, `handleFileChange`, `handleRemove`; client component
- `app/admin-dashboard/restaurant/RestaurantStatistics.tsx`: functions/components: `RestaurantStatistics`, `fetchStatistics`, `statItem`, `menuList`; API calls: `/api/restaurant/statistics`; client component

## API/Data Connections

- Calls `/api/restaurant`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant/statistics`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant?id=${restaurant._id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/upload/restaurants`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `@dnd-kit/*`: powers drag-and-drop ordering for image or list management UI.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Keep Cloudinary upload errors visible to the admin because saving a restaurant with missing image URLs can create confusing partial state.
- Do not trust client-side ownership checks; `/api/restaurant` and upload routes must still validate session/role/restaurant ownership.
- Working hours, pause status, delivery radius, active order limits, and preparation/delivery estimates feed customer checkout UX, so update cart/ordering docs when those rules change.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is where a restaurant owner configures the operational profile of their restaurant. It controls public restaurant details, Cloudinary image uploads, delivery settings, working hours, capacity limits, pause/busy behavior, and the values that later affect customer ordering and checkout validation.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
