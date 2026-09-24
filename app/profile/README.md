# App Folder: app/profile

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns customer profile editing, phone/address validation, saved delivery addresses, avatar updates, and password changes.

## Route And Audience

- App route/group: `/profile`
- Folder path: `app/profile`
- Main audience/roles: `signed-in user`
- Main interaction style: session/auth state, forms and client validation, TanStack Query or query cache, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/profile`, `/api/profile/change-password`, `/api/upload/users`. Keep API response shapes aligned.

## Main Profile Workflows

- Profile editing: `page.tsx` loads the signed-in user's current profile data, lets them update identity/contact/address fields, and saves changes through `/api/profile`.
- Avatar updates: `UserProfileImage.tsx` and `page.tsx` let the user select or remove an image, then upload through `/api/upload/users` before saving the final profile state.
- Delivery address editing: `UserProfileForm.tsx` keeps the user's address fields visible and editable so checkout can reuse saved delivery details.
- Account deletion: `page.tsx` includes the delete account flow and surfaces API errors with toast feedback instead of failing silently.
- Password changes: `change-password/` is a separate security workflow. It checks the session, blocks Google OAuth users from seeing a password form, validates strong passwords, confirms the current password through `/api/profile/change-password`, and only then updates the stored password hash.

## Service-Level Details

- Profile data lives in MongoDB through the `User` model; the browser should never be treated as the final authority for saved contact/address values.
- Avatar files live in Cloudinary. The user document stores the Cloudinary `secure_url`, while `/api/upload/users` handles the upload stream and best-effort cleanup of old images.
- Phone validation is shared with backend logic so local-looking phone numbers and international numbers can both be normalized safely.
- Password changes use `bcrypt` through `/api/profile/change-password`; the frontend never sees or stores password hashes.
- Toasts from `sonner` are part of the workflow because saves, upload failures, and account deletion must be obvious to the user.

## Important Files

- `app/profile/change-password/ChangePasswordForm.tsx`: functions/components: `ChangePasswordForm`, `onSubmit`; API calls: `/api/profile/change-password`; client component; form validation
- `app/profile/change-password/loading.tsx`: functions/components: `ChangePasswordLoading`; client component
- `app/profile/change-password/page.tsx`: functions/components: `ChangePasswordPage`, `pageHeader`; client component; session-aware
- `app/profile/layout.tsx`: functions/components: `ProfileLayout`
- `app/profile/loading.tsx`: functions/components: `ProfilePageLoading`; client component
- `app/profile/page.tsx`: functions/components: `readResponseErrorMessage`, `ProfilePage`, `handleImageSelect`, `handleRemoveImage`, `handleProfileSave`, `savePromise`, `handleDeleteAccount`, `deletePromise`; API calls: `/api/upload/users`, `/api/profile`; client component; session-aware
- `app/profile/UserProfileForm.tsx`: functions/components: `UserProfileForm`; client component
- `app/profile/UserProfileImage.tsx`: functions/components: `UserProfileImage`, `handleFileChange`; client component

## API/Data Connections

- Calls `/api/profile`; inspect the matching API README/source before changing its response shape.
- Calls `/api/profile/change-password`; inspect the matching API README/source before changing its response shape.
- Calls `/api/upload/users`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `@tanstack/react-query`: caches server data, refreshes stale screens, and invalidates affected lists after mutations.
- `cloudinary`: stores and serves uploaded user, restaurant, category, and menu-item images; upload APIs handle cleanup of replaced or deleted assets by public id.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Keep `/profile` and `/profile/change-password` documentation in sync when profile security behavior changes.
- Do not move password ownership to the browser; the API must always verify the current password and hash the replacement server-side.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the signed-in user's account center. It edits personal/contact/delivery data, uploads the avatar to Cloudinary, saves canonical profile values in MongoDB, and delegates password changes to a bcrypt-protected API route. The UI gives immediate validation and toast feedback, but every sensitive change still goes through server routes so another user cannot update someone else's profile from the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
