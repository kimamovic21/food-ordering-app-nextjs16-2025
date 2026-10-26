# Retired Standalone Menu Image Upload

POST /api/upload/menu-items returns HTTP 410 with a message to reload the form and save the menu
item. It does not parse/upload the file, mutate MongoDB, or delete Cloudinary assets. This prevents
the old standalone-upload endpoint from being used to accumulate images without saving an item.

## Replacement Workflow

The create/edit forms preview file selections locally. Only Save/Update sends the file, together
with JSON item data, to POST/PUT /api/menu-items. That route authorizes the owner, validates the
item, uploads to the environment-specific folder, and saves the item URL. After a successful
replacement it cleans the old image. Failed-save uploads are checked for references before cleanup.

See `app/api/menu-items/README.md` for the multipart contract, edit-version/inventory guards, and
cross-service failure limitations. The implementation lives in `libs/menuItemImage.ts`.
Other image workflows (avatars, restaurants, categories) are unchanged.

## Verification

- `__tests__/api/upload-menu-items.route.test.ts`: standalone uploads cannot reach Cloudinary.
- `__tests__/api/menu-item-images.route.test.ts`: save-time upload and safe cleanup.
- `__tests__/components/NewMenuItemPage.test.tsx` and `EditMenuItemPage.test.tsx`: selecting and
  abandoning a file never makes an upload request; submit sends a combined save.
