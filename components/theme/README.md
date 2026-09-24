# Component Folder: theme

> Enhanced component-folder documentation. Keep this file aligned with reusable component responsibilities.

## Purpose

Theme provider/toggle components that control light/dark appearance and app-level theme behavior.

## What To Know Before Editing

- Components here are shared, so small visual/prop changes can affect many routes.
- Prefer preserving existing prop names and accessibility behavior unless a task explicitly changes the contract.
- If a component is used in checkout, auth, messaging, order, or admin flows, run focused tests for the affected workflow.

## Components And Responsibilities

- `components/theme/ModeToggle.tsx`: exports `ModeToggle`; client-side behavior; key imports `@/components/ui/dropdown-menu`
- `components/theme/ThemeProvider.tsx`: exports `ThemeProvider`; client-side behavior

## Edge Cases And UX Rules

- Keep keyboard/focus behavior for buttons, dialogs, inputs, selects, tables, and command/search UI.
- Keep loading, disabled, aria, and empty states because these components are reused across the app.
- Keep styling consistent with the existing dark UI and shadcn/Tailwind conventions.

## Packages And Services Used

- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
