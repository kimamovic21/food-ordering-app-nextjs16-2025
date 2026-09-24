# App Folder: app/forgot-password

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the guest-facing password reset request screen. It collects an email address, validates it on the client, asks the API to create a reset token, and shows clear toast feedback without revealing whether an account exists.

## Route And Audience

- App route/group: `/forgot-password`
- Folder path: `app/forgot-password`
- Main audience/roles: `guest`
- Main interaction style: forms and client validation, toast feedback

## What Happens Here

- `page.tsx` renders the forgot-password screen shell.
- `ForgotPasswordForm.tsx` owns the form, validates the email with Zod/react-hook-form, and posts to `/api/forgot-password`.
- The API handles the security-sensitive work: it rate-limits the request, checks whether the account can reset a password, stores a hashed reset token, and sends the real reset link through Resend.
- The UI shows success/error feedback with `sonner` and keeps the user on the same screen so they can correct the email or try again later.
- This screen intentionally avoids exposing whether a specific email exists, which protects account privacy.

## Important Files

- `app/forgot-password/ForgotPasswordForm.tsx`: functions/components: `ForgotPasswordForm`, `onSubmit`; API calls: `/api/forgot-password`; client component; form validation
- `app/forgot-password/page.tsx`: functions/components: `ForgotPasswordPage`

## API/Data Connections

- Calls `/api/forgot-password`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## Password Reset Request Flow

1. A guest opens `/forgot-password`.
2. The form validates that the email field is present and shaped like an email address.
3. The frontend sends `{ email }` to `/api/forgot-password`.
4. The backend applies Upstash-backed rate limiting for the IP/email combination.
5. If no account exists, the API still returns a generic success-style message so attackers cannot enumerate users.
6. If the account uses Google OAuth, the API tells the UI that password reset is not available and the user should use Google sign-in.
7. If the account uses credentials login, the API generates a raw token, stores only the hashed token in MongoDB, sets a one-hour expiry, renders `PasswordResetEmail`, and sends it through Resend.
8. The user clicks the emailed link and lands on `/reset-password/[token]`.

## Edge Cases And UX Rules

- Preserve route loading states so refreshes and slow network states look intentional.
- Preserve empty/error states so users are not left with blank screens.
- If forms exist, keep validation messages close to the field that failed.
- If this folder uses server data, keep cache invalidation/refetch behavior aligned with the owning API route.
- Do not show a different UI for "email exists" vs "email does not exist"; account enumeration protection matters here.
- Keep the API as the source of truth for OAuth-vs-credentials logic because the browser cannot safely decide that alone.
- If the Resend email template changes, update this README and `components/resend/README.md` too.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the first half of the password recovery workflow. The browser only collects and validates the email, while the API does the real security work: rate limiting, account lookup, OAuth blocking, token hashing, expiry storage, and Resend email delivery.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
