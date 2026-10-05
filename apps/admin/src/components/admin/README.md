# Admin Frontend Component Conventions

Admin UI uses reusable enterprise components from `@/components/admin`.

## Page Pattern

Admin feature pages should start with:

- `AdminPage`
- `PageHeader`
- optional `PrimaryActionButton`

## Data Workspace Pattern

List-oriented pages should use:

- `FilterToolbar`, `FilterTabs`, and `StatusFilter` for search/status filters. Status options must match that domain API. GET filter forms reset the affected page to 1, preserve page size and related filters, and use a filter-derived React key to reflect URL navigation.
- `EnterpriseTable` for desktop/tablet tables.
- Mobile card content through the `mobile` prop.
- `StickyActionCell` for action columns that must remain reachable on narrow desktop.
- `PaginationBar` for paginated API lists.
- `EmptyState` and `ErrorState` for operator-friendly states.

## Mutation Pattern

Create/edit/account workflows should use:

- `DrawerHost` permanently mounted in the workspace, around its conditional drawer. Give each operation/record a stable `activeKey` (e.g. `create`, `edit:${id}`, `scope:${id}`). Include the parent id for a parent-specific create flow. Closing sets the active key to `null`; the host retains live form/component state separately for each key.
- `EnterpriseDrawer` for right-side operational panels. It handles Esc, focus, dialog semantics, pending controls, and cancelling React's automatic form reset. All forms in a hosted panel are disabled while any action is pending.
- `useDrawerActionState` for hosted form mutations instead of React's bare `useActionState`. An actual successful mutation clears only that panel, closes it, and places feedback on the list; ordinary API failures and transport exceptions retain it. Next.js navigation exceptions are rethrown. Outside a host, normal action results remain available without a drawer close. Use `{ closeOnSuccess: false }` for read-only refresh operations.
- Drafts stay in memory only for the mounted workspace: reload/navigation ends their lifetime. Do not add browser storage of form data or credentials. Organization retains its approved local controlled-draft implementation and also uses the shared keyboard/focus drawer.
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
