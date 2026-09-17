# Project Presentation Guide

This document is a detailed, presentation-friendly explanation of the food ordering app. It is written for someone who needs to understand what the project does, how the main flows work, which edge cases are covered, and which routes are useful to show during a demo.

The goal is not to replace `README.md`, `DESCRIPTION.md`, `ARCHITECTURE.md`, or `TESTING.md`. Those files remain the main setup and engineering references. This file is the readable walkthrough of the full application logic.

## 1. Product Summary

This project is a full-stack food ordering platform built with Next.js App Router, TypeScript, MongoDB, Mongoose, NextAuth, Stripe Checkout, Cloudinary, Leaflet, Upstash Redis, Upstash QStash, Resend, Sentry, TanStack Query, and TanStack Table.

The app supports four main perspectives:

- Customers browse restaurants and menu items, save delivery addresses, place orders, pay through Stripe, track live order progress, confirm delivery, review restaurants/couriers, report problems, and use role-approved messaging.
- Restaurant admins manage their restaurant, menu, orders, kitchen workflow, coupons, reports, support tickets, couriers, and daily operations.
- Couriers manage availability, receive assignments, share location, pick up orders, enter delivery PINs, report failed deliveries, and track earnings and performance.
- Super admin manages elevated platform-level operations, users, global support, courier/admin roles, and emergency order verification.

The main project idea is a realistic restaurant delivery workflow, not only a simple menu and cart. The app includes many operational edge cases such as closed restaurants, busy kitchens, stale unpaid orders, old Stripe sessions, failed deliveries, courier assignment timeouts, unavailable menu items, and ready orders that cannot get a courier.

## 2. Main Tech Stack

Core app:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui and Radix UI primitives
- Lucide React icons

Data and authentication:

- MongoDB
- Mongoose
- NextAuth
- Auth.js MongoDB adapter
- bcrypt for credentials passwords

Payments, media, email, and background services:

- Stripe Checkout and Stripe webhooks
- Cloudinary for uploaded images
- Resend and React Email for transactional emails
- Upstash Redis for rate limiting
- Upstash QStash for delayed order maintenance jobs
- OpenAI SDK for AI-generated menu descriptions

User experience and observability:

- TanStack Query for client-side server data caching and invalidation
- TanStack Table for searchable, sortable, paginated admin tables
- nuqs for URL-backed UI state
- cmdk for the command palette
- date-fns and @date-fns/tz for date formatting
- currency.js for safer money calculations
- libphonenumber-js for phone validation
- Leaflet and React Leaflet for maps
- Sentry for error monitoring and production-only sampled Session Replay
- Vercel Analytics and Vercel Speed Insights

Testing:

- Vitest
- Testing Library
- jsdom
- MSW
- mongodb-memory-server
- e2e tests powered by Vitest configuration
- Faker for safe generated test data

## 3. Important Environment Variables

The project reads env vars through `example.env`, `libs/env.ts`, and direct server-side integration code.

Main groups:

