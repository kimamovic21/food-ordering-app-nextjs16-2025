# App Folder: app/(auth)

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the `/` UI area. It may include pages, loading states, nested route components, and client-side workflow helpers.

## Route And Audience

- App route/group: `/`
- Folder path: `app/(auth)`
- Main audience/roles: `guest`
- Main interaction style: session/auth state, forms and client validation, toast feedback

## What Happens Here

- Start from `page.tsx` for the route shell and data loading shape.
- Check colocated components for user interactions, forms, and mutations.
- Check loading/error/empty states before changing UI because these are part of the user experience.
- This folder talks to `/api/account-status`, `/api/register`. Keep API response shapes aligned.

## Important Files

- `app/(auth)/login/InputPasswordEyeOnly.tsx`: functions/components: `InputPasswordEyeOnly`
- `app/(auth)/login/layout.tsx`: functions/components: `LoginLayout`
- `app/(auth)/login/loading.tsx`: functions/components: `LoginLoading`
- `app/(auth)/login/LoginUserForm.tsx`: functions/components: `LoginUserForm`, `onSubmit`, `handleGoogleSignIn`; API calls: `/api/account-status`; client component; form validation
- `app/(auth)/login/page.tsx`: functions/components: `LoginPage`; client component; session-aware
- `app/(auth)/register/layout.tsx`: functions/components: `RegisterLayout`
- `app/(auth)/register/loading.tsx`: functions/components: `RegisterLoading`
- `app/(auth)/register/page.tsx`: functions/components: `RegisterPage`; client component; session-aware
- `app/(auth)/register/RegisterUserForm.tsx`: functions/components: `RegisterUserForm`, `onSubmit`, `handleGoogleSignIn`; API calls: `/api/register`; client component; form validation

## API/Data Connections

- Calls `/api/account-status`; inspect the matching API README/source before changing its response shape.
- Calls `/api/register`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `guest` UI for `/`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
