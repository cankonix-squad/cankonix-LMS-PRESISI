# TASK-009K — Admin Organization Operator UX Polish

**Status:** REVIEW

## Dependency

TASK-009J = REVIEW. Admin local Keycloak login callback is available.

## Objective

Memoles halaman Admin `/organisasi` agar nyaman dipakai operator awam dan tetap siap menangani data organisasi dalam jumlah besar tanpa mengubah API, authorization, atau permission model.

## Scope

- Table-first organization workspace with search, status filter, pagination, page size, empty and error states.
- Create/edit organization in a side drawer rather than inline page content.
- Clear operator actions and non-fake disabled detail placeholder when no detail route exists.
- Responsive table with compact mobile cards.
- Clear form validation hints and save/cancel actions.
- Preserve existing server actions and organization API contracts.

## Acceptance Criteria

[x] Desktop organization page is table-first and readable for large datasets.
[x] Search, status filter, pagination, page size, empty state, error state, and loading state are clear.
[x] Create/edit form uses a drawer with explicit save and cancel actions.
[x] Row actions distinguish Detail, Edit, and status action; unavailable detail does not fake navigation or mutation.
[x] Mobile/tablet presentation does not break and supports compact organization cards.
[x] Existing API and Permission + Scope behavior is unchanged.
[x] Checks green.

## Verification

- PASS: `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- PENDING: local browser review of `/organisasi` against a production API session.

## Implementation Notes — 2026-09-23

- Added a dedicated `/organisasi/loading.tsx` skeleton for navigation and API loading transitions.
- Preserved server-side search, status, pagination, and page-size query behavior.
- Improved operator hierarchy with a Foundation breadcrumb, clearer count copy, and filter labeling.
- Added a compact mobile organization card layout while retaining the desktop horizontal table.
- Added an explicit disabled `Detail` action with an explanation because no detail route is available; no fake navigation or mutation was introduced.
- Added native browser validation hints for organization code and name.
- Added explicit `Batal` action in the drawer and kept existing create/update/status server actions and API contracts unchanged.

Task is ready for human review. It must remain `REVIEW`, not `DONE`.

## Review Notes

Task must remain `REVIEW` after implementation. Runtime review requiring a live Admin session may be deferred if unavailable; no Docker installation is required.
