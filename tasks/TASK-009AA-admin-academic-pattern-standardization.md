# TASK-009AA — Admin Academic Pattern Standardization

Status: REVIEW

## Goal

Bring the shared academic Admin workspace in line with the reusable Admin frontend component foundation so `/mata-pelajaran`, `/angkatan`, `/kelas`, and `/enrollment` follow the same operator pattern as the newer enterprise pages.

## Scope

- Refactor the shared academic workspace to use reusable Admin components.
- Keep existing API contracts, session behavior, auth, permissions, and scope model unchanged.
- Preserve create/edit behavior and route query behavior.
- Improve mobile cards so they do not render table cells outside tables.

## Out of Scope

- Backend/API changes.
- New domain behavior.
- Keycloak/login theme work.
- Reporting/executive features.

## Implementation Notes

- `apps/admin/src/features/academic/academic-workspace.tsx` now uses `AdminPage`, `PageHeader`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `EnterpriseDrawer`, `FormField`, `FormActions`, `PaginationBar`, `ActionButton`, and standard input tokens from `@/components/admin`.
- The refactor affects `/mata-pelajaran`, `/angkatan`, `/kelas`, and `/enrollment` because they share this workspace.
- Desktop table and mobile card rendering are separated; mobile status badges no longer reuse table-cell markup.

## Verification

- `../../node_modules/.bin/eslint src/features/academic/academic-workspace.tsx` — PASS
- `./node_modules/.bin/tsc --noEmit` — PASS
- `./node_modules/.bin/next build --webpack` — PASS

## Notes

TASK-065 and reporting work were not continued from this task.
