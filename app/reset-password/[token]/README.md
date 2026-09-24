# App Folder: app/reset-password/[token]

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the concrete reset-password screen that receives a token from the email URL and lets the guest choose a new credentials password.

## Route And Audience

- App route/group: `/reset-password/[token]`
- Folder path: `app/reset-password/[token]`
- Main audience/roles: `guest`
- Main interaction style: forms and client validation, toast feedback

## What Happens Here

- `page.tsx` receives the dynamic `token` segment from the route and renders the reset form.
- `ResetPasswordForm.tsx` holds the client-side form state and submits the route token with `newPassword` and `confirmNewPassword`.
- The user never has to paste the token manually; the email link provides it through the URL.
- The frontend validates password strength and confirmation matching before the API call.
- The backend still repeats the validation and checks the token hash/expiry in MongoDB before changing anything.
- After success, the API clears the reset token fields so the same link cannot be reused.

## Important Files

- `app/reset-password/[token]/page.tsx`: functions/components: `ResetPasswordPage`
- `app/reset-password/[token]/ResetPasswordForm.tsx`: functions/components: `ResetPasswordForm`, `onSubmit`; API calls: `/api/reset-password`; client component; form validation

## API/Data Connections

- Calls `/api/reset-password`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Token Handling Notes

- The token in the URL is the raw token that was emailed to the user.
- MongoDB stores only a SHA-256 hash of the token, not the raw token.
- `/api/reset-password` hashes the submitted token and searches for a matching, unexpired record.
- A successful reset removes `passwordResetTokenHash` and `passwordResetTokenExpiresAt`, turning the email link into a one-use link.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Invalid, missing, expired, or already-used tokens must show a clear API-driven error.
- Strong-password errors should stay close to the password field so the user knows what to fix.
- Keep button disabled/loading state during submit so users cannot spam multiple reset attempts.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this route is opened from the reset email. It extracts the token from the URL, lets the user enter a strong new password, and sends both to the API. The API proves the token is valid and unexpired before saving a bcrypt-hashed password.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
