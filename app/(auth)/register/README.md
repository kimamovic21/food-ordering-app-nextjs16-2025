# App Folder: app/(auth)/register

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns account creation for guests. It validates name/email/password on the client, creates credentials users through `/api/register`, supports Google OAuth, and moves new users into email verification when required.

## Route And Audience

- App route/group: `/register`
- Folder path: `app/(auth)/register`
- Main audience/roles: `guest`
- Main interaction style: session/auth state, forms and client validation, toast feedback

## What Happens Here

- The `page.tsx` client component reads NextAuth session state and redirects authenticated users to `/`.
- The loading screen prevents a flash of the register form while session status is unknown.
- `RegisterUserForm.tsx` validates name, email, and password with Zod/react-hook-form.
- The password field uses the shadcn-studio strength component and the shared `strongPasswordSchema`.
- Submit calls `/api/register` with JSON body `{ name, email, password }`.
- If the API returns `verificationRequired`, the UI shows a success toast and routes to `/verify-email`.
- If local verification is skipped, the UI routes to `/login` after successful account creation.

## Important Files

- `app/(auth)/register/layout.tsx`: functions/components: `RegisterLayout`
- `app/(auth)/register/loading.tsx`: functions/components: `RegisterLoading`
- `app/(auth)/register/page.tsx`: functions/components: `RegisterPage`; client component; session-aware
- `app/(auth)/register/RegisterUserForm.tsx`: functions/components: `RegisterUserForm`, `onSubmit`, `handleGoogleSignIn`; API calls: `/api/register`; client component; form validation

## API/Data Connections

- Calls `/api/register`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Edge Cases And UX Rules

- Authenticated users cannot stay on the register screen.
- Weak passwords fail client-side before the API call.
- Duplicate email and API validation failures surface as registration failure toasts.
- The register button is disabled during submit to reduce duplicate accounts.
- Google OAuth remains available for users who do not want credentials auth.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `guest` UI for `/register`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