- App/runtime: `NODE_ENV`, `NEXT_PUBLIC_APP_URL`
- MongoDB: `MONGODB_URL`, `MONGODB_URL_TESTS`
- Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Stripe: `STRIPE_PK`, `STRIPE_SK`, `STRIPE_WEBHOOK_SECRET`
- Super admin: `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`, optional `SUPER_ADMIN_EMAIL`
- Resend: `RESEND_API_KEY`, `SENDER_EMAIL`, optional `RESEND_RECEIVER_EMAIL`
- Email verification toggle: `SKIP_VERIFY_EMAIL`
- AI menu descriptions: `OPEN_AI_API_KEY`
- Upstash Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Upstash QStash: `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
- Sentry: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, optional build-time `SENTRY_AUTH_TOKEN`

Security rules:

- Never commit real `.env.local` values.
- Browser-safe variables must use `NEXT_PUBLIC_`.
- Server secrets such as Stripe secret key, Cloudinary secret, Resend key, OpenAI key, QStash token, Redis token, and Sentry auth token must stay server-side.
- `SENTRY_AUTH_TOKEN` is used for source map upload during production builds. It must not be exposed to the browser.
- The app should never hardcode real private addresses, private phone numbers, or personal receiver emails in source code.

## 4. Role Model

The main user model supports these roles:

- `user`: normal customer.
- `admin`: restaurant owner or platform admin.
- `courier`: delivery person.

The app also has a super admin concept. A super admin is not a separate database role. It is an admin account whose email matches the configured super admin email.

Important role behavior:

- Customers can order, review, report, and message approved contacts.
- Restaurant admins manage only their own restaurant data unless they are super admin.
- Couriers only interact with orders assigned to them.
- Super admin can perform elevated actions such as global user management and verifying failed-delivery cancellation when a restaurant admin does not resolve it.

## 5. Authentication Flow

Main routes:

- `/register`
- `/login`
- `/forgot-password`
- `/reset-password/[token]`
- `/verify-email`
- `/profile`
- `/profile/change-password`

Main APIs:

- `POST /api/register`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `POST /api/resend-verification`
- `GET /api/verify-email`
- `GET/PUT/DELETE /api/profile`
- `POST /api/profile/change-password`
- `GET/POST /api/auth/[...nextauth]`

Registration:

- A user registers with name, email, password, and contact/profile information.
- Email is normalized before saving.
- Duplicate emails are rejected.
- Passwords are hashed with bcrypt.
- The first created user can become an admin, depending on the registration logic.
- If email verification is enabled, the user receives a verification link through Resend.
- Verification tokens are stored hashed, not as raw tokens.
- Verification tokens expire after 24 hours.
- Registration is rate-limited with Upstash Redis.

Login:

- Credentials login uses NextAuth.
- Email is normalized before lookup.
- Password is checked with bcrypt.
- If credentials email verification is enabled, unverified accounts cannot log in.
- Wrong-password attempts are rate-limited with Upstash Redis.
- Google OAuth users are synced into MongoDB and treated as verified.
- The app avoids duplicate welcome toasts so the login UI does not stack multiple success messages.

Forgot password:

- The user submits an email address.
- The API returns a generic success response even if the account does not exist. This avoids account enumeration.
- Google/OAuth-only users cannot reset a local password and should use Google login.
- Reset tokens are stored hashed and expire after one hour.
- New passwords must pass the strong password schema.

Profile:

- Users can update profile details.
- Phone values are validated and normalized through `libs/phone.ts`.
- Avatar uploads go through Cloudinary.
- Users can save delivery addresses and reuse them during checkout.
- Saved delivery addresses are capped and deduplicated.

## 6. Customer App Flow

Main customer routes:

- `/`
- `/menu`
- `/menu/[itemId]`
- `/restaurants`
- `/restaurants/[id]`
- `/restaurants/[id]/menu`
- `/restaurants/[id]/reviews`
- `/cart`
- `/checkout`
- `/my-orders`
- `/my-orders/[id]`
- `/my-orders/[id]/courier/[courierId]`
- `/favorite-meals`
- `/favorite-restaurants`
- `/reviews`
- `/loyalty`
- `/my-reports`
- `/messages`
- `/notifications`
- `/notifications/settings`
- `/messages/settings`

Customer discovery:

- Customers can browse all menu items.
- Public menu and restaurant pages support filtering, search, sorting, pagination, and shareable URL params.
- Menu cards show availability and restaurant ordering status.
- Visible menu cards can prefetch restaurant ordering status to make first add-to-cart interaction feel faster.
- A customer cannot add an unavailable item or an item from a blocked restaurant state.

Favorites:

- Customers can favorite menu items and restaurants.
- Favorites are cached with TanStack Query.
- Favorite pages support quick access to saved items.
- Favorite restaurant quick reorder uses the customer's latest valid previous order from that restaurant.

Cart:

- Cart keeps selected menu item snapshots in client state.
- Cart validates the latest server state before checkout.
- It checks deleted items, unavailable items, price changes, restaurant status, delivery radius, minimum order amount, busy capacity, and courier-safe order quantity limits.
- Restaurant open/paused/radius/capacity checks are centralized server-side so the menu, cart, checkout, restaurant pages, availability alerts, and admin operations views report the same ordering state.
- Cart and restaurant pages show dynamic prep/delivery ETA messaging that reflects current kitchen load instead of only static restaurant averages.
- Price changes are shown clearly and can be refreshed.
- Deleted, unavailable, invalid, cross-restaurant, or blocked restaurant states prevent checkout.
- The cart can show a "checking restaurant status" state so closed/open messages do not flicker during loading.
- Development-only manual location controls allow testing delivery radius without physically moving.

Checkout:

- Checkout is server-authoritative.
- The server recalculates item prices, totals, tax, delivery fee, coupon discounts, loyalty discounts, and restaurant availability.
- Checkout uses the same cart validation and centralized restaurant ordering status helpers as cart preflight, so client-side warnings and final Stripe session creation follow the same rules.
- Checkout saves the current load-adjusted preparation, delivery, and total estimate on the order so later order timelines and delay warnings use the estimate the customer saw before payment.
- The customer cannot checkout with mixed restaurants.
- The customer cannot checkout from their own restaurant.
- The customer cannot checkout while they already have a paid active order that is not completed or canceled.
- The customer cannot checkout if the restaurant is closed, paused, on a blocked date, closing soon, outside delivery radius, below minimum order amount, or at active kitchen capacity.
- The customer cannot checkout with an oversized cart: restaurants can cap total items per order up to 20, and menu items can cap their own quantity per order up to 20.
- The server creates an unpaid `placed` order before redirecting to Stripe Checkout.
- The order stores snapshots of cart items, tax, delivery fee, estimates, coupon, loyalty, delivery address, and Stripe session id.
- If a matching unpaid order already exists recently, checkout can reuse or recover the existing Stripe Checkout session instead of creating duplicate orders.

Payment:

- Stripe Checkout is used for card payment.
- Stripe webhook marks the order as paid after `checkout.session.completed`.
- Payment is idempotent, so repeated webhook events should not duplicate side effects.
- If the user leaves Stripe and comes back later, the payment-link endpoint can recover or recreate the hosted checkout link when valid.
- Old expired or canceled payment flows are blocked from incorrectly marking canceled orders as paid.

Order tracking:

- Customers can see order details, payment status, delivery address, items, tax, delivery fee, coupon discount, loyalty discount, and courier details.
- The order has a visual progress stepper with placed, kitchen, transport, and delivered states.
- The order timeline displays estimated prep, estimated delivery, estimated total, and actual phase durations.
- Active order quick access in the header helps customers finish payment or continue tracking.
- Delay warnings appear when an active order exceeds the estimated total plus grace time.
- Completed orders can be reordered after the current menu state is revalidated.

Reviews:

- Customers can leave restaurant reviews after completed paid orders.
- Customers can leave courier reviews after completed courier-handled orders.
- Duplicate reviews for the same order are blocked.
- Review pages display public feedback and ratings.

Support:

- Customers can report a problem from an order details page.
- Support tickets show status such as open, in review, and resolved.
- Restaurant-related issues route to the restaurant admin.
- App-level issues route to super admin.

## 7. Restaurant And Menu Management

Main admin routes:

- `/admin-dashboard/restaurant`
- `/admin-dashboard/restaurant/create`
- `/admin-dashboard/restaurant/edit/[restaurantId]`
- `/admin-dashboard/menu-items`
- `/admin-dashboard/menu-items/new`
- `/admin-dashboard/menu-items/edit/[id]`
- `/admin-dashboard/categories`
- `/admin-dashboard/coupons`
- `/admin-dashboard/coupons/create-coupon`
- `/admin-dashboard/coupons/edit/[id]`

Restaurant data:

- Restaurant owner
- Name, address, contact details, email, web address, description
- Latitude and longitude
- Image gallery
- Working hours
- Blocked dates
- Tax percentage
- Courier fee
- Minimum order amount
- Average preparation minutes
- Average delivery minutes
- Active order limit
- Max items per order
- Delivery radius
- Pause state and pause reason
- Total employees

Restaurant availability:

- The app checks if the restaurant is open based on working hours and blocked dates.
- `libs/restaurantOrderingStatus.ts` combines restaurant availability, delivery radius, pause state, closing-soon cutoff, active kitchen capacity, max items per order, and minimum order amount into one capacity-aware ordering status.
- `libs/restaurantCapacity.ts` keeps the reusable capacity math separate from database access, so operations summaries can reuse the same near-capacity and at-capacity thresholds without pulling in server-only order queries.
- `libs/restaurantEta.ts` keeps dynamic timing rules separate from availability rules, increasing prep estimates as active kitchen load rises and exposing clear customer-facing busy messages.
- Checkout is blocked in the final 60 minutes before closing.
- Admins can pause the restaurant manually when the kitchen is overwhelmed.
- A pause reason can be shown to users.
- Active kitchen order limit prevents checkout when too many paid active orders are in `placed`, `processing`, or `ready`.
- Max items per order prevents a customer from assigning one courier an unrealistic amount of food or drinks.
- Delivery radius prevents checkout when the customer address is too far from the restaurant.
- Customers can request a notification when a restaurant becomes available again.

Menu items:

- Menu items belong to one restaurant.
- Menu item fields include name, description, category, image, price type, size prices, food type, availability, admin id, and restaurant id.
- Price type controls whether the item uses one, two, or three size prices.
- Max quantity per order prevents a single item, such as pizza or burgers, from being ordered in unrealistic bulk from normal checkout.
- Admins can create/edit items and upload images to Cloudinary.
- Admins can use the AI assistant to generate a polished menu item description.
- Admins can mark menu items unavailable without deleting them.
- Public pages block ordering unavailable menu items.
- Checkout revalidates menu items again before payment.

Deletion rules:

- Restaurants cannot be deleted while active orders depend on them.
- Restaurant-owner accounts cannot be deleted while the owned restaurant has active orders.
- Menu items cannot be deleted while active orders still reference them.
- The recommended flow is to mark an item unavailable first, wait for active orders to finish/cancel, then delete it.

## 8. Cart, Coupon, Loyalty, And Reorder Rules

Coupons:

- Customers can apply coupons manually.
- Cart can suggest the best public coupon for the current restaurant subtotal.
- Coupon eligibility checks include active status, date windows, minimum order amount, usage limits, first-order-only rules, and per-customer usage limits.
- Checkout revalidates the coupon server-side.
- Coupon snapshots are stored on the order for historical accuracy.

Loyalty:

- Loyalty tier is calculated from completed order history.
- Loyalty can reduce the delivery fee or order total depending on the app rules.
- The order stores loyalty discount percentage, amount, and tier snapshot.
- Loyalty history is visible on `/loyalty`.

Reorder:

- Reorder never blindly trusts the old order snapshot.
- The app rebuilds the cart from current `menu_items` data.
- Deleted, unavailable, cross-restaurant, invalid, or mismatched items are handled before checkout.
- Customers can reorder from order history, order details, restaurant details, and favorite restaurants.

## 9. Order Lifecycle

Main order status values:

- `placed`
- `processing`
- `ready`
- `transportation`
- `delivered`
- `completed`
- `canceled`

Main timeline:

1. Customer places order and is redirected to Stripe.
2. Stripe payment succeeds and webhook marks the order as paid.
3. Restaurant admin moves the order from `placed` to `processing`.
4. Restaurant admin moves the order from `processing` to `ready`.
5. Restaurant admin assigns an available courier.
6. Courier accepts or declines the assignment.
7. Restaurant admin hands the order to the courier.
8. Courier picks up the order and moves it into transportation.
9. Courier reaches the customer and enters the delivery PIN.
10. Order becomes `delivered`.
11. Customer or restaurant admin confirms final completion.
12. Order becomes `completed`.

Important transition rules:

- Admin cannot move unpaid orders through kitchen status.
- Admin cannot directly set `transportation`; courier pickup handles this.
- Admin cannot directly set `delivered`; courier PIN handoff handles this.
- Admin can complete only after courier delivery has been recorded.
- Courier can only operate on assigned orders.
- Courier delivery does not automatically complete the order. Customer or admin confirmation finishes it.
- Canceled orders cannot continue through the normal lifecycle.

Order timeline:

- `createdAt` marks order placement.
- `processingAt` marks kitchen start.
- `readyAt` marks ready for pickup.
- `courierAssignedAt` and `courierAcceptedAt` track assignment.
- `restaurantHandedToCourierAt` marks handoff from restaurant.
- `courierPickedUpAt` and `transportationAt` mark delivery travel start.
- `courierDeliveredAt` marks courier PIN handoff.
- `customerConfirmedDeliveryAt` or `adminConfirmedDeliveryAt` marks completion confirmation.
- `completedAt` marks final order completion.

Development-only time simulator:

- Admin order details can include a development-only simulator.
- It can add virtual minutes to timeline phases without changing MongoDB timestamps.
- It supports order timeline testing, failed-delivery testing, courier assignment timeout testing, and ready-without-courier auto-cancel testing.
- It must not be visible in production.

## 10. Order Safety Automation

The app includes several automatic safety checks.

Stale unpaid orders:

- Unpaid `placed` orders can auto-cancel after 30 minutes.
- The app attempts to expire the matching open Stripe Checkout session.
- The order becomes `canceled`.
- The order is marked unpaid.
- A cancellation reason is stored.
- Customer and restaurant/admin notifications can be created.
- An audit log entry is written.

Courier assignment timeout:

- Pending courier assignments can expire after 10 minutes.
- If the courier does not accept or decline in time, the assignment becomes expired.
- The courier is released from `takenOrder`.
- The order can be reassigned.
- Assignment history records the expired attempt.
- Admins and the courier can receive notifications.

Ready without courier:

- A ready order with no courier can show a warning after it waits too long.
- If no courier accepts within 60 minutes after ready time, the order can auto-cancel.
- The order is marked canceled and unpaid.
- A system cancellation reason is stored.
- Customer/admin notifications and audit logs are created.

QStash:

- Upstash QStash schedules delayed maintenance checks.
- Jobs call server-only routes.
- QStash signatures are verified before processing.
- If QStash publishing fails, the user-facing checkout/status update should not fail just because a background check could not be scheduled.
- The order APIs still apply maintenance checks when orders are loaded, so the system has a fallback path.

## 11. Courier Workflow

Main courier routes:

- `/courier-dashboard`
- `/courier-dashboard/my-delivery`
- `/courier-dashboard/my-deliveries`
- `/courier-dashboard/my-deliveries/[id]`
- `/courier-dashboard/earnings`
- `/courier-dashboard/reviews`

Legacy customer-friendly aliases:

- `/my-delivery`
- `/my-deliveries`
- `/my-deliveries/[id]`

Courier availability:

- Couriers can toggle availability.
- Couriers have working hours.
- Assignment lists should respect whether the courier is available, already assigned, and currently working.
- The UI should prevent manual location submission unless both latitude and longitude are present.

Courier assignment:

- Restaurant admin assigns a courier to a ready order.
- The assignment starts as pending.
- Admin can include an optional courier-only note.
- Courier can accept or decline.
- If accepted, the order remains ready until restaurant handoff and courier pickup.
- If declined, the courier is released and the restaurant can choose another courier.
- If ignored, the assignment expires after 10 minutes.

Courier pickup and delivery:

- Restaurant admin records handoff to the courier.
- Courier records pickup.
- Order moves into transportation.
- Courier sees delivery address and map.
- Courier enters the customer's delivery PIN to record delivery.
- After the PIN is accepted, the order becomes delivered.
- Customer or admin confirms final completion.

Courier earnings and performance:

- Courier earnings exclude canceled and failed deliveries that were not completed.
- Courier stats can include completed deliveries, average delivery time, accepted/declined/expired assignments, current rating, late deliveries, and total earned.
- Admin can view courier details and performance.
- Courier can view their own earnings dashboard.

Failed delivery:

- If the customer is unavailable, the courier cannot cancel immediately.
- Courier can request failed-delivery cancellation only after at least 30 minutes in transportation.
- Courier must provide a reason.
- The order waits for restaurant owner or super admin verification.
- Restaurant owner verification marks the order canceled by restaurant owner.
- Super admin verification marks the order canceled by super admin.
- Courier does not earn the courier fee for canceled failed deliveries.
- Restaurant earnings should not count canceled orders as successful revenue.

## 12. Admin Dashboard

Main admin routes:

- `/admin-dashboard/users`
- `/admin-dashboard/users/[id]`
- `/admin-dashboard/categories`
- `/admin-dashboard/menu-items`
- `/admin-dashboard/restaurant`
- `/admin-dashboard/orders`
- `/admin-dashboard/orders/[id]`
- `/admin-dashboard/order-queue`
- `/admin-dashboard/operations`
- `/admin-dashboard/restaurant-reports`
- `/admin-dashboard/couriers`
- `/admin-dashboard/couriers/[id]`
- `/admin-dashboard/support-tickets`
- `/admin-dashboard/audit-logs`
- `/admin-dashboard/system-health`
- `/admin-dashboard/statistics`
- `/admin-dashboard/statistics/users`
- `/admin-dashboard/statistics/orders`

Admin dashboard capabilities:

- Manage own restaurant.
- Manage menu items and categories.
- Manage coupons.
- View orders.
- Update order kitchen status.
- Assign couriers.
- Add internal admin notes to orders.
- View order maps and order timeline.
- Handle failed-delivery verification.
- View support tickets.
- View restaurant reports.
- View operations overview.
- Review system health and production-critical integration configuration without exposing secret values.
- View courier stats.
- View audit logs.

Operations overview:

- Route: `/admin-dashboard/operations`
- Shows active order counts for today.
- Breaks active orders into placed, processing, ready, and transportation stages.
- Shows whether the restaurant is open, paused, closing soon, or closed.
- Shows whether the restaurant is near or at capacity using the same shared capacity thresholds that checkout and public restaurant status checks use.
- Shows available courier count.
- Shows orders that need attention.
- Shows today's revenue.
- Shows canceled and unpaid order counts.
- Provides quick operational context without opening every order manually.

Order queue:

- Shows live operational order states.
- Helps admins focus on late, unpaid, ready-without-courier, and courier-assignment issues.
- Can use SSE or polling-backed refresh depending on the current implementation.

Restaurant reports:

- Route: `/admin-dashboard/restaurant-reports`
- Supports daily, weekly, and monthly reports.
- Shows zero values when the selected period has no activity.
- PDF download is available only when there is report activity worth exporting.
- Useful for demoing admin analytics beyond single-order screens.

TanStack Table usage:

- Larger admin lists use the shared `TanStackDataTable` component.
- Tables support search, sorting, pagination, and column visibility where useful.
- Small order-detail tables can use simple table mode because they do not need heavy controls.

## 13. Super Admin Workflow

Super admin is used for platform-level safety and management.

Main responsibilities:

- Manage user roles.
- Grant/remove admin role.
- Grant/remove courier role.
- View global user/order statistics.
- View all couriers.
- Handle app-support tickets.
- Resolve failed-delivery verification if a restaurant owner refuses or cannot act.
- Access broader audit information.

Important security expectation:

- UI checks are helpful, but server-side checks must protect sensitive routes.
- Super admin logic should use configured emails, not hardcoded personal values.
- Elevated actions should be auditable.

## 14. Messaging System

Main routes:

- `/messages`
- `/messages/settings`

Main APIs:

- `/api/messages`
- `/api/messages/stream`
- `/api/messages/settings`

Messaging behavior:

- The main messaging page behaves like a messenger layout.
- Conversation list stays on the left.
- Selected conversation opens on the right without navigating to a completely separate visual page.
- URL params can represent selected participant and context.
- Back behavior returns the user to the base `/messages` route.
- Deleted/missing participants should show a safe fallback name instead of breaking the UI.
- Customer-to-customer messaging is blocked.
- Approved role combinations can message each other.
- Order-context messaging must match the order's restaurant owner or assigned courier where required.

Realtime:

- Server-sent events can notify clients to refresh messages.
- Existing JSON endpoints remain the source of truth.
- Polling can remain as fallback.

Message settings:

- Message sound settings are separate from notification sound settings.
- Both can currently use the same sound file while keeping separate settings logic for future expansion.

## 15. Notifications System

Main routes:

- `/notifications`
- `/notifications/settings`

Main APIs:

- `/api/notifications`
- `/api/notifications/stream`
- `/api/notifications/settings`

Notification behavior:

- Notifications are role-aware.
- Users can mark notifications as read.
- Notifications route to the correct destination based on type and metadata.
- Admin order notifications should open the relevant admin order route.
- Customer order notifications should open the relevant customer order route.
- Failed-delivery review notifications should point restaurant admins to the order details page.
- Delivery-completed notifications can invite the customer to rate the restaurant and courier.

Sound:

- Notification sound can be enabled/disabled.
- Message sound can be enabled/disabled separately.
- The sound file lives in `public/` and is played by client-side logic only after browser interaction/permission rules allow audio.

## 16. Support Tickets And Reports

Main routes:

- `/my-reports`
- `/admin-dashboard/support-tickets`

Support-ticket behavior:

- Customers and couriers can report problems.
- Reports can be linked to orders.
- Tickets can have statuses such as open, in review, and resolved.
- Admin response notes can be displayed to the reporter.
- Restaurant-scoped tickets go to the restaurant owner.
- App-support tickets go to super admin.
- Rate limiting protects report creation from spam.

Common support use cases:

- Missing item.
- Wrong item.
- Courier issue.
- Restaurant issue.
- Payment/order issue.
- App-level bug report.

## 17. Reviews And Ratings

Main routes:

- `/reviews`
- `/restaurants/[id]/reviews`
- `/courier-dashboard/reviews`
- `/my-orders/[id]/courier/[courierId]`

Restaurant reviews:

- Customers can review restaurants after completed paid orders.
- One review per order is enforced.
- Reviews can be shown on restaurant review pages.
- The app can flag suspicious repeated behavior in future improvements if needed.

Courier reviews:

- Customers can review the courier after completed courier deliveries.
- Courier review history is visible in the courier dashboard.
- Admin/courier stats can include rating averages.

## 18. Maps And Location

Map usage:

- Restaurant location and customer delivery location are stored as latitude/longitude.
- Leaflet and React Leaflet are used for visual maps.
- Courier location is updated for active delivery tracking.
- The app intentionally removed total distance-covered tracking because basic Leaflet/free map usage is not precise enough for reliable courier mileage accounting.

Delivery radius:

- Restaurant delivery radius is checked server-side.
- The cart and checkout can show whether the customer's delivery location is inside the radius.
- Development-only manual location controls help test this without changing real physical location.

## 19. Reports, Analytics, And Observability

Restaurant reports:

- Daily, weekly, and monthly report UI.
- PDF export when the period has activity.
- Empty periods show zero totals and disable PDF download.

Operations overview:

- Real-time operational view for restaurant admins.
- Useful for monitoring active orders and urgent problems.

Sentry:

- Captures client, server, and edge errors.
- App Router global error handling sends critical render errors.
- Session Replay is production-only and sampled to protect quota.
- Source map upload uses `SENTRY_AUTH_TOKEN` at build time.

Vercel:

- Vercel Analytics tracks production page traffic.
- Vercel Speed Insights tracks Web Vitals and frontend performance.

Audit logs:

- Important admin/system actions write audit logs.
- Examples include order status changes, auto-cancellations, courier assignment expiration, and internal note updates.

## 20. Important Edge Cases Covered

Authentication:

- Duplicate email registration is blocked.
- Credentials login is rate-limited.
- Register, forgot password, resend verification, checkout, support, and AI endpoints can be rate-limited.
- Unverified credentials accounts cannot log in when verification is enabled.
- Forgot-password response avoids account enumeration.
- OAuth users cannot reset a local password they do not have.

Menu and cart:

- Unavailable items cannot be added to cart.
- Deleted items block checkout.
- Price changes are shown before checkout.
- Mixed restaurant carts are blocked.
- Customer cannot order from their own restaurant.
- Checkout revalidates cart state server-side.

Restaurant availability:

- Closed restaurants block checkout.
- Paused restaurants block checkout.
- Blocked dates block checkout.
- Final 60 minutes before closing blocks checkout.
- Outside delivery radius blocks checkout.
- Active kitchen capacity blocks checkout.
- Active kitchen capacity also affects public ordering status and availability-alert behavior, so users are not told a restaurant is accepting orders while the kitchen is already full.
- Minimum order amount blocks checkout when subtotal is too low.
- Availability alerts can notify users when ordering becomes possible again.

Payment:

- Stripe webhook is the authority for paid status.
- Old Stripe links should not complete canceled orders.
- Unpaid stale orders auto-cancel after 30 minutes.
- Customer can cancel unpaid placed orders.
- Duplicate checkout attempts can reuse/recover a valid unpaid session.

Orders:

- Admin cannot update unpaid orders through kitchen status.
- Admin cannot skip directly to transportation or delivered.
- Completed/canceled orders cannot continue normal status changes.
- Delivery requires courier PIN.
- Customer/admin final confirmation is separate from courier handoff.
- Ready orders with no courier can auto-cancel after 60 minutes.
- Late orders show attention warnings.

Courier:

- Courier cannot accept someone else's assignment.
- Courier cannot be assigned while already carrying an active order.
- Assignment expires after 10 minutes without response.
- Declined/expired assignments are tracked for performance.
- Failed delivery requires at least 30 minutes in transport.
- Failed delivery requires admin or super admin verification.
- Courier earnings exclude canceled failed deliveries.

Messaging and notifications:

- Customer-to-customer messaging is blocked.
- Order-context messages require valid order relationships.
- Missing/deleted participants should show safe fallback display.
- Notification routes should be role-aware.
- Message sounds and notification sounds are separate settings.

Development and production:

- Dev time simulator is development-only.
- Dev manual location controls are development-only.
- Sentry Session Replay is production-only.
- Secrets stay in env vars and are not committed.

## 21. Demo Script

Use this flow when presenting the project.

1. Open the home page and explain that the app supports customers, restaurant admins, couriers, and super admin.
2. Show `/menu` and `/restaurants` to demonstrate discovery, search, sorting, pagination, availability, and favorites.
3. Open a restaurant details page and show working status, delivery radius, reviews, and quick reorder behavior.
4. Add items to cart and open `/cart`.
5. Explain cart validation: availability, restaurant open/closed state, busy state, delivery radius, minimum order amount, coupon suggestion, loyalty, and saved delivery addresses.
6. Continue to `/checkout` and explain that final validation happens server-side before Stripe.
7. Start the Stripe CLI listener locally and place an order with a Stripe test card.
8. Open `/my-orders/[id]` and show payment status, timeline, progress icons, order items, delivery PIN, and map.
9. Open `/admin-dashboard/orders/[id]` and move the order through processing and ready.
10. Assign a courier and explain pending/accepted/declined/expired assignment states.
11. Log in as courier and open `/courier-dashboard/my-delivery`.
12. Accept the assignment, record pickup, enter the delivery PIN, and mark courier handoff.
13. Return to customer order details and confirm delivery.
14. Show restaurant review and courier review options.
15. Show `/admin-dashboard/operations` for live operational overview.
16. Show `/admin-dashboard/restaurant-reports` for daily/weekly/monthly reports and PDF export.
17. Show `/messages`, `/notifications`, and sound settings.
18. Show support ticket creation from an order and admin support ticket handling.
19. Explain Sentry, Vercel Analytics, Speed Insights, Redis rate limits, and QStash background jobs.

## 22. Suggested Presentation Talking Points

Good short explanation:

> This is a realistic food ordering system, not only a cart demo. The strongest part is the operational flow: customers pay through Stripe, restaurant admins manage kitchen states, couriers accept and deliver with PIN verification, and the app handles failure cases such as unpaid orders, busy restaurants, closed restaurants, courier timeouts, and failed delivery review.

Technical strengths:

- Server-side checkout validation protects money and order correctness.
- MongoDB schemas store durable operational timestamps and snapshots.
- Stripe webhook keeps payment state authoritative.
- Redis protects sensitive endpoints from abuse.
- QStash schedules delayed maintenance jobs for production.
- SSE and TanStack Query keep messaging, notifications, and order views responsive.
- Sentry and Vercel monitoring improve production visibility.
- Tests cover auth, checkout, payments, QStash, orders, components, and e2e flows.

UX strengths:

- Customers see clear checkout blockers before paying.
- Admins get operations overview and attention alerts.
- Couriers get focused active-delivery screens.
- Tables are searchable/sortable/paginated.
- Notifications and messages can play optional sounds.
- Order progress is visual and understandable.

## 23. Main Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Run unit/integration tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

Run all tests:

```bash
npm run test:all
```

Stripe local webhook listener:

```bash
npm run stripe:listen
```

Trigger a sample Stripe checkout event:

```bash
npm run stripe:trigger
```

Run QStash-related tests:

```bash
npm run test:qstash
```

Run realtime-related tests:

```bash
npm run test:realtime
```

## 24. Where To Look In The Code

Authentication:

- `app/(auth)/register/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/api/register/route.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `libs/authOptions.ts`

