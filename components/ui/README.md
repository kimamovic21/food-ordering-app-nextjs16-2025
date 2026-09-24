# Component Folder: ui

> Enhanced component-folder documentation. Keep this file aligned with reusable component responsibilities.

## Purpose

shadcn/ui primitives and low-level building blocks used by feature components.

## What To Know Before Editing

- Components here are shared, so small visual/prop changes can affect many routes.
- Prefer preserving existing prop names and accessibility behavior unless a task explicitly changes the contract.
- If a component is used in checkout, auth, messaging, order, or admin flows, run focused tests for the affected workflow.

## Components And Responsibilities

- `components/ui/alert-dialog.tsx`: exports `AlertDialog`, `AlertDialogTrigger`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`; client-side behavior; key imports `@/components/ui/button`, `@/libs/utils`
- `components/ui/avatar.tsx`: exports `Avatar`, `AvatarImage`, `AvatarFallback`; client-side behavior; key imports `@/libs/utils`
- `components/ui/badge.tsx`: exports `Badge`; key imports `@/libs/utils`
- `components/ui/breadcrumb.tsx`: exports `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`; key imports `@/libs/utils`
- `components/ui/button.tsx`: exports `Button`; key imports `@/libs/utils`
- `components/ui/card.tsx`: exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`; key imports `@/libs/utils`
- `components/ui/carousel.tsx`: exports `useCarousel`, `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`; client-side behavior; key imports `@/components/ui/button`, `@/libs/utils`
- `components/ui/chart.tsx`: exports `useChart`, `ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`, `getPayloadConfigFromPayload`, `ChartStyle`; client-side behavior; key imports `@/libs/utils`
- `components/ui/checkbox.tsx`: client-side behavior; key imports `@/libs/utils`
- `components/ui/collapsible.tsx`: exports `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`; client-side behavior
- `components/ui/dialog.tsx`: exports `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`; client-side behavior; key imports `@/components/ui/button`, `@/libs/utils`
- `components/ui/dropdown-menu.tsx`: exports `DropdownMenu`, `DropdownMenuPortal`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`; client-side behavior; key imports `@/libs/utils`
- `components/ui/form.tsx`: exports `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField`; client-side behavior; form/validation support; key imports `@/components/ui/label`, `@/libs/utils`
- `components/ui/input.tsx`: exports `Input`; key imports `@/libs/utils`
- `components/ui/label.tsx`: exports `Label`; client-side behavior; key imports `@/libs/utils`
- `components/ui/navigation-menu.tsx`: exports `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuViewport`, `NavigationMenuLink`, `NavigationMenuIndicator`; key imports `@/libs/utils`
- `components/ui/pagination.tsx`: exports `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`; key imports `@/components/ui/button`, `@/libs/utils`
- `components/ui/select.tsx`: exports `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`; client-side behavior; key imports `@/libs/utils`
- `components/ui/separator.tsx`: exports `Separator`; client-side behavior; key imports `@/libs/utils`
- `components/ui/skeleton.tsx`: exports `Skeleton`; key imports `@/libs/utils`
- `components/ui/sonner.tsx`: exports `Toaster`; client-side behavior
- `components/ui/table.tsx`: exports `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`; client-side behavior; key imports `@/libs/utils`
- `components/ui/textarea.tsx`: exports `Textarea`; key imports `@/libs/utils`
- `components/ui/tooltip.tsx`: exports `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`; client-side behavior; key imports `@/libs/utils`

## Edge Cases And UX Rules

- Keep keyboard/focus behavior for buttons, dialogs, inputs, selects, tables, and command/search UI.
- Keep loading, disabled, aria, and empty states because these components are reused across the app.
- Keep styling consistent with the existing dark UI and shadcn/Tailwind conventions.

## Packages And Services Used

- `react` and `react-dom`: provide client component state, effects, event handlers, and rendering for interactive UI.
- `react-hook-form` with `@hookform/resolvers`: manages form state, field errors, and Zod-backed validation.
- `recharts`: renders dashboard charts and statistics visualizations.
- `sonner`: shows success/error/loading toast feedback for user-facing mutations.
- `lucide-react`: provides the icon set used in buttons, status indicators, and dashboard actions.
- `radix-ui` and local `components/ui`: provide accessible primitives and shadcn-style form/table/dialog controls.
