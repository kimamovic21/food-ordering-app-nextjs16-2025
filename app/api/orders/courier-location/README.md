# API Route: /api/orders/courier-location

Read this document and the adjacent `route.ts` before changing who can track a courier.

## Purpose And Audience

An order is permission to track its active delivery, not permanent permission to follow its
courier. This read-only endpoint serves the order's customer, the admin assigned to its restaurant,
and the configured super admin. It never uploads coordinates or changes order/assignment state.

## Request And Flow

`GET /api/orders/courier-location?orderId=<MongoDB ObjectId>`; no request body.

1. Require a NextAuth session email and a valid order ID before connecting to MongoDB.
2. Load the viewer's current database identity/role/restaurant, not just the session role.
3. Load only the order fields needed for access and assignment checks. Do not populate a full user.
4. Authorize the customer by `userId`. Fall back to email only for legacy orders without an owner ID.
   A matching email cannot override an existing, different owner ID.
5. Authorize restaurant admins only when their `restaurantId` matches the order. Super-admin
   access requires the database `admin` role and the configured super-admin email.
6. Return `location: null` with `trackingStatus: 'ended'` for delivered, completed, canceled,
   or already-handed-to-customer orders (`courierDeliveredAt`), before reading any courier location.
7. Require an accepted assignment in `ready` or `transportation`. Legacy transportation orders
   may omit assignment status. Pending, declined, expired, and earlier order stages return waiting.
8. Find a user with role `courier`, `takenOrder` equal to this order, and the assigned `courierId`
   when present. If that courier has moved to another order, never fall back to an unrelated user.
   Legacy orders without `courierId` may find the courier through the matching `takenOrder`.
9. Validate finite coordinates within geographic bounds. Wait for a new reading if coordinates
   predate the accepted/assigned timestamp, so a previous delivery's last point is not reused.
10. Return the narrow location DTO, optional courier name/email, tracking status and server check time.

## Packages And Services

- Next.js App Router owns the GET handler and JSON responses.
- NextAuth checks the signed-in session through `authOptions`.
- Mongoose reads `Order` and `User` with explicit field projections.
- `libs/courierTracking.ts` normalizes coordinates/timestamps and owns the shared freshness policy.
- `types/courierTracking.ts` defines the response contract used by `hooks/useCourierTracking.ts`.
- Leaflet is a frontend consumer, not part of the endpoint. No image-service or payment calls occur.

## Security And Edge Cases

- Authorization happens before any courier lookup, including for terminal orders.
- Being an admin alone does not grant access to another restaurant's courier.
- A historical order's `courierId` cannot reveal that courier's current delivery.
- PIN handoff ends tracking even before customer/admin completion confirmation.
- Missing coordinates are waiting, not a server failure. Zero latitude/longitude are valid.
- Old valid readings from the current assignment retain their original timestamp; the UI labels
  them stale instead of pretending they are live. Missing/invalid/far-future update times are not fresh.
- Every success and error uses `Cache-Control: private, no-store, max-age=0` and `Vary: Cookie`.
- Connection and lookup failures return a generic error without database details.
- This route is read-only. No migration, backfill, inventory update or assignment maintenance occurs.

## Responses

- `200`: `{ location, trackingStatus, checkedAt, message?, courier? }`.
- `location`: null or `{ latitude, longitude, lastLocationUpdate }`; dates use ISO strings.
- Server statuses: `active`, `waiting`, `ended`. The hook adds `denied` for HTTP 401/403/404.
- `400`: invalid ID; `401`: missing session/email; `403`: unrelated viewer.
- `404`: missing user/order; `500`: safe generic server error.
- The existing `location` and `courier` shapes remain supported. State and check time are additive.

## Frontend Behavior

`OrderMap` uses `useCourierTracking` for cancellable, viewer/order-scoped TanStack Query requests.
It polls every 60 seconds while visible and enabled, skips interval requests after ended/denied
responses, and does not retain inactive query data. A changed order or account cannot reuse the
previous viewer/order's pin.

Freshness expires after two minutes. The order endpoint's server check time avoids relying on the
browser's wall clock for the initial reading age; the client continues aging it between responses.
Network/server failures keep the map with an explicitly labeled last-known point. HTTP 401/403/404,
terminal orders and missing locations clear the courier pin. Refresh does not remount the map.

The courier's own map continues using `/api/my-delivery/location`, including the existing manual
simulator refresh. Static restaurant maps opt out with `shouldFetchCourier={false}`.

## How To Explain This In A Presentation

The map is private to an active delivery. The backend checks who is asking, which restaurant owns
the order, whether the courier accepted it, and whether the courier is still carrying it. After
handoff, the customer keeps their order history but loses access to the courier's current position.
If location sharing stops, the map shows the last known point and update time, not a false live label.

## Focused Verification

Run `npm run test:courier-tracking`. It selects four files: route authorization/lifecycle tests,
coordinate/freshness helpers, query behavior, and the shared map. Services and Leaflet are mocked;
no production database or real courier GPS data is needed. Follow with a manual active-order map
check as customer, matching restaurant admin, and courier when signed-in test accounts are available.

Keep this README, the shared-component README, `FEATURE_WORKFLOW_INDEX.md`, and `TESTING.md`
aligned when the tracking contract changes.