Checkout and payment:

- `app/cart/page.tsx`
- `app/checkout/page.tsx`
- `app/api/checkout/route.ts`
- `app/api/payment-link/route.ts`
- `app/api/webhook/route.ts`
- `libs/stripeCheckoutSession.ts`

Restaurant availability:

- `libs/restaurantAvailability.ts`
- `libs/restaurantCapacity.ts`
- `libs/restaurantEta.ts`
- `libs/restaurantOrderingStatus.ts`
- `app/api/restaurants/[id]/ordering-status/route.ts`
- `app/api/restaurants/[id]/availability-alert/route.ts`
- `app/api/cart/validate/route.ts`

Order lifecycle:

- `models/order.ts`
- `app/api/orders/route.ts`
- `app/api/my-orders/route.ts`
- `app/admin-dashboard/orders/[id]/page.tsx`
- `app/my-orders/[id]/page.tsx`

Courier logic:

- `app/api/couriers/route.ts`
- `app/api/my-delivery/orders/route.ts`
- `app/courier-dashboard/my-delivery/page.tsx`
- `libs/courierAssignmentTimeout.ts`
- `libs/courierEarnings.ts`

Background order maintenance:

- `libs/orderMaintenanceConfig.ts`
- `libs/orderAutoCancellation.ts`
- `libs/qstash.ts`
- `app/api/qstash/order-maintenance/route.ts`

