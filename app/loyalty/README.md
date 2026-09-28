# App Folder: app/loyalty

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns loyalty tier status, reward ledger history, and the customer-facing loyalty
explanation UI.

## Route And Audience

- App route/group: `/loyalty`
- Folder path: `app/loyalty`
- Main audience/roles: `customer`
- Main interaction style: session/auth state

## What Happens Here

- `page.tsx` is a protected server component. It reads the NextAuth session, connects to MongoDB,
  resolves the signed-in user, counts completed orders, calculates the current loyalty tier, and
  loads recent completed order snapshots.
- `page.tsx` also reads `libs/loyaltyLedger.ts` so the customer can see an audit-style reward
  history: completed-order credits, applied loyalty discounts, and any reversed rewards.
- Tier math still comes from `libs/loyaltyCalculator.ts`; the ledger is a transparency/history
  layer and does not replace the server-authoritative checkout validation.
- `loading.tsx` mirrors the major page sections so hard refreshes and slow server reads do not show
  a blank or jumpy loyalty page.

## Important Files

- `app/loyalty/layout.tsx`: functions/components: `LoyaltyLayout`
- `app/loyalty/loading.tsx`: functions/components: `LoyaltyLoading`; renders skeletons for current status, rewards ledger, and tier cards
- `app/loyalty/page.tsx`: functions/components: `LoyaltyPage`, `recentCompletedOrders`, `loyaltyLedger`; session-aware; reads orders, tier status, ledger entries, savings totals, and recent history

## API/Data Connections

- Reads `User` by session email.
- Reads `Order` for completed-order count and recent completed order history.
- Reads `LoyaltyLedgerEntry` through `getUserLoyaltyLedger()`.
- The matching public API route is `/api/loyalty`, which returns the same tier summary plus ledger
  data for client consumers such as cart or future account widgets.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: read the signed-in user, completed orders, and loyalty ledger entries.
- `currency.js` through `libs/money.ts`: formats loyalty savings consistently.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- A user with no completed orders should see a helpful empty ledger state and first-tier progress,
  not an error.
- Loyalty discounts shown here are historical snapshots from completed orders. Do not recalculate old
  order discount amounts from today's tier rules.
- If `completedOrderCount` is higher than active ledger reward rows, show the legacy-order notice so
  older completed orders still feel accounted for while the maintenance backfill is pending.
- Use `npm run loyalty:ledger:backfill` for a dry run and
  `npm run loyalty:ledger:backfill:apply` only after reviewing the planned rows.
- If reward reversal is added to more flows later, update the ledger labels here so customers can
  understand what changed and why.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the customer loyalty center. It shows the user's
current tier, progress toward the next discount, every tier rule, recent completed orders, and a
ledger-style reward history. The important part is that the UI does not invent rewards by itself:
completed orders and discount snapshots come from MongoDB, tier math comes from shared helpers, and
the ledger makes reward changes explainable when a discount is applied or reversed.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README, `app/api/loyalty/README.md`, and the loyalty ledger helper
  tests.
- Preserve accessibility, loading, error, and disabled states when changing UI.
