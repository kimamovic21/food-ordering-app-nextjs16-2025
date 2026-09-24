# Component Folder: shadcn-studio

> Enhanced component-folder documentation. Keep this file aligned with reusable component responsibilities.

## Purpose

Imported/custom shadcn-studio visual components used where the base shadcn primitives need richer behavior.

## What To Know Before Editing

- Components here are shared, so small visual/prop changes can affect many routes.
- Prefer preserving existing prop names and accessibility behavior unless a task explicitly changes the contract.
- If a component is used in checkout, auth, messaging, order, or admin flows, run focused tests for the affected workflow.

## Components And Responsibilities

- `components/shadcn-studio/blocks/hero-section-41/hero-section-41-skeleton.tsx`: exports `HeroSectionSkeleton`; key imports `@/components/ui/skeleton`
- `components/shadcn-studio/blocks/hero-section-41/hero-section-41.tsx`: exports `HeroSection`; key imports `@/components/ui/button`, `@/components/ui/carousel`
- `components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18.tsx`: exports `CarouselNavButtons`, `TestimonialsComponent`; client-side behavior; key imports `@/components/ui/avatar`, `@/components/ui/badge`, `@/components/ui/carousel`
- `components/shadcn-studio/input/input-12.tsx`: exports `InputErrorDemo`; key imports `@/components/ui/input`, `@/components/ui/label`
- `components/shadcn-studio/input/input-46.tsx`: exports `InputPasswordStrengthDemo`, `toggleVisibility`, `getColor`, `getText`; client-side behavior; key imports `@/components/ui/button`, `@/components/ui/input`, `@/libs/password`, `@/libs/utils`

## Edge Cases And UX Rules

- Keep keyboard/focus behavior for buttons, dialogs, inputs, selects, tables, and command/search UI.
- Keep loading, disabled, aria, and empty states because these components are reused across the app.
- Keep styling consistent with the existing dark UI and shadcn/Tailwind conventions.

## Packages And Services Used

- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
