# API Route: /api/upload/restaurants

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/upload/restaurants/route.ts`
- Route: `/api/upload/restaurants`
- HTTP methods: `POST`, `DELETE`
- Feature area: upload
- Main audience/roles: `admin`

## Plain-English Summary

Uploads or deletes restaurant gallery images for restaurant admins through Cloudinary while enforcing owner/admin access.

## What Happens In This File

- `POST` requires a signed-in admin, reads multipart `formData()`, streams the image to Cloudinary, and returns the `secure_url` for the restaurant form.
- `DELETE` requires a signed-in admin, receives an image URL, extracts the Cloudinary public id, and deletes the remote asset.
- The upload folder is environment-aware so development and production restaurant images do not mix.
- The route checks the current user before allowing upload/delete behavior because restaurant images belong to an admin-owned restaurant.

## Request Inputs

- JSON body parsed with `req.json()`
- multipart/form-data body parsed with `formData()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `cloudinary`: stores uploaded user, restaurant, category, and menu-item images; cleanup logic removes replaced or deleted assets by public id.

## Auth, Role, And Safety Checks

- Requires a NextAuth session for at least one handler branch.
- Uses shared `authOptions`, so role/session behavior follows the global auth setup.
- Checks the `admin` role before allowing restaurant/admin operations.

## Edge Cases Covered

- Line 16: `if (!email) {`
- Line 22: `if (!user || user.role !== 'admin') {`
- Line 29: `if (!file) {`
- Line 40: `if (error) return reject(error);`
- Line 49: `if (restaurant) {`
- Line 76: `if (!email) {`
- Line 82: `if (!user || user.role !== 'admin') {`
- Line 88: `if (!imageUrl) {`
- Line 93: `if (imageUrl && imageUrl.trim() !== '') {`
- Line 99: `if (publicId) {`

## Data Dependencies

- Models: `restaurant`, `user`
- Shared libs: `authOptions`, `cloudinary`
- Shared types: None detected

## Side Effects

- Touches Cloudinary media upload/delete behavior.
- Creates or deletes Cloudinary restaurant image assets.
- Returns URLs that the restaurant form later persists through `/api/restaurant`.

## Response Behavior

- Status codes detected: `400`, `401`, `403`, `500`
- Common response fields detected: `req`, `error`, `uploadedImage`, `ownerId`, `success`, `url`, `ERROR`, `Cloudinary`, `message`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/upload/restaurants` does. Explain that restaurant images are uploaded first to Cloudinary, then their URLs are saved with the restaurant. This keeps MongoDB light and lets Cloudinary handle media hosting while the API protects admin ownership.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
