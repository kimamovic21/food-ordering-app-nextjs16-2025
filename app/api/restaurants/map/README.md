# API Route: /api/restaurants/map

> Keep this file aligned with `route.ts` when restaurant map behavior changes.

## Purpose

This public route returns lightweight restaurant location pins for the home page map. It is separate
from `/api/restaurants` so the discovery table/cards can keep their own pagination, filters, and
rating payload without forcing the home page to load extra restaurant metadata.

## Audience

- Public visitors
- Signed-in customers
- Anyone viewing `/`

## What Happens Here

- Connects to MongoDB with `mongoConnect`.
- Reads restaurants that have numeric `latitude` and `longitude`.
- Selects only public fields needed for map pins: name, address, coordinates, working hours,
  blocked dates, pause state, and delivery radius.
- Reuses `getRestaurantOrderingStatus` so the popup status matches the rest of the app's restaurant
  availability logic.
- Filters out any restaurant with invalid latitude/longitude values before returning JSON.

## Response Shape

```ts
{
  restaurants: Array<{
    _id: string;
    name: string;
    street: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    isOpen: boolean;
    isPaused: boolean;
    isAcceptingOrders: boolean;
  }>;
}
```

## Edge Cases

- Invalid coordinates are not returned to the frontend map.
- Empty restaurant lists return `restaurants: []` instead of an error.
- Database or unexpected server errors return `500` with a generic message.

## Maintenance Notes

- Do not add menu items, reviews, or large images here unless the home map actually needs them.
- Keep detailed restaurant browsing in `/api/restaurants`.
- If ordering status rules change, verify this route still matches restaurant cards and restaurant
  detail pages.
