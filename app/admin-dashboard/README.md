# App Folder: app/admin-dashboard

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns admin-facing UI for `/admin-dashboard`, including restaurant operations, platform management, and protected dashboard workflows.

## Route And Audience

- App route/group: `/admin-dashboard`
- Folder path: `app/admin-dashboard`
- Main audience/roles: `admin`, `super admin`
- Main interaction style: session/auth state, forms and client validation, TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/admin/restaurants/${restaurantId}`, `/api/admin/restaurants?${params.toString()}`, `/api/ai/menu-item-description`, `/api/categories`, `/api/coupons`, `/api/coupons?id=${encodeURIComponent(couponId)}`, `/api/coupons?id=${encodeURIComponent(id)}`, `/api/coupons?page=${pageToLoad}&limit=5`, `/api/dev/order-time-simulator`, `/api/dev/order-time-simulator?orderId=${encodeURIComponent(orderId)}`, `/api/menu-items`, `/api/menu-items?_id=${id}`, `/api/my-delivery`, `/api/my-delivery?availableOnly=true&orderId=${order._id}`, `/api/orders`, `/api/orders/active-count`, `/api/orders?id=${orderId}`, `/api/restaurant`, `/api/restaurant/operations`, `/api/restaurant/statistics`, `/api/restaurant?id=${restaurant._id}`, `/api/reviews?orderId=${orderId}`, `/api/statistics`, `/api/statistics/orders`, `/api/statistics/users`, `/api/support-tickets`, `/api/support-tickets?${params.toString()}`, `/api/upload/menu-items`, `/api/upload/restaurants`, `/api/users/make-admin`, `/api/users/make-courier`, `/api/users/remove-admin`, `/api/users/remove-courier`, `/api/users?id=${params.id}`, `/api/users?id=${user._id}`, `/api/users?page=${page}`. Keep API response shapes aligned.

## Important Files

- `app/admin-dashboard/AdminDashboardClientLayout.tsx`: functions/components: `AdminDashboardLayoutSkeleton`, `AdminDashboardClientLayout`, `fetchActiveOrdersCount`, `handleRealtimeOrderUpdate`, `handleLogout`, `isActivePath`, `renderNewBadge`; API calls: `/api/orders/active-count`; client component
- `app/admin-dashboard/audit-logs/page.tsx`: functions/components: `formatTitleCase`, `formatActionLabel`, `formatEntityLabel`, `formatCheckoutBlockReasonLabel`, `getCheckoutBlockReasonBadgeClassName`, `getCheckoutBlockReasonTextClassName`, `getActionBadgeClassName`, `getMetadataEntries`, `formatMetadataValue`, `stringifyMetadata`, `AuditLogDetailsDialog`, `checkoutBlockHighlights`, `buildAuditLogsUrl`, `AuditLogsPageContent`, `fetchLogs`, `json`, `setFilter`, `applyFilters`, `resetFilters`, `clearAppliedFilter`, `AuditLogsPage`; client component
- `app/admin-dashboard/categories/layout.tsx`: functions/components: `AdminCategoriesLayout`
- `app/admin-dashboard/categories/loading.tsx`: functions/components: `CategoriesLoading`
- `app/admin-dashboard/categories/page.tsx`: functions/components: `CategoriesPage`, `fetchCategories`, `handleCategorySubmit`, `handleDeleteCategory`, `renderSkeleton`; API calls: `/api/categories`; client component
- `app/admin-dashboard/coupons/CouponForm.tsx`: functions/components: `toDateTimeLocal`, `getDefaultCouponDates`, `buildInitialFormState`, `CouponForm`, `handleChange`, `handleSubmit`; client component
- `app/admin-dashboard/coupons/create-coupon/loading.tsx`: functions/components: `CreateCouponLoading`; client component
- `app/admin-dashboard/coupons/create-coupon/page.tsx`: functions/components: `CreateCouponPage`, `handleSubmit`; API calls: `/api/coupons`; client component
- `app/admin-dashboard/coupons/edit/[id]/loading.tsx`: functions/components: `EditCouponLoading`; client component
- `app/admin-dashboard/coupons/edit/[id]/page.tsx`: functions/components: `EditCouponPage`, `id`, `fetchCoupon`, `handleSubmit`; API calls: `/api/coupons?id=${encodeURIComponent(id)}`, `/api/coupons`; client component
- `app/admin-dashboard/coupons/loading.tsx`: functions/components: `CouponsLoading`; client component
- `app/admin-dashboard/coupons/page.tsx`: functions/components: `CouponsPage`, `fetchCoupons`, `handleDelete`, `CouponsPageWithSuspense`; API calls: `/api/coupons?page=${pageToLoad}&limit=5`, `/api/coupons?id=${encodeURIComponent(couponId)}`; client component
- `app/admin-dashboard/couriers/[id]/page.tsx`: functions/components: `AdminCourierDetailsPage`; client component
- `app/admin-dashboard/couriers/layout.tsx`: functions/components: `AdminCouriersLayout`
- `app/admin-dashboard/couriers/loading.tsx`: functions/components: `CouriersLoading`
- `app/admin-dashboard/couriers/page.tsx`: functions/components: `CouriersPage`, `fetchCouriers`; API calls: `/api/my-delivery`; client component
- `app/admin-dashboard/layout.tsx`: functions/components: `AdminLayout`
- `app/admin-dashboard/loading.tsx`: functions/components: `AdminDashboardPageLoading`
- `app/admin-dashboard/menu-items/edit/[id]/layout.tsx`: functions/components: `generateMetadata`, `AdminEditMenuItemLayout`
- `app/admin-dashboard/menu-items/edit/[id]/loading.tsx`: functions/components: `Skeleton`, `EditMenuItemLoading`
- `app/admin-dashboard/menu-items/edit/[id]/page.tsx`: functions/components: `EditMenuItemPage`, `id`, `handleImageSelect`, `uploadImage`, `handleGenerateDescription`, `handleSubmit`, `handlePriceTypeChange`; API calls: `/api/categories`, `/api/menu-items?_id=${id}`, `/api/upload/menu-items`, `/api/ai/menu-item-description`, `/api/menu-items`; client component; form validation
- `app/admin-dashboard/menu-items/layout.tsx`: functions/components: `AdminMenuItemsLayout`
- `app/admin-dashboard/menu-items/loading.tsx`: functions/components: `Skeleton`, `MenuItemsLoading`
- `app/admin-dashboard/menu-items/MenuItemForm.tsx`: functions/components: `MenuItemForm`, `handleDescriptionIconKeyDown`; client component
- `app/admin-dashboard/menu-items/MenuItemImage.tsx`: functions/components: `MenuItemImage`, `isValidImage`
- `app/admin-dashboard/menu-items/MenuItems.tsx`: functions/components: `AvailabilityBadge`, `ItemImage`, `PricesCell`, `DescriptionPreview`, `AvailabilityCell`, `MenuItemActions`, `getCategoryId`, `getCategoryName`, `formatPrice`, `getDescriptionPreview`, `getLowestPrice`, `getEffectivePriceType`, `getPriceRows`, `handleConfirmDelete`, `MenuItems`; client component
- `app/admin-dashboard/menu-items/new/layout.tsx`: functions/components: `AdminNewMenuItemLayout`
- `app/admin-dashboard/menu-items/new/loading.tsx`: functions/components: `Skeleton`, `NewMenuItemLoading`
- `app/admin-dashboard/menu-items/new/page.tsx`: functions/components: `NewMenuItemPage`, `fetchCategories`, `handleImageSelect`, `uploadImage`, `handleGenerateDescription`, `handleSubmit`, `resetForm`, `handlePriceTypeChange`; API calls: `/api/categories`, `/api/upload/menu-items`, `/api/ai/menu-item-description`, `/api/menu-items`; client component; form validation
- `app/admin-dashboard/menu-items/page.tsx`: functions/components: `getAdminDashboardScrollContainer`, `MenuItemsListPage`, `handleEdit`, `handleDelete`, `handleToggleAvailability`; API calls: `/api/categories`, `/api/menu-items?_id=${id}`, `/api/menu-items`; client component
- `app/admin-dashboard/menu-items/SearchInput.tsx`: functions/components: `SearchInput`; client component
- `app/admin-dashboard/operations/layout.tsx`: functions/components: `AdminOperationsLayout`
- `app/admin-dashboard/operations/loading.tsx`: functions/components: `AdminOperationsLoading`
- `app/admin-dashboard/operations/page.tsx`: functions/components: `MetricCard`, `OperationsLoading`, `getAttentionOrderAction`, `AttentionOrderRow`, `RestaurantOperationsPage`, `fetchOperations`, `json`, `handleRealtimeOrderUpdate`; API calls: `/api/restaurant/operations`; client component
- `app/admin-dashboard/order-queue/loading.tsx`: functions/components: `OrderQueueLoading`
- `app/admin-dashboard/order-queue/page.tsx`: functions/components: `OrderQueuePage`, `handleRealtimeOrderUpdate`; client component
- `app/admin-dashboard/orders/[id]/CustomerInfoCard.tsx`: functions/components: `CustomerInfoCard`
- `app/admin-dashboard/orders/[id]/DevOrderTimelineSimulator.tsx`: functions/components: `DevOrderTimelineSimulator`; client component
- `app/admin-dashboard/orders/[id]/layout.tsx`: functions/components: `generateMetadata`, `AdminOrderDetailsLayout`
- `app/admin-dashboard/orders/[id]/loading.tsx`: functions/components: `OrderLoading`
- `app/admin-dashboard/orders/[id]/OrderInfoCard.tsx`: functions/components: `OrderInfoCard`
- `app/admin-dashboard/orders/[id]/OrderItemsCard.tsx`: functions/components: `OrderItemsCard`
- `app/admin-dashboard/orders/[id]/page.tsx`: functions/components: `OrderDetailPage`, `getEditableStatus`, `loadServerOffsets`, `persistTimelineOffsets`, `handleTimelineOffsetIncrement`, `handleTimelineOffsetReset`, `fetchOrder`, `handleRealtimeOrderUpdate`, `fetchCouriers`, `handleStatusUpdate`, `handleAssignCourier`, `handleConfirmAssignment`, `handleAdminInternalNoteChange`, `handleSaveAdminInternalNote`, `handleHandoffToCourier`, `handleAdminConfirmDelivery`, `handleVerifyFailedDelivery`; API calls: `/api/dev/order-time-simulator`, `/api/dev/order-time-simulator?orderId=${encodeURIComponent(orderId)}`, `/api/orders?id=${orderId}`, `/api/reviews?orderId=${orderId}`, `/api/my-delivery?availableOnly=true&orderId=${order._id}`, `/api/orders`, `/api/my-delivery`; client component
- `app/admin-dashboard/orders/layout.tsx`: functions/components: `AdminOrdersLayout`
- `app/admin-dashboard/orders/loading.tsx`: functions/components: `OrdersLoading`
- `app/admin-dashboard/orders/OrdersTable.tsx`: functions/components: `PaymentBadge`, `OrderStatusBadge`, `OrdersTable`; client component
- `app/admin-dashboard/orders/page.tsx`: functions/components: `OrdersPage`, `handleRealtimeOrderUpdate`, `OrdersPageWithSuspense`; client component
- `app/admin-dashboard/page.jsx`: functions/components: `AdminDashboard`; client component
- `app/admin-dashboard/restaurant-reports/loading.tsx`: functions/components: `RestaurantReportsLoading`
- `app/admin-dashboard/restaurant-reports/page.tsx`: functions/components: `formatMoney`, `formatPercent`, `todayInputValue`, `metricCards`, `RestaurantReportsPage`, `handleDownload`; client component
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

## API/Data Connections

- Calls `/api/admin/restaurants/${restaurantId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/admin/restaurants?${params.toString()}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/ai/menu-item-description`; inspect the matching API README/source before changing its response shape.
- Calls `/api/categories`; inspect the matching API README/source before changing its response shape.
- Calls `/api/coupons`; inspect the matching API README/source before changing its response shape.
- Calls `/api/coupons?id=${encodeURIComponent(couponId)}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/coupons?id=${encodeURIComponent(id)}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/coupons?page=${pageToLoad}&limit=5`; inspect the matching API README/source before changing its response shape.
- Calls `/api/dev/order-time-simulator`; inspect the matching API README/source before changing its response shape.
- Calls `/api/dev/order-time-simulator?orderId=${encodeURIComponent(orderId)}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items`; inspect the matching API README/source before changing its response shape.
- Calls `/api/menu-items?_id=${id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-delivery`; inspect the matching API README/source before changing its response shape.
- Calls `/api/my-delivery?availableOnly=true&orderId=${order._id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/orders`; inspect the matching API README/source before changing its response shape.
- Calls `/api/orders/active-count`; inspect the matching API README/source before changing its response shape.
- Calls `/api/orders?id=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant/operations`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant/statistics`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant?id=${restaurant._id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/reviews?orderId=${orderId}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/statistics`; inspect the matching API README/source before changing its response shape.
- Calls `/api/statistics/orders`; inspect the matching API README/source before changing its response shape.
- Calls `/api/statistics/users`; inspect the matching API README/source before changing its response shape.
- Calls `/api/support-tickets`; inspect the matching API README/source before changing its response shape.
- Calls `/api/support-tickets?${params.toString()}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/upload/menu-items`; inspect the matching API README/source before changing its response shape.
- Calls `/api/upload/restaurants`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users/make-admin`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users/make-courier`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users/remove-admin`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users/remove-courier`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users?id=${params.id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users?id=${user._id}`; inspect the matching API README/source before changing its response shape.
- Calls `/api/users?page=${page}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `@tanstack/react-table`: powers sortable/filterable admin tables while the UI stays styled with local components.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `leaflet` and `react-leaflet`: render maps, markers, and location-based delivery/courier UI.
- `recharts`: renders dashboard charts and statistics visualizations.
- `openai`: supports AI-assisted content generation such as menu-item descriptions.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `nuqs`: keeps filter/search/pagination state synchronized with URL query parameters.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.
- `@dnd-kit/*`: powers drag-and-drop ordering for image or list management UI.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `admin`, `super admin` UI for `/admin-dashboard`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
