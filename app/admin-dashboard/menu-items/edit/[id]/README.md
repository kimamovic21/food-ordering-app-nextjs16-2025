# Menu Item Edit Screen

## Route And Audience

`/admin-dashboard/menu-items/edit/[id]` belongs to the restaurant admin who owns the item.
The page checks profile/ownership for UX; the API repeats authorization for every mutation.
Super-admin status does not bypass item ownership. The existing create page is separate.

## Loading And Form State

`fetchCategoriesAndItem` loads categories and the item, checks both responses, and calls
`applyItem` only after a valid owned record is available. Initial failures/missing items show a
retry state rather than an editable empty form. Loading skeletons remain in use.

React state holds the draft; a separate `baseline` stores the last successfully loaded/saved
document, including `editVersion`, physical stock, and reserved stock. The shared MenuItemForm
shows the last-loaded stock/reserved/available summary. This is a snapshot, not a live count.

`applyItem` understands legacy price types, initializes optional inventory defaults, and uses
the server response after a successful save to refresh values and advance the version. The user
stays on this edit route after saving. Existing untracked items remain untracked.

## Saving Without Losing Concurrent Changes

1. Validate required name/category/prices, quantity limits and stock ranges. Empty or fractional
   stock inputs are rejected. Save is disabled while AI description generation is pending.
2. A synchronous ref guard prevents duplicate submissions before React updates button state.
3. Keep the selected image as a local File/preview until Update. Selecting or abandoning a draft
   performs no upload or deletion.
4. Send one PUT with content fields and `expectedEditVersion`. When a file is selected, multipart
   FormData contains JSON `data` and `file`; otherwise the existing JSON request is used.
5. `getMenuItemStockEdit` omits unchanged stock. An intentional stock change includes the old
   `expectedStockQuantity` baseline. The API atomically verifies versions, stock and reservations.
6. On success, show a success toast and adopt the returned document. On failure, keep the draft
   and show the API error. The server uploads during the save and only deletes the old image after
   the version-checked write succeeds. Failed-save uploads are checked for references before cleanup.

## Conflict Recovery

A 409 displays a persistent warning above the form and disables further saves of that stale
draft. The text, stock input, and selected image remain present. The owner can copy/review their
changes, then choose **Reload latest item**.

A Radix AlertDialog explicitly asks to discard the draft. **Keep draft** cancels; **Reload latest**
fetches current data and replaces the draft only after success. If reloading fails, the old draft
and conflict stay intact. There is no automatic overwrite, force-save, or silent rebase onto a new
version. Drafts are in memory only; a browser refresh/navigation still discards them.

## Important Existing Behavior

- AI generation calls /api/ai/menu-item-description, requires a name and caps description length.
- Single/double/triple pricing remains compatible; double pricing's second amount is stored in
  priceMedium but displayed as Large elsewhere.
- Manual availability and derived inventory availability remain separate.
- Disabling tracking cannot discard outstanding reservations; lowering stock cannot go below them.
- No bulk migration, automatic ten-unit backfill, payment changes, or courier changes are involved.

## Packages And Source Map

- React manages controlled state; react-hook-form supplies the existing Form wrapper. This page
  does not use a Zod form resolver; server edit validation lives in libs/menuItemEdit.ts.
- shadcn/Radix provides form and confirmation controls; Lucide provides the reload icon.
- Sonner supplies toast feedback. Cloudinary save-time uploads and OpenAI generation stay server-side.
- Shared UI: ../../MenuItemForm.tsx, ../../MenuItemImage.tsx.
- Contract/types: app/api/menu-items/README.md, app/api/upload/menu-items/README.md, types/menu.ts.
- Tests: **tests**/components/EditMenuItemPage.test.tsx and **tests**/libs/menuItemEdit.test.ts.

## How To Present It

The edit screen protects both the admin's draft and customer purchases. Opening a form does not
freeze stock: units may sell while the admin is typing. Description edits preserve those sales.
An explicit restock is checked against current stock and reservations. Two tabs cannot silently
overwrite one another, and conflicts remain visible until the admin deliberately reloads.