Messaging and notifications:

- `components/shared/MessagesCenter.tsx`
- `components/shared/NotificationsCenter.tsx`
- `app/api/messages/route.ts`
- `app/api/messages/stream/route.ts`
- `app/api/notifications/route.ts`
- `app/api/notifications/stream/route.ts`
- `libs/notifications.ts`

Admin reports and operations:

- `app/admin-dashboard/operations/page.tsx`
- `app/api/restaurant/operations/route.ts`
- `app/admin-dashboard/restaurant-reports/page.tsx`
- `app/api/restaurant/reports/route.ts`
- `app/api/restaurant/reports/pdf/route.ts`

Shared UI and data helpers:

- `components/shared/TanStackDataTable.tsx`
- `components/shared/AppCommandPalette.tsx`
- `components/shared/AppErrorBoundary.tsx`
- `libs/queryKeys.ts`
- `libs/dateFormat.ts`
- `libs/money.ts`
- `libs/phone.ts`

Types:

- `types/`

## 25. Current Product Maturity

The app is already beyond a simple CRUD demo. It has:

- realistic roles
- real payment flow
- order lifecycle
- delivery workflow
- restaurant operational rules
- support tickets
- messaging
- notifications
- monitoring
- rate limiting
- background jobs
- reporting
- tests

The main remaining future improvements could be:

- real driver routing/distance provider instead of basic map coordinates
- production-grade refund workflow when real payments are used
- more granular restaurant staff roles
- inventory-aware menu availability
- admin-configurable notification templates
- more advanced fraud/suspicious-review detection
- push notifications through a dedicated browser/mobile notification service
- Playwright browser tests for full UI flows if the project later needs heavier browser automation
