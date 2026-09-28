# API Route: /api/loyalty

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/loyalty/route.ts`
- Route: `/api/loyalty`
- HTTP methods: `GET`
- Feature area: loyalty
- Main audience/roles: `customer`

## Plain-English Summary

Returns the signed-in customer's loyalty tier summary and recent loyalty ledger entries. Cart can
continue reading the simple `discountPercentage`, `currentTier`, and `totalOrders` fields, while
account/loyalty UI can also show reward history from `ledger`.

## What Happens In This File

- The route receives a `GET` request and requires a NextAuth session.
- It looks up `User` by the session email. If the user no longer exists, it returns `404`.
- It counts only `Order` documents where `orderStatus` is `completed`; this preserves the existing
  loyalty tier rule and prevents unpaid/canceled/in-progress orders from increasing discounts.
- It calls `calculateLoyaltyStatus()` for the current tier and simple discount response fields.
- It calls `getUserLoyaltyLedger()` to return recent ledger entries plus summary totals for reward
  history, applied savings, and reversals.
- It can return a ledger summary that is lower than `totalOrders` until legacy completed orders are
  backfilled with `npm run loyalty:ledger:backfill:apply`; the `/loyalty` UI handles this as a
  legacy history state, not as a checkout error.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `currency.js` through `libs/money.ts`: used by the ledger helper for stable money rounding.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.

## Edge Cases Covered

- Line 12: `if (!session) {`
- Line 19: `if (!user) {`

## Data Dependencies

- Models: `order`, `user`, `loyaltyLedgerEntry` through `libs/loyaltyLedger.ts`
- Shared libs: `authOptions`, `loyaltyCalculator`, `loyaltyLedger`
- Shared types: `LoyaltyLedgerResult`, `LoyaltyLedgerEntry`, `LoyaltyLedgerSummary`

## Side Effects

- Read-only. It does not create rewards; rewards are recorded when an order is completed through
  `/api/orders` or `/api/my-orders`.

## Response Behavior

- Status codes detected: `401`, `404`, `500`
- Common response fields detected: `error`, `discountPercentage`, `currentTier`, `totalOrders`,
  `ledger.entries`, `ledger.summary.earnedOrders`, `ledger.summary.totalDiscountApplied`,
  `ledger.summary.reversedOrders`, `ledger.summary.totalDiscountReversed`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/loyalty` does. Explain that it is a customer-only
read endpoint: it verifies the session, counts completed orders for tier calculation, and returns a
safe JSON shape that includes both the current discount and the reward ledger history.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
