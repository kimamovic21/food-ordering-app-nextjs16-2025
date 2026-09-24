# Codebase Documentation Guide

This repository contains local markdown maps that explain how the project is organized and how each major route folder works. These files are meant to help future development sessions understand the code faster before changing behavior.

## Where The Docs Live

- `app/api/README.md`: index of all API route groups.
- `app/api/**/README.md`: one generated documentation file next to each `route.ts`.
- `app/**/README.md`: generated folder maps for top-level and nested App Router UI folders, including route groups such as login/register, admin detail pages, courier pages, restaurant detail pages, and settings subroutes.
- `components/*/README.md`: component-folder maps for `resend`, `shadcn-studio`, `shared`, `theme`, and `ui`.
- `ROOT_CONFIGURATION_GUIDE.md`: root-level configuration file guide for Next.js, tests, Sentry, Vercel, linting, formatting, and env templates.

## How Future AI Work Should Use These Docs

Before changing a feature:

1. Read the nearest folder `README.md`.
2. Read the exact source files involved in the task.
3. For API changes, read the adjacent API route `README.md` and the source `route.ts`.
4. For config changes, read `ROOT_CONFIGURATION_GUIDE.md`.
5. After changing behavior, update the relevant README/docs so the documentation stays useful.

## Important Rule

The markdown files are navigation aids, not the source of truth. The source code, models, shared types, tests, and route handlers remain authoritative.

## When To Update Docs

Update docs when you change:

- API request/response shape
- auth, role, ownership, or super-admin rules
- checkout, Stripe, cart validation, courier, order, QStash, or audit-log behavior
- app route data fetching or loading/error states
- reusable component props or design-system behavior
- root configuration, scripts, env variables, Sentry/Vercel/test setup
- external integrations, package usage, or service ownership such as Cloudinary uploads, Resend emails, Stripe payments, QStash jobs, Upstash rate limits, Sentry monitoring, OpenAI generation, Leaflet maps, TanStack Query/Table, or React Email templates

## Generated Docs Caveat

Many folder maps are generated from static code analysis. They intentionally list detected imports, HTTP methods, guard branches, status codes, API calls, likely audience/roles, package/service notes, workflow notes, and presentation-friendly explanations. If the generator misses nuance, add a short manual note directly to the relevant README.

## What Good Folder Docs Should Explain

For each important route or component folder, aim to answer these questions in plain English:

- Who uses this screen or API: guest, customer, courier, restaurant admin, or super admin?
- Which package or external service is involved: Resend, Cloudinary, Stripe, QStash, Upstash Redis, Sentry, Vercel, OpenAI, Leaflet, TanStack, React Email, or local-only helpers?
- What does the browser do, and what does the server verify again?
- What is saved in MongoDB, what is stored in an external service, and what is only temporary UI state?
- Which edge cases are intentionally protected: expired token, wrong role, missing image, unavailable restaurant, duplicate checkout, rate limit, invalid phone, old Cloudinary asset, or stale background job?
- How would you explain this folder to someone who has never seen the code?
