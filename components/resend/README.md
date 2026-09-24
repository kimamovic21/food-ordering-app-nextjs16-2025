# Component Folder: resend

> Enhanced component-folder documentation. Keep this file aligned with reusable component responsibilities.

## Purpose

Email template components used by Resend/React Email flows such as verification emails, password reset emails, and purchase receipts. These files define the HTML email body; the actual sending happens in server helpers such as `libs/authEmails.tsx` and webhook email helpers.

## How Email Sending Works In This Project

- React Email components in this folder produce JSX email templates.
- `@react-email/render` converts those templates into HTML strings.
- `resend` sends the rendered HTML through the configured `RESEND_API_KEY` and `SENDER_EMAIL`.
- Auth emails use `NEXT_PUBLIC_APP_URL` or `NEXTAUTH_URL` to build absolute links back into the app.
- Purchase receipt emails are triggered after Stripe webhook confirmation, not from the checkout button itself.
- Verification and password reset emails include action links; receipt emails include order, restaurant, item, tax, delivery fee, coupon, and total details.

## What To Know Before Editing

- Components here are shared, so small visual/prop changes can affect many routes.
- Prefer preserving existing prop names and accessibility behavior unless a task explicitly changes the contract.
- If a component is used in checkout, auth, messaging, order, or admin flows, run focused tests for the affected workflow.

## Components And Responsibilities

- `components/resend/PasswordResetEmail.tsx`: exports `PasswordResetEmail`; receives `name`, `email`, and `resetUrl`; shows a reset button, fallback URL, and Google sign-in note.
- `components/resend/PurchaseReceiptEmail.tsx`: exports `PurchaseReceiptEmail`, `formatMoney`, `lineTotal`; imports `formatAppDate` and receipt types; renders order id, purchase date, restaurant details, line items, tax, delivery fee, coupon discount, special instructions, and final total.
- `components/resend/VerifyEmailEmail.tsx`: exports `VerifyEmailEmail`; receives `name`, `email`, and `verificationUrl`; shows a verification button and fallback URL.

## Edge Cases And UX Rules

- Keep keyboard/focus behavior for buttons, dialogs, inputs, selects, tables, and command/search UI.
- Keep loading, disabled, aria, and empty states because these components are reused across the app.
- Keep styling consistent with the existing dark UI and shadcn/Tailwind conventions.
- Keep email templates simple and inline-style friendly because email clients do not support the same CSS as browsers.
- Always include the raw URL as text under the button so users can copy it if the button fails.
- Do not include secrets or internal-only diagnostics in customer emails.
- If a URL-building rule changes, update `libs/authEmails.tsx`, the affected API README, and this README together.

## Packages And Services Used

- `resend`: sends transactional emails such as verification links, password reset links, and purchase receipts.
- `@react-email/components` and `@react-email/render`: define the email templates that Resend sends.
- `currency.js` and money helpers: keep prices, discounts, delivery fees, and totals rounded consistently.

## How To Explain This In A Presentation

If someone asks what this folder does, say: these are the email views of the application. The app uses React Email components to build HTML, Resend to deliver the message, and API/webhook logic to decide when an email is allowed to be sent. Password reset and verification emails carry one-time links, while purchase receipts are sent only after Stripe confirms payment.
