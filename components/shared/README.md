# Component Folder: shared

> Enhanced component-folder documentation. Keep this file aligned with reusable component responsibilities.

## Purpose

Cross-feature components used throughout public, customer, admin, courier, and messaging/order flows.

## What To Know Before Editing

- Components here are shared, so small visual/prop changes can affect many routes.
- Prefer preserving existing prop names and accessibility behavior unless a task explicitly changes the contract.
- If a component is used in checkout, auth, messaging, order, or admin flows, run focused tests for the affected workflow.

## Components And Responsibilities

- `components/shared/ActiveOrderQuickAccess.tsx`: exports `fetchActiveOrder`, `ActiveOrderQuickAccess`; client-side behavior; calls `/api/my-orders/active`; key imports `@/libs/orderDelay`, `@/libs/queryKeys`, `@/libs/utils`, `@/types/order`
- `components/shared/AppCommandPalette.tsx`: exports `AppCommandPalette`, `handleKeyDown`, `handleOpen`, `handleSelect`; client-side behavior; key imports `@/hooks/useProfile`, `@/libs/commandPalette`
- `components/shared/AppErrorBoundary.tsx`: exports `AppErrorFallback`, `AppErrorBoundary`; client-side behavior; key imports `@/components/ui/button`
- `components/shared/CommandPaletteTrigger.tsx`: exports `CommandPaletteTrigger`, `handleClick`; client-side behavior; key imports `@/libs/commandPalette`, `@/libs/utils`
- `components/shared/CourierEarningsPanel.tsx`: exports `getInitials`, `CourierEarningsPanel`, `fetchEarnings`, `json`; client-side behavior; key imports `@/components/ui/avatar`, `@/components/ui/badge`, `@/components/ui/card`, `@/components/ui/chart`, `@/components/ui/skeleton`, `@/libs/dateFormat`
- `components/shared/FavoriteToggleButton.tsx`: exports `getFavoriteBody`, `setFavoriteIds`, `updateFavoritesCache`, `removeFavoriteListItem`, `FavoriteToggleButton`, `handleToggle`; client-side behavior; key imports `@/components/shared/SonnerToastComponent`, `@/components/ui/button`, `@/hooks/useFavorites`, `@/libs/queryKeys`, `@/types/favorites`
- `components/shared/Footer.tsx`: exports `Footer`
- `components/shared/Header.tsx`: exports `Header`, `isCourier`, `isAdmin`, `handleLogout`; client-side behavior; key imports `@/components/shared/SonnerToastComponent`, `@/components/ui/avatar`, `@/components/ui/button`, `@/components/ui/dropdown-menu`, `@/contexts/CartContext`, `@/hooks/useProfile`
- `components/shared/HeaderSkeletons.tsx`: exports `MenuLinkSkeleton`, `AboutLinkSkeleton`, `ContactLinkSkeleton`, `MyOrdersLinkSkeleton`, `ReviewsLinkSkeleton`, `CategoriesLinkSkeleton`, `MenuItemsLinkSkeleton`, `UsersLinkSkeleton`, `CouriersLinkSkeleton`, `MyDeliveryLinkSkeleton`, `OrdersLinkSkeleton`, `StatisticsLinkSkeleton`, `ModeToggleSkeleton`, `CartIconSkeleton`, `UserNameSkeleton`, `LogoutButtonSkeleton`; key imports `@/components/ui/skeleton`
- `components/shared/HeartRating.tsx`: exports `clamp`, `toHalfStep`, `HeartRating`
- `components/shared/LayoutWrapper.tsx`: exports `LayoutWrapper`; client-side behavior
- `components/shared/MessageBell.tsx`: exports `MessageBell`; client-side behavior; key imports `@/contexts/MessagesContext`
- `components/shared/MessagesCenter.tsx`: exports `buildMessagesCenterUrl`, `fetchMessagesCenter`, `formatDate`, `formatShortDate`, `getInitials`, `getContactId`, `MessagesLoadingSkeleton`, `MessagesCenter`, `handleLoadMoreContacts`, `handleSendMessage`, `handleEditMessage`, `handleDeleteMessage`, `handleSaveEdit`, `handleHideConversation`; client-side behavior; calls `/api/messages`; key imports `@/components/shared/SonnerToastComponent`, `@/components/ui/alert-dialog`, `@/components/ui/avatar`, `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/card`
- `components/shared/NotificationBell.tsx`: exports `timeAgo`, `NotificationBell`, `handleNotificationClick`, `handleMarkAllAsRead`; client-side behavior; key imports `@/components/ui/dropdown-menu`, `@/contexts/NotificationsContext`, `@/hooks/useProfile`, `@/libs/notificationClient`
- `components/shared/NotificationsCenter.tsx`: exports `timeAgo`, `NotificationsCenter`, `handleNotificationClick`, `handleMarkAsRead`, `handleMarkAllAsRead`; client-side behavior; key imports `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/skeleton`, `@/contexts/NotificationsContext`, `@/libs/notificationClient`
- `components/shared/OrderActivityLog.tsx`: exports `hasReachedStatus`, `hasCourierAssigned`, `getCompletionDescription`, `getCancellationDescription`, `buildOrderActivityEvents`, `OrderActivityLog`; key imports `@/components/ui/badge`, `@/components/ui/card`, `@/libs/dateFormat`, `@/libs/utils`, `@/types/common`, `@/types/order`
- `components/shared/OrderDelayNotice.tsx`: exports `OrderDelayNotice`; client-side behavior; key imports `@/components/ui/card`, `@/libs/orderDelay`, `@/types/order`
- `components/shared/OrderElapsedTime.tsx`: client-side behavior; key imports `@/libs/useOrderElapsedTime`
- `components/shared/OrderItemsDataTable.tsx`: exports `alignNumericColumns`, `OrderItemsDataTable`; client-side behavior; key imports `@/components/shared/TanStackDataTable`, `@/types/cart`
- `components/shared/OrderMap.tsx`: exports `MapUpdater`, `createCustomIcon`, `geocodeAddress`; client-side behavior
- `components/shared/OrderPhaseTimeline.tsx`: exports `formatDuration`, `formatEstimate`, `getCurrentCheckpointIndex`, `OrderPhaseTimeline`; client-side behavior; key imports `@/components/ui/badge`, `@/components/ui/card`, `@/libs/devOrderTimeSimulator`, `@/libs/useOrderElapsedTime`, `@/libs/utils`, `@/types/order-timeline`
- `components/shared/OrderProgressStepper.tsx`: exports `getCurrentStepIndex`, `OrderProgressStepper`; key imports `@/libs/utils`
- `components/shared/PaymentExpiryCountdown.tsx`: exports `PaymentExpiryCountdown`; client-side behavior; key imports `@/components/ui/badge`, `@/libs/dateFormat`, `@/libs/paymentExpiry`, `@/libs/utils`, `@/types/order`
- `components/shared/PurchaseReceiptPdfDocument.tsx`: exports `PurchaseReceiptPdfDocument`, `formatMoney`, `lineTotal`; key imports `@/libs/dateFormat`, `@/types/receipt`
- `components/shared/ReportProblemDialog.tsx`: exports `ReportProblemDialog`, `resetForm`, `handleSubmit`; client-side behavior; calls `/api/support-tickets`; key imports `@/components/shared/SonnerToastComponent`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/input`, `@/components/ui/label`, `@/components/ui/select`
- `components/shared/RestaurantAvailabilityNotifyButton.tsx`: exports `RestaurantAvailabilityNotifyButton`, `handleRequest`; client-side behavior; calls `/api/restaurants/${restaurantId}/availability-alert`; key imports `@/components/shared/SonnerToastComponent`, `@/components/ui/button`, `@/libs/utils`
- `components/shared/RestaurantLocation.tsx`: exports `RestaurantLocation`; client-side behavior
- `components/shared/RestaurantQuickReorderButton.tsx`: exports `RestaurantQuickReorderButton`, `handleQuickReorder`; client-side behavior; calls `/api/restaurants/${restaurantId}/quick-reorder`; key imports `@/components/shared/SonnerToastComponent`, `@/components/ui/button`, `@/contexts/CartContext`, `@/libs/utils`, `@/types/cart`
- `components/shared/RestaurantReportPdfDocument.tsx`: exports `RestaurantReportPdfDocument`, `formatMoney`, `formatPercent`; key imports `@/libs/dateFormat`, `@/types/reports`
- `components/shared/ReviewCard.tsx`: exports `ReviewCard`; client-side behavior; key imports `@/components/ui/badge`, `@/components/ui/card`, `@/libs/dateFormat`, `@/types/review`
- `components/shared/ShareActions.tsx`: exports `ShareActions`, `handleCopyLink`; client-side behavior; key imports `@/components/shared/SonnerToastComponent`
- `components/shared/SonnerToastComponent.tsx`: exports `withToastStyle`, `SonnerToastComponent`; client-side behavior
- `components/shared/TanStackDataTable.tsx`: exports `SortIcon`, `getColumnLabel`, `TanStackDataTable`, `normalizeTableSearchValue`; key imports `@/components/ui/button`, `@/components/ui/dropdown-menu`, `@/components/ui/select`, `@/components/ui/table`, `@/libs/utils`
- `components/shared/TanStackQueryProvider.tsx`: exports `TanStackQueryProvider`; client-side behavior
- `components/shared/Title.tsx`: client-side behavior

## Edge Cases And UX Rules

- Keep keyboard/focus behavior for buttons, dialogs, inputs, selects, tables, and command/search UI.
- Keep loading, disabled, aria, and empty states because these components are reused across the app.
- Keep styling consistent with the existing dark UI and shadcn/Tailwind conventions.

## Packages And Services Used

- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `@tanstack/react-table`: powers sortable/filterable admin tables while the UI stays styled with local components.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `@upstash/qstash`: schedules signed background checks for unpaid orders, courier assignment timeouts, and order maintenance.
- `leaflet` and `react-leaflet`: render maps, markers, and location-based delivery/courier UI.
- `recharts`: renders dashboard charts and statistics visualizations.
- `@react-pdf/renderer`: creates downloadable/report PDF output for admin reporting flows.
- `@sentry/nextjs`: captures runtime errors and production monitoring context.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.
