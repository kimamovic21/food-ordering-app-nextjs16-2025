# App Folder: app/(auth)/login

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the customer/admin/courier login screen. It lets guests sign in with credentials or Google, prevents already-authenticated users from seeing the form, and routes successful sign-ins back to the home page.

## Route And Audience

- App route/group: `/login`
- Folder path: `app/(auth)/login`
- Main audience/roles: `guest`
- Main interaction style: session/auth state, forms and client validation, toast feedback

## What Happens Here

- The `page.tsx` client component reads the NextAuth session with `useSession()`.
- While the session is loading, it renders `loading.tsx` so the user does not see the form flicker.
- If the user is already authenticated, it redirects to `/` and returns `null`.
- `LoginUserForm.tsx` validates email/password with Zod and react-hook-form.
- Credentials login calls `signIn("credentials", { redirect: false })` so the component can handle errors inline.
- Google login calls `signIn("google")` with `/` as callback URL.
- `InputPasswordEyeOnly.tsx` provides password visibility toggling without changing the form contract.

## Important Files

- `app/(auth)/login/InputPasswordEyeOnly.tsx`: functions/components: `InputPasswordEyeOnly`
- `app/(auth)/login/layout.tsx`: functions/components: `LoginLayout`
- `app/(auth)/login/loading.tsx`: functions/components: `LoginLoading`
- `app/(auth)/login/LoginUserForm.tsx`: functions/components: `LoginUserForm`, `onSubmit`, `handleGoogleSignIn`; API calls: `/api/account-status`; client component; form validation
- `app/(auth)/login/page.tsx`: functions/components: `LoginPage`; client component; session-aware

## API/Data Connections

- Calls `/api/account-status`; inspect the matching API README/source before changing its response shape.

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

- Invalid email format and short/long passwords are blocked before submit.
- `EMAIL_NOT_VERIFIED` shows a toast and redirects to `/verify-email?email=...`.
- `RATE_LIMITED` shows a clear rate-limit toast.
- If credentials fail, the form checks `/api/account-status` to tell OAuth users to use Google instead.
- Unverified credentials users are redirected to verification instead of receiving a generic invalid-password message.
- Loading state disables inputs/buttons to prevent duplicate submits.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the `guest` UI for `/login`; it coordinates the files above, protects the edge cases listed here, and delegates server-authoritative checks to the API routes/helpers instead of trusting only the browser.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
