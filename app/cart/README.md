# App Folder: app/cart

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns cart review, cart validation, delivery address/location checks, coupon handling, dynamic ETA messaging, and the final handoff into Stripe Checkout.

## Route And Audience

- App route/group: `/cart`
- Folder path: `app/cart`
- Main audience/roles: `customer`
- Main interaction style: session/auth state, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/cart/validate`, `/api/checkout`, `/api/loyalty`, `/api/restaurant/${cartRestaurantIdForLookup}`. Keep API response shapes aligned.

## Cart And Checkout Handoff Flow

- The cart UI reads local cart items, groups them by restaurant, and prevents the user from silently mixing restaurants in one order.
- `/api/cart/validate` checks whether selected items still exist, remain available, use valid sizes/prices, and stay within item/order quantity limits.
- Restaurant status data powers the visible checkout messaging: open/closed, paused, busy, outside delivery radius, minimum order amount, ETA tone, courier readiness, and capacity warnings.
- Saved delivery addresses and manual/current location controls prepare the delivery fields before checkout.
- Coupon and loyalty calls show the user likely discounts, but `/api/checkout` recalculates everything again before payment.
- When the user clicks checkout, the UI sends the verified cart, delivery details, coupon code, location, and special instructions to `/api/checkout`, which returns the Stripe URL.
- The UI is allowed to provide a better experience, but the checkout API remains the final authority.

## Important Files

- `app/cart/CartItems.tsx`: functions/components: `getCartItemKey`, `showToast`, `handleUpdateQuantity`, `handleRemoveFromCart`, `handleClearCart`; client component
- `app/cart/DeliveryInformation.tsx`
- `app/cart/DevDeliveryLocationDialog.tsx`: functions/components: `DevDeliveryLocationDialog`, `handleOpenChange`, `handleSubmit`; client component
- `app/cart/layout.tsx`: functions/components: `CartLayout`
- `app/cart/loading.tsx`: functions/components: `CartLoading`, `ItemCardSkeleton`
- `app/cart/OrderSummary.tsx`
- `app/cart/page.tsx`: functions/components: `getCartItemKey`, `CartAvailabilityBanner`, `CartSkeleton`, `CartPage`, `completeRestaurantStatusCheck`, `fetchRestaurants`, `fetchLoyaltyDiscount`, `json`, `validateCart`, `handleInputChange`, `getValidatedItemPrice`, `calculateTotals`, `hasMultipleRestaurants`, `getCartRestaurantId`, `getCartRestaurant`, `isRestaurantOpen`, `getRestaurantName`, `isRestaurantBusy`, `getMinimumOrderAmount`, `getMaxItemsPerOrder`, `isRestaurantPaused`, `isRestaurantAcceptingCheckout`, `getRestaurantUnavailableReason`, `getRestaurantEtaMessage`, `getRestaurantEtaTone`, `getRestaurantCourierReadinessMessage`, `getRestaurantCourierReadinessTone`, `getRestaurantCapacityMessage`, `getRestaurantNumberField`, `getDeliveryRadiusKm`, `getDeliveryDistanceKm`, `toRadians`, `handleUseCurrentLocation`, `handleManualDeliveryLocationUpdate`, `handleSelectSavedAddress`, `handleSaveCurrentDeliveryAddress`, `handleSetDefaultDeliveryAddress`, `handleDeleteSelectedDeliveryAddress`, `fetchBestCoupon`, `handleCouponCodeChange`, `handleApplyBestCoupon`, `handleApplyCoupon`, `handleCheckout`, `handleRemoveBlockingCartItems`; API calls: `/api/restaurant/${cartRestaurantIdForLookup}`, `/api/loyalty`, `/api/cart/validate`, `/api/checkout`; client component; session-aware

## API/Data Connections

- Calls `/api/cart/validate`; inspect the matching API README/source before changing its response shape.
- Calls `/api/checkout`; inspect the matching API README/source before changing its response shape.
- Calls `/api/loyalty`; inspect the matching API README/source before changing its response shape.
- Calls `/api/restaurant/${cartRestaurantIdForLookup}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Do not hide restaurant availability checks behind the checkout button; customers should see why ordering is blocked before they pay.
- Keep the "checking restaurant status" style states stable so hard refreshes do not briefly show wrong closed/open messages.
- Keep courier-readiness and busy/capacity messaging aligned with `/api/checkout`; the API must block the same critical cases the UI warns about.
- If delivery radius or ETA logic changes, update restaurant, cart, checkout, and operations documentation together.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the customer decision screen before payment. It shows cart items, delivery address/location, discounts, ETA, restaurant status, courier readiness, and capacity warnings. It improves UX before payment, but it still sends everything to `/api/checkout`, where Stripe and server-side validation make the final decision.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
