# API Route: /api/menu-items

## Purpose And Access

This route serves public menu reads and restaurant-owner menu management. `GET` is public;
`POST`, `PUT`, `PATCH`, and `DELETE` require admin access through `isAdmin`, a session email,
and a current User record. Existing-item mutations also require `adminId` ownership.
Being the platform super admin does not bypass that ownership check.

## Read And Create Behavior

- `GET?_id=...` returns an array containing the populated item, or an empty array if not found.
- `GET?adminId=...` returns that owner's items. Unfiltered GET returns the public menu.
- Grouped reads support category summaries. Advanced reads filter search text, categories,
  price range and sort order before pagination. Restaurant ratings are attached to results.
- `POST` requires the admin to have a restaurant, validates the required price count, and attaches
  the server-derived owner/restaurant IDs. `priceType` supports single, double and triple pricing.
  Legacy inference remains available; double pricing keeps its second amount in `priceMedium`.
- Creation normalizes optional stock settings through `buildMenuItemInventoryFields`.
  Untracked items have null physical stock; opting into tracking defaults to ten units.
  Existing items are not automatically migrated or assigned stock.

## Versioned Edit Contract

Both `PUT` and `PATCH` require `expectedEditVersion`, a nonnegative integer from the last loaded
item (`0` for legacy documents without the field). A successful atomic write returns the updated
document and increments `editVersion`. An older browser tab without this field must reload.
This version covers admin edits only, not routine checkout reservations or inventory capture.

`PUT` still accepts the existing content/price payload. Its inventory fields are optional:

- Omit `stockQuantity` when it has not intentionally changed. Saving a description, price or image
  must not restore stock consumed after the form loaded.
- An intentional tracked-stock change requires `stockQuantity` and `expectedStockQuantity`.
  Quantities must be integers in `0..1000`; a missing legacy/untracked baseline is `null`.
- Enabling tracking requires an explicit stock value and baseline. Disabling tracking clears stock
  to null but is rejected while stock remains reserved.
- `lowStockThreshold`, when supplied, must be an integer in `0..100`.
- Client-supplied reserved counts, timestamps and stored versions are never copied into the update.

`buildMenuItemInventoryEdit` builds the actual MongoDB write filter: owner/id, expected admin
version, and, for stock writes, expected physical stock and a live reserved-count ceiling.
Tracking changes additionally require zero reservations. `findOneAndUpdate` applies that filter
and the update atomically. A pre-read check alone is insufficient because checkout can reserve
units between reading and saving.

`PATCH` only updates manual availability and increments the same edit version. This prevents an
older form from undoing a newer availability toggle. Sold-out state remains derived separately.

## Errors And Edge Cases

- Unauthorized/non-owner requests cannot modify items or obtain a conflict snapshot for another owner.
- Invalid edit version/inventory values return `400`; a failed write precondition returns `409`
  with `code: MENU_ITEM_EDIT_CONFLICT` and reload guidance. No partial edit is applied.
- A missing item at the initial read returns `404`; deletion between read and write safely conflicts.
- Two forms based on the same version cannot both overwrite the document.
- Stock can equal reserved units, leaving zero available units, but cannot go below reservations.
- Omitted inventory fields are preserved on PUT. Missing legacy versions compare as zero.
- A conflicting save never deletes the previous image. If the conflict happens during upload,
  the unused new upload is cleaned up after confirming that no item references it.
- `DELETE` uses `findBlockingMenuItemOrder` and returns `409` while an active order needs the item.
  Otherwise it attempts existing Cloudinary image cleanup and removes the document.
- Unexpected route failures return the existing generic failure responses.

## Packages And Dependencies

- Next.js route handlers return JSON through the standard Response API.
- NextAuth/authGuards resolve access; Mongoose owns MenuItem, Category, User and Order records.
- Zod validates edit metadata/inventory in `libs/menuItemEdit.ts`.
- `menuItemInventory.ts`, `orderQuantityLimits.ts`, `orderDeletionGuards.ts`, and
  `reviewSummary.ts` retain their shared inventory, limit, deletion and rating responsibilities.
- Cloudinary uploads and cleanup are coordinated by `libs/menuItemImage.ts` within the save request.

## Images Are Saved Only On Submit

Selecting a file only previews it locally. New/edit forms send one POST/PUT to this route when
Save/Update is pressed. With a selected image the body is multipart FormData: `data` contains the
JSON item payload and `file` contains the image. JSON requests without a new file remain supported.
The old standalone `/api/upload/menu-items` endpoint returns 410 without contacting Cloudinary.

1. Resolve the session, restaurant/owner, required prices and inventory rules before uploading.
2. Parse the request and reject empty/non-image files or files over 4 MB. Run Mongoose model
   validation before external upload; a temporary validation-only image value is never persisted.
3. For edits with a file, check the complete version/stock filter before uploading. Recheck it
   atomically in the final write, because another edit or checkout reservation can still race.
4. Upload into `menu-items` locally or `menu-items-production` in production, then save the URL
   and all other fields together. Image upload alone is not reported as a successful item save.
5. Only after a successful edit, attempt deletion of the replaced image. Deletion checks the
   configured Cloudinary account, the current environment's folder and remaining MenuItem references.
6. If the write fails, attempt cleanup of the newly uploaded image, not the original. Query current
   references first: a lost database acknowledgement is not proof that the write failed.

Cloudinary and MongoDB cannot share an atomic transaction. Cleanup failures are logged without
turning a committed save into an error. A terminated server or unavailable reference check can
still leave an orphan; the reviewed audit in `OPERATIONS_RUNBOOK.md` remains the recovery path.
A refresh before Save performs no upload. A refresh after Save was submitted does not undo a save
already being processed by the server. This is not a general upload quota or rate-limiting system.

## Verification And Maintenance

Focused coverage includes route auth/contracts in `__tests__/api/menu-items.route.test.ts`,
real isolated MongoDB write races in `__tests__/libs/menuItemEdit.test.ts`, image lifecycle in
`__tests__/api/menu-item-images.route.test.ts`, retired endpoint coverage in
`__tests__/api/upload-menu-items.route.test.ts`, and submit-only/draft behavior in
`__tests__/components/EditMenuItemPage.test.tsx` and `__tests__/components/NewMenuItemPage.test.tsx`.

If another admin mutation is added, it must participate in the edit-version protocol. Do not
replace conditional writes with an unguarded findByIdAndUpdate or send unchanged stock from forms.
Checkout and webhook guards remain authoritative; this route does not replace them.

## Presentation Example

An admin opens an item showing ten units. Three units sell while the admin edits its description.
Saving the description keeps seven units. If the admin intentionally changes stock, the API first
checks that its original stock baseline is still current and that reservations fit. If another
admin tab saved newer content, the older tab receives a conflict instead of overwriting it.
