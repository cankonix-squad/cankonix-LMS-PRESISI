# TASK-009AC — Admin Learning Pages Pattern Standardization

Status: REVIEW

## Goal

Bring the Learning Admin pages — `/materi`, `/aktivitas`, and `/tugas` — in line with the enterprise Admin UI pattern already established across `/organisasi`, `/personel`, `/roles`, `/assignments`, `/program`, and `/kurikulum`.

## Scope

- Refactor `apps/admin/src/features/learning/material-workspace.tsx` to use reusable Admin components from `@/components/admin` instead of hand-rolled header/table/drawer/pagination markup.
- Refactor `apps/admin/src/features/learning/activity-workspace.tsx` the same way.
- Refactor `apps/admin/src/features/learning/assignment-workspace.tsx` the same way.
- Clean up `apps/admin/src/app/materi/page.tsx` to remove now-unused `activityTypes` and `meetings` fetches (no longer passed to the workspace).
- Keep all existing API contracts, server actions, session behavior, auth, permission, and scope model unchanged.
- Preserve create/edit/status behavior, route query behavior, and form field semantics.

## Out of Scope

- Backend/API changes.
- New domain behavior (e.g. submission list, grading features).
- Keycloak/login theme work.
- Reporting/executive features.
- Educator/student/executive portals.
- TASK-064/TASK-065.

## Implementation Notes

### `/materi` (material-workspace.tsx)
- Uses: `AdminPage`, `PageHeader`, `PrimaryActionButton`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `StickyActionCell`, `EnterpriseDrawer`, `FormField`, `FormActions`, `ActionButton`, `ActionMessage`, `StatusBadge`, `PaginationBar`, `enterpriseInputClass`.
- Custom `MaterialTable`/`MaterialRowView`/custom `Pagination` consolidated onto reusable components.
- Desktop table + mobile card rendering separated inside `EnterpriseTable`'s `mobile` prop.
- Custom `MaterialDrawer` replaced with `EnterpriseDrawer`.
- Unused `activityTypes` and `meetings` props removed from workspace + page; `material-workspace.tsx` no longer imports `LearningActivityType` or `LearningMeeting`.
- Unused `ActionGroup` removed from imports.
- Status filter uses `FilterTabs` with Indonesian labels: "Draft", "Tayang", "Diganti", "Arsip".
- Indonesian labels normalized: "Cari", "Reset", "Batal", "Simpan", "Edit", "Ubah data", "Tambah data".

### `/aktivitas` (activity-workspace.tsx)
- Uses: `AdminPage`, `PageHeader`, `PrimaryActionButton`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `StickyActionCell`, `EnterpriseDrawer`, `FormField`, `FormActions`, `ActionButton`, `ActionMessage`, `StatusBadge`, `PaginationBar`, `enterpriseInputClass`.
- Custom `ActivityTable`/custom `Pagination`/custom `ActivityDrawer` consolidated.
- Status filter uses `FilterTabs` with Indonesian labels: "Draft", "Tayang", "Ditutup", "Arsip".
- Removed unused `classSubjectId` from `Filters` type.

### `/tugas` (assignment-workspace.tsx)
- Uses: `AdminPage`, `PageHeader`, `PrimaryActionButton`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `StickyActionCell`, `EnterpriseDrawer`, `FormField`, `FormActions`, `ActionButton`, `ActionMessage`, `StatusBadge`, `PaginationBar`, `enterpriseInputClass`.
- Custom `AssignmentTable`/custom `Pagination`/custom `AssignmentDrawer` consolidated.
- Status filter uses `FilterTabs` with Indonesian labels: "Draft", "Tayang", "Ditutup", "Arsip".
- Removed unused `classSubjectId` from `Filters` type.

### Status badge tones
- Consistent across all three pages: `PUBLISHED` → green, `CLOSED` → amber, `ARCHIVED` → slate, `DRAFT` → blue, `SUPERSEDED` → amber.

### Pagination
- All three pages use `PaginationBar` with server-computed `hrefFor` pattern matching `/program` and `/kurikulum`.
- Helper functions `materialHref`, `activityHref`, `assignmentHref` generate URLSearchParams-based query strings.

## Audit Findings

### Pages already using pattern (no changes needed)
- `/roles` (RolePermissionWorkspace)
- `/assignments` (AssignmentScopeWorkspace)
- `/mata-pelajaran`, `/angkatan`, `/kelas`, `/enrollment` (AcademicWorkspace, TASK-009AA)
- `/program`, `/kurikulum` (ProgramWorkspace, CurriculumWorkspace, TASK-009AB)

### Server actions (no changes needed)
- `material-actions.ts` — preserves create/update/status semantics unchanged.
- `activity-actions.ts` — preserves create/update/status semantics unchanged.
- `assignment-actions.ts` — preserves create/update/status semantics unchanged.

## Verification

- `cd apps/admin && ../../node_modules/.bin/eslint src/features/learning src/app/materi src/app/aktivitas src/app/tugas` — PASS
- `cd apps/admin && ./node_modules/.bin/tsc --noEmit` — PASS
- `cd apps/admin && ./node_modules/.bin/next build --webpack` — PASS
- `git diff --check` (repo root) — PASS

## Notes

- Backend, auth, session, and Permission + Scope model were not changed.
- Other developers' changes in other task files were preserved.
- No new dependencies were added.