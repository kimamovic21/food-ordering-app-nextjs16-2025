# App Folder: app/checkout

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the post-payment checkout confirmation UI. It reads the Stripe session id from the URL, fetches the matching order/receipt data, and shows the customer what was purchased after returning from Stripe.

## Route And Audience

- App route/group: `/checkout`
- Folder path: `app/checkout`
- Main audience/roles: `customer`
- Main interaction style: static/server-rendered or delegated interactions

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/my-orders?sessionId=${encodeURIComponent(sessionId)}`. Keep API response shapes aligned.

## Stripe Return Flow

- The customer leaves the app for Stripe Checkout from `/cart`.
- After payment, Stripe redirects back to this route with a `session_id`.
- `page.tsx` calls `/api/my-orders?sessionId=...` so the app can find the order associated with that Stripe session.
- The page displays receipt-oriented data such as restaurant, items, totals, tax, delivery fee, coupon discount, and order metadata.
- The Stripe webhook remains responsible for authoritative payment confirmation; this page is a customer-facing receipt/follow-up screen.

## Important Files

- `app/checkout/layout.tsx`: functions/components: `CheckoutLayout`
- `app/checkout/page.tsx`: functions/components: `formatMoney`, `CheckoutContent`, `fetchReceipt`, `data`, `CheckoutPage`; API calls: `/api/my-orders?sessionId=${encodeURIComponent(sessionId)}`; client component

## API/Data Connections

- Calls `/api/my-orders?sessionId=${encodeURIComponent(sessionId)}`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Handle missing or invalid `session_id` with a clear empty/error state instead of a blank receipt.
- Do not mark orders paid from this UI; payment state belongs to Stripe webhook/API logic.
- Keep money formatting consistent with checkout totals and receipt emails.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the page the customer sees after Stripe sends them back. It uses the Stripe session id to fetch the order receipt from the API, but it does not decide whether payment succeeded; the webhook and server-side order logic own that truth.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
