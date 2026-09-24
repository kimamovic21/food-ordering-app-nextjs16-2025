# API Route: /api/ai/menu-item-description

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/ai/menu-item-description/route.ts`
- Route: `/api/ai/menu-item-description`
- HTTP methods: `POST`
- Feature area: AI-assisted menu content
- Main audience/roles: `public or shared`

## Plain-English Summary

Handles post work for the AI-assisted menu content area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST requests and converts request/session data into server-side business checks.
- It uses no direct Mongoose model imports for persistence.
- It delegates shared logic to `aiMenuDescription`, `authGuards`, `menuItemDescription`, `rateLimit` so behavior stays consistent across the app.
- Detected local functions/handlers: only exported HTTP handlers.

## Request Inputs

- JSON body parsed with `req.json()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `@upstash/redis` and `@upstash/ratelimit`: protect sensitive routes from repeated abuse while keeping checks server-side.
- `openai`: supports AI-assisted content generation such as menu-item descriptions.

## Auth, Role, And Safety Checks

- Applies Upstash Redis-backed rate limiting.

## Edge Cases Covered

- Line 18: `if (!(await isAdmin())) {`
- Line 29: `if (!rateLimit.success) {`
- Line 39: `if (!name) {`
- Line 43: `if (name.length > 120) {`
- Line 57: `if (message === 'OpenAI API key is not configured') {`

## Data Dependencies

- Models: None detected
- Shared libs: `aiMenuDescription`, `authGuards`, `menuItemDescription`, `rateLimit`
- Shared types: None detected

## Side Effects

- Mostly read-only, or mutations are fully delegated to imported helpers.

## Response Behavior

- Status codes detected: `400`, `401`, `500`
- Common response fields detected: `req`, `error`, `identifier`, `limit`, `namespace`, `window`, `maxCharacters`, `model`, `message`, `description`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/ai/menu-item-description` does. Explain that it belongs to the AI-assisted menu content workflow, serves `public or shared`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
