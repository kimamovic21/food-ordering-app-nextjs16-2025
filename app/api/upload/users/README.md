# API Route: /api/upload/users

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/upload/users/route.ts`
- Route: `/api/upload/users`
- HTTP methods: `POST`, `DELETE`
- Feature area: upload
- Main audience/roles: `signed-in user`

## Plain-English Summary

Uploads or removes the signed-in user's avatar image through Cloudinary, then keeps the MongoDB user document aligned with the current image URL.

## What Happens In This File

- `POST` requires a NextAuth session, reads multipart `formData()`, extracts the `file`, streams it to Cloudinary, deletes the previous avatar if one existed, and saves the new `secure_url` on the user.
- `DELETE` requires a session, receives an `imageUrl`, deletes the Cloudinary asset when it is not the default local avatar, and clears the user's `image` field.
- The Cloudinary folder is environment-aware: production uses `users-production`, while local development uses `users`.
- The route extracts the Cloudinary public id from the stored URL before calling `cloudinary.uploader.destroy`.
- MongoDB remains the source of truth for which image belongs to the user; Cloudinary is only the media storage layer.

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

## Edge Cases Covered

- Line 15: `if (!email) {`
- Line 22: `if (!file) {`
- Line 32: `if (error) return reject(error);`
- Line 40: `if (!user) {`
- Line 44: `if (user.image) {`
- Line 49: `if (oldPublicId) {`
- Line 78: `if (!email) {`
- Line 84: `if (!imageUrl) {`
- Line 90: `if (!user) {`
- Line 94: `if (imageUrl && imageUrl !== '/user-default-image.webp') {`
- Line 99: `if (publicId) {`

## Data Dependencies

- Models: `user`
- Shared libs: `authOptions`, `cloudinary`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- Touches Cloudinary media upload/delete behavior.
- Replaces or clears the `image` field on the user document.
- Deletes old Cloudinary avatar assets when the public id can be extracted.
- Returns the updated user payload so the profile UI can refresh immediately.

## Response Behavior

- Status codes detected: `400`, `401`, `404`, `500`
- Common response fields detected: `req`, `uploadedImage`, `image`, `success`, `url`, `user`, `ERROR`, `error`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/upload/users` does. Explain that the profile page does not store image files in MongoDB. It sends the file to this API, the API streams it to Cloudinary, stores only the returned URL on the user, and cleans up the previous Cloudinary image so old avatars do not pile up.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
