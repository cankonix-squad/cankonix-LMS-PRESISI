# Admin Frontend Component Conventions

Admin UI uses reusable enterprise components from `@/components/admin`.

## Page Pattern

Admin feature pages should start with:

- `AdminPage`
- `PageHeader`
- optional `PrimaryActionButton`

## Data Workspace Pattern

List-oriented pages should use:

- `FilterToolbar` and `FilterTabs` for search/status filters.
- `EnterpriseTable` for desktop/tablet tables.
- Mobile card content through the `mobile` prop.
- `StickyActionCell` for action columns that must remain reachable on narrow desktop.
- `PaginationBar` for paginated API lists.
- `EmptyState` and `ErrorState` for operator-friendly states.

## Mutation Pattern

Create/edit/account workflows should use:

- `EnterpriseDrawer` for right-side operational panels.
- `FormField` and `enterpriseInputClass` for form inputs.
- `FormActions` for save/cancel controls.
- `ActionMessage` for server-action feedback.

## Action Pattern

Row actions should use:

- `ActionGroup`
- `ActionButton`
- `actionButtonClass` only when a button is wrapped by a `<form>`.

Disabled actions must be honest: use a `title` explaining why the action is unavailable. Do not fake navigation or mutations when the API contract does not exist.

## Boundary Rules

- Frontend pages consume `packages/api-client` contracts only.
- Do not bypass Permission + Scope with UI-only assumptions.
- Do not add raw tables, drawers, or repeated form styling in feature files unless a task explicitly documents why the reusable component is not sufficient.
- Keep app-specific components inside `apps/admin`; generic package extraction is a separate architecture decision.
