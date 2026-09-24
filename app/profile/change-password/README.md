# App Folder: app/profile/change-password

> Enhanced folder documentation. Keep this file aligned with the folder workflow when behavior changes.

## Purpose

This folder owns the signed-in user's password change screen. It explains the UI state, the client-side form validation, and the server-side checks that must pass before a new password is saved.

## Route And Audience

- App route/group: `/profile/change-password`
- Folder path: `app/profile/change-password`
- Main audience/roles: `signed-in user`
- Main interaction style: session/auth state, forms and client validation, toast feedback

## What Happens Here

- `page.tsx` checks the current NextAuth session with `useSession`.
- While the session is loading, the route shows `ChangePasswordLoading` so the screen does not flash unfinished UI.
- If the user is unauthenticated, the page redirects to `/login` and renders nothing while redirecting.
- If the signed-in account was created with Google OAuth, the page does not show the password form. It shows a clear message that password updates must be handled through Google.
- For regular credentials users, the page renders a breadcrumb back to `/profile`, a title, a short helper message, and `ChangePasswordForm`.
- `ChangePasswordForm.tsx` asks for the current password, a new password, and password confirmation.
- The form validates fields with `react-hook-form`, `zod`, and the shared `strongPasswordSchema` before it sends anything to the server.
- On submit, the form sends a `PUT` request to `/api/profile/change-password`.
- If the API succeeds, the app shows a green success toast, resets the form, and navigates back to `/profile`.
- If the API fails, the app shows the returned error message in a red toast and keeps the user on the same screen.

## Important Files

- `app/profile/change-password/ChangePasswordForm.tsx`: functions/components: `ChangePasswordForm`, `onSubmit`; API calls: `/api/profile/change-password`; client component; form validation
- `app/profile/change-password/loading.tsx`: functions/components: `ChangePasswordLoading`; client component
- `app/profile/change-password/page.tsx`: functions/components: `ChangePasswordPage`, `pageHeader`; client component; session-aware

## API/Data Connections

- Calls `/api/profile/change-password`; inspect the matching API README/source before changing its response shape.

## Packages And Services Used

- `next` / Next.js App Router: owns the route, layout, loading, and route-handler conventions for this area.
- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `next-auth`: checks whether the visitor is signed in and carries the user role/email used by protected screens and API routes.
- `zod`: validates request bodies and form data so malformed input is rejected before business logic runs.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.

## End-To-End Change Password Flow

1. The user opens `/profile/change-password`.
2. The page checks session state.
3. If there is no session, the user is sent to `/login`.
4. If the account uses Google OAuth, the app blocks the form because the app does not own that password.
5. If the account uses credentials login, the user can enter the current password and a new password.
6. The browser validates required fields, max lengths, password strength, and matching confirmation.
7. The frontend disables the submit button while saving and changes the button label to `Updating password...`.
8. The API reconnects to MongoDB, checks the authenticated email, applies rate limiting, validates the body again, finds the user, compares the current password with bcrypt, hashes the new password, and updates the user document.
9. The UI reports success or failure with toast feedback.

## Edge Cases And UX Rules

- A signed-out visitor should never see the form; they are redirected to `/login`.
- OAuth users should never see a fake password form because their password is managed by Google, not this app.
- The current password is required so a logged-in session alone is not enough to change credentials.
- The new password must pass the shared strong password rules from `libs/password`.
- The confirmation field must match the new password before the request is accepted.
- The submit button is disabled while saving to prevent duplicate password-change requests.
- The API also validates the request body, so bypassing browser validation does not work.
- The API rate-limits password change attempts to reduce brute-force attempts against the current password.
- The API returns `401` when there is no authenticated email, `400` for invalid input or wrong current password, and `404` if the user no longer exists.
- Passwords are never stored in plain text; the API hashes the new password with bcrypt before saving.
- Keep toast messages clear because this route handles sensitive account security behavior.

## How To Explain This In A Presentation

If someone asks what this folder does, say: this is the account-security screen where a signed-in credentials user can change their password. The frontend protects the experience with session checks, OAuth blocking, strong-password validation, disabled submit state, and toast feedback. The backend still makes the final decision by checking the session, rate limit, current password, user existence, and bcrypt hashing before updating MongoDB.

## Maintenance Notes For Future Work

- Read this README, then read the exact component/page before editing.
- If behavior changes, update this README and any API README that backs this screen.
- Preserve accessibility, loading, error, and disabled states when changing UI.
