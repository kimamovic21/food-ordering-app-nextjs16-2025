# API Route: /api/categories

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/categories/route.ts`
- Route: `/api/categories`
- HTTP methods: `POST`, `PUT`, `DELETE`, `GET`
- Feature area: categories
- Main audience/roles: `admin`, `restaurant admin`

## Plain-English Summary

Handles post/put/delete/get work for the categories area. The route keeps the local workflow server-authoritative and delegates shared business rules to models and libs.

## What Happens In This File

- The route receives POST/PUT/DELETE/GET requests and converts request/session data into server-side business checks.
- It uses `category`, `menuItem` for persistence.
- It delegates shared logic to `authGuards`, `cloudinary` so behavior stays consistent across the app.
- Detected local functions/handlers: `extractPublicId`.

## Request Inputs

- No direct input parsing detected; route may rely on session/context only.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `cloudinary`: stores uploaded user, restaurant, category, and menu-item images; cleanup logic removes replaced or deleted assets by public id.

## Auth, Role, And Safety Checks

- No explicit session/role guard detected in this file; confirm whether the route is intentionally public.

## Edge Cases Covered

- Line 10: `if (!(await isSuperAdmin())) {`
- Line 19: `if (existing) {`
- Line 34: `if (!(await isSuperAdmin())) {`
- Line 50: `if (!(await isSuperAdmin())) {`
- Line 62: `if (uploadSegment?.[1]) return uploadSegment[1];`
- Line 65: `if (menuMatch?.[1]) return `menu-items/${menuMatch[1]}`;`
- Line 71: `if (menuItem.image) {`
- Line 74: `if (publicId) {`

## Data Dependencies

- Models: `category`, `menuItem`
- Shared libs: `authGuards`, `cloudinary`
- Shared types: None detected

## Side Effects

- Creates MongoDB documents.
- Updates existing MongoDB documents.
- Deletes or cleans up MongoDB data.
- Touches Cloudinary media upload/delete behavior.

## Response Behavior

- Status codes detected: `400`, `401`, `500`
- Common response fields detected: `request`, `error`, `category`, `imageUrl`, `cloudinary`, `name`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/categories` does. Explain that it belongs to the categories workflow, serves `admin`, `restaurant admin`, validates the inputs and access rules above, then returns a stable JSON response or a clear error status.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
