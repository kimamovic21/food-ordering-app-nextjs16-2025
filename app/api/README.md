# API Folder Map

This folder contains Next.js App Router API route handlers. Each route folder has its own enhanced `README.md` generated from the adjacent `route.ts` file.

## How To Use These Docs

- Open the nearest route `README.md` before editing an API handler.
- Use the README as a fast map of purpose, audience, methods, auth, models, helper dependencies, edge-case guards, side effects, and response shape.
- Then read the source `route.ts`; the source remains the authority.
- If behavior changes, update both the source and this documentation.

## Route Groups

### account-status

- `/api/account-status`: account status

### admin

- `/api/admin/restaurants`: super-admin and platform management
- `/api/admin/restaurants/[id]`: super-admin and platform management

### ai

- `/api/ai/menu-item-description`: AI-assisted menu content

### audit-logs

- `/api/audit-logs`: audit logs

### auth

- `/api/auth/[...nextauth]`: authentication

### cart

- `/api/cart/validate`: cart validation

### categories

- `/api/categories`: categories

### checkout

- `/api/checkout`: Stripe checkout

### coupons

- `/api/coupons`: coupons

### courier-earnings

- `/api/courier-earnings`: courier earnings

### courier-reviews

- `/api/courier-reviews`: courier reviews

### couriers

- `/api/couriers`: courier management

### delivery

- `/api/delivery`: delivery

### dev

- `/api/dev/order-time-simulator`: dev

### favorites

- `/api/favorites`: favorites
- `/api/favorites/menu-items`: favorites
- `/api/favorites/restaurants`: favorites

### forgot-password

- `/api/forgot-password`: forgot password

### loyalty

- `/api/loyalty`: loyalty

### menu-items

- `/api/menu-items`: menu items

### messages

- `/api/messages`: role-approved messaging
- `/api/messages/settings`: role-approved messaging
- `/api/messages/stream`: role-approved messaging

### my-deliveries

- `/api/my-deliveries`: courier delivery history
- `/api/my-deliveries/[id]`: courier delivery history

### my-delivery

- `/api/my-delivery`: courier active delivery
- `/api/my-delivery/availability`: courier active delivery
- `/api/my-delivery/location`: courier active delivery
- `/api/my-delivery/orders`: courier active delivery
- `/api/my-delivery/schedule`: courier active delivery

### my-orders

- `/api/my-orders`: customer orders
- `/api/my-orders/active`: customer orders
- `/api/my-orders/invoice`: customer orders
- `/api/my-orders/reorder`: customer orders
- `/api/my-orders/usual`: customer orders

### notifications

- `/api/notifications`: notifications and realtime refresh
- `/api/notifications/settings`: notifications and realtime refresh
- `/api/notifications/stream`: notifications and realtime refresh

### orders

- `/api/orders`: order operations
- `/api/orders/active-count`: order operations
- `/api/orders/courier-location`: order operations
- `/api/orders/queue`: order operations

### payment-link

- `/api/payment-link`: payment link

### profile

- `/api/profile`: profile and saved addresses
- `/api/profile/change-password`: profile and saved addresses
- `/api/profile/delivery-addresses`: profile and saved addresses

### qstash

- `/api/qstash/order-maintenance`: background order maintenance

### register

- `/api/register`: register

### resend-verification

- `/api/resend-verification`: resend verification

### reset-password

- `/api/reset-password`: reset password

### restaurant

- `/api/restaurant`: restaurant-owner operations
- `/api/restaurant/[id]`: restaurant-owner operations
- `/api/restaurant/operations`: restaurant-owner operations
- `/api/restaurant/reports`: restaurant-owner operations
- `/api/restaurant/reports/pdf`: restaurant-owner operations
- `/api/restaurant/statistics`: restaurant-owner operations

### restaurants

- `/api/restaurants`: public restaurant discovery/details
- `/api/restaurants/[id]`: public restaurant discovery/details
- `/api/restaurants/[id]/availability-alert`: public restaurant discovery/details
- `/api/restaurants/[id]/menu`: public restaurant discovery/details
- `/api/restaurants/[id]/ordering-status`: public restaurant discovery/details
- `/api/restaurants/[id]/quick-reorder`: public restaurant discovery/details
- `/api/restaurants/[id]/reviews`: public restaurant discovery/details

### reviews

- `/api/reviews`: reviews

### sentry-example

- `/api/sentry-example`: sentry example

### statistics

- `/api/statistics`: statistics
- `/api/statistics/orders`: statistics
- `/api/statistics/users`: statistics

### support-tickets

- `/api/support-tickets`: support tickets

### upload

- `/api/upload/menu-items`: upload
- `/api/upload/restaurants`: upload
- `/api/upload/users`: upload

### users

- `/api/users`: user role management
- `/api/users/make-admin`: user role management
- `/api/users/make-courier`: user role management
- `/api/users/remove-admin`: user role management
- `/api/users/remove-courier`: user role management

### verify-email

- `/api/verify-email`: verify email

### webhook

- `/api/webhook`: Stripe webhook

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `cloudinary`: stores uploaded user, restaurant, category, and menu-item images; cleanup logic removes replaced or deleted assets by public id.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `@react-email/components` and `@react-email/render`: define the email templates that Resend sends.
- `stripe`: creates Checkout sessions, verifies webhooks, reuses open payment links, and records payment session ids on orders.
- `@upstash/qstash`: schedules signed background checks for unpaid orders, courier assignment timeouts, and order maintenance.
- `@upstash/redis` and `@upstash/ratelimit`: protect sensitive routes from repeated abuse while keeping checks server-side.
- `bcrypt`: compares current passwords and stores replacement passwords as hashes instead of plain text.
- `libphonenumber-js`: normalizes and validates phone numbers before checkout/profile data is accepted.
- `@react-pdf/renderer`: creates downloadable/report PDF output for admin reporting flows.
- `openai`: supports AI-assisted content generation such as menu-item descriptions.
- `@sentry/nextjs`: captures runtime errors and production monitoring context.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.
