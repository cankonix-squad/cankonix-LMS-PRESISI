# TASK-009AB — Admin Program & Curriculum Pattern Standardization

Status: REVIEW

## Goal

Finish the enterprise pattern rollout for the remaining standalone academic Admin workspaces — `/program` and `/kurikulum` — so they match the consistent operator pattern of `/organisasi` and `/personel` (and the already-standardized `/roles`, `/assignments`, and the shared academic workspace).

## Scope

- Refactor `apps/admin/src/features/academic/program-management.tsx` to use the reusable Admin components from `@/components/admin` instead of hand-rolled header/table/drawer/pagination markup.
- Refactor `apps/admin/src/features/academic/curriculum-management.tsx` the same way.
- Keep all existing API contracts, server actions, session behavior, auth, permission, and scope model unchanged.
- Preserve create/edit/status behavior, route query behavior, and form field semantics (release notes preserved as honest disabled actions/helper text where a contract is unavailable).

## Out of Scope

- Backend/API changes.
- New domain behavior.
- Keycloak/login theme work.
- Reporting/executive features.
- Educator/student/executive portals.

## Implementation Notes

- `/program` now uses: `AdminPage`, `PageHeader`, `PrimaryActionButton`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `StickyActionCell`, `EnterpriseDrawer`, `FormField`, `FormActions`, `ActionButton`, `ActionGroup`, `ActionMessage`, `StatusBadge`, `PaginationBar`, and `enterpriseInputClass`.
- `/kurikulum` now uses the same set.
- Custom `ProgramTable`/`ProgramCard`/`ProgramActions`/`ProgramDrawer`/`ProgramPagination` and `Curriculum…` equivalents were consolidated onto the reusable components; desktop table + mobile card rendering is still separated inside `EnterpriseTable`'s `mobile` prop.
- Status badge tones remain consistent with the rest of Admin (`ACTIVE` → green, `INACTIVE` → red, extension-ready via `StatusBadge` tones).
- Indonesian labels normalized: "Jenjang/tipe" (was "Jenjang / tipe"), "Edit"/"Buat"/"Simpan" action labels stay unambiguous for operators.

## Audit Findings (pages already consistent, no change needed)

- `/roles` (`RolePermissionWorkspace`) already uses `AdminPage`, `PageHeader`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `StickyActionCell`, `EnterpriseDrawer`, `PaginationBar`, and `ActionButton`/`ActionGroup`.
- `/assignments` (`AssignmentWorkspace`) already uses the full reusable set with drawers for create/detail/scope/status.
- The shared `AcademicWorkspace` (`/mata-pelajaran`, `/angkatan`, `/kelas`, `/enrollment`) was already standardized under TASK-009AA.

## Verification

- `cd apps/admin && ../../node_modules/.bin/eslint src` — PASS
- `cd apps/admin && ./node_modules/.bin/tsc --noEmit` — PASS
- `cd apps/admin && ./node_modules/.bin/next build --webpack` — PASS (20 routes compiled, including `/program` and `/kurikulum`)
- `git diff --check` (repo root) — PASS

## Notes

- Reporting/TASK-064/executive work was not touched; other developers' changes were preserved.
- Backend, auth, session, and Permission + Scope model were not changed.