# App Folder: app/verify-email

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the `/verify-email` UI area. It may include pages, loading states, nested route components, and client-side workflow helpers.

## Route And Audience

- App route/group: `/verify-email`
- Folder path: `app/verify-email`
- Main audience/roles: `guest`
- Main interaction style: forms and client validation, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/resend-verification`, `/api/verify-email`. Keep API response shapes aligned.

## Important Files

- `app/verify-email/page.tsx`: functions/components: `VerifyEmailPage`
- `app/verify-email/ResendVerificationForm.tsx`: functions/components: `ResendVerificationForm`, `onSubmit`; API calls: `/api/resend-verification`; client component; form validation
- `app/verify-email/VerifyEmailClient.tsx`: functions/components: `VerifyEmailClient`, `verifyEmail`; API calls: `/api/verify-email`; client component

## API/Data Connections

- Calls `/api/resend-verification`; inspect the matching API README/source before changing its response shape.
- Calls `/api/verify-email`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `guest` UI for `/verify-email`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
