# API Route: /api/upload/menu-items

> Enhanced route documentation. Keep this file aligned with the adjacent `route.ts` when behavior changes.

## Source And Ownership

- Source file: `app/api/upload/menu-items/route.ts`
- Route: `/api/upload/menu-items`
- HTTP methods: `POST`
- Feature area: upload
- Main audience/roles: `admin`

## Plain-English Summary

Uploads menu item images to Cloudinary and optionally replaces the image stored on an existing menu item.

## What Happens In This File

- The route first checks `isAdmin()` so only restaurant admins can upload menu item images.
- It reads multipart `formData()` and requires a `file`.
- It streams the file to Cloudinary in the menu-item image folder.
- If `menuItemId` is present, it loads the existing item, deletes the previous Cloudinary image when possible, saves the new image URL, and returns the updated menu item.
- If no `menuItemId` is present, it returns only the uploaded URL so the create form can include it in the later menu-item create request.

## Request Inputs

- multipart/form-data body parsed with `formData()`

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `mongoose` + MongoDB models: keep users, restaurants, menu items, orders, coupons, reviews, and audit data server-authoritative.
- `cloudinary`: stores uploaded user, restaurant, category, and menu-item images; cleanup logic removes replaced or deleted assets by public id.

## Auth, Role, And Safety Checks

- Requires admin access through the shared `isAdmin()` guard before upload work starts.
- The route should stay protected because menu item images belong to restaurant/admin inventory management.

## Edge Cases Covered

- Line 11: `if (!(await isAdmin())) {`
- Line 19: `if (!file) {`
- Line 29: `if (error) return reject(error);`
- Line 36: `if (menuItemId) {`
- Line 39: `if (!menuItem) {`
- Line 44: `if (menuItem.image) {`
- Line 48: `if (oldPublicId) {`

## Data Dependencies

- Models: `menuItem`
- Shared libs: `authGuards`, `cloudinary`
- Shared types: None detected

## Side Effects

- Updates existing MongoDB documents.
- Touches Cloudinary media upload/delete behavior.
- Deletes old Cloudinary assets when an existing menu item image is replaced.
- May update the `image` field on a menu item document.

## Response Behavior

- Status codes detected: `400`, `401`, `404`, `500`
- Common response fields detected: `req`, `uploadedImage`, `image`, `success`, `url`, `menuItem`, `ERROR`

## How To Explain This In A Presentation

Open this file when someone asks what `/api/upload/menu-items` does. Explain that menu item photos are media assets, not database blobs. The admin uploads the file, Cloudinary stores it, MongoDB keeps only the URL, and replacing an image attempts to clean up the previous Cloudinary asset.

## Maintenance Notes For Future Work

- Read the source `route.ts` before editing; this README is a map, not the source of truth.
- If you change request/response fields, update shared types in `types/`, UI consumers, and focused tests.
- Preserve auth, role, ownership, rate-limit, payment, and data-integrity guards unless a task explicitly changes them.
- For checkout, payment, order, courier, notification, QStash, or audit routes, run the related focused tests before finishing.
