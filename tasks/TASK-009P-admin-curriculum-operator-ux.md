# TASK-009P — Admin Curriculum Operator UX

**Status:** REVIEW

## Dependency

TASK-009O = REVIEW; TASK-011 = DONE-WITH-DEFERRED.

## Mandatory References

- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`
- `tasks/TASK-011-curriculum-subject.md`

## Objective

Membuat workspace Admin `/kurikulum` yang table-first, responsif, dan jujur terhadap kontrak API curriculum yang tersedia.

## Scope

- Search tidak tersedia pada endpoint curriculum, sehingga filter program/status, pagination, dan rows per page digunakan tanpa memalsukan search.
- Table desktop dan card-list mobile dengan kode/nama, program terkait, versi/periode, status, updated date, dan aksi.
- Drawer create/edit dengan kode/nama melalui `version`/`name`, program, periode efektif, dan status.
- Detail disabled bila endpoint detail belum digunakan UI; edit dan status memakai PATCH API yang tersedia.
- Loading, empty, error, dan responsive state; tidak mengubah backend, auth, session, atau Permission + Scope.

## Acceptance Criteria

- [x] `/kurikulum` table-first dan konsisten dengan Admin `/program`.
- [x] Filter program/status, pagination, rows-per-page, loading, empty, dan error state berfungsi.
- [x] Create/edit/status memakai kontrak API curriculum yang tersedia tanpa fake mutation.
- [x] Detail yang belum didukung tetap disabled/placeholder.
- [x] Desktop, tablet, dan mobile tidak pecah.
- [x] Required checks pass.

## Verification

Implemented `apps/admin/src/app/kurikulum/page.tsx`, `apps/admin/src/app/kurikulum/loading.tsx`, `apps/admin/src/features/academic/curriculum-management.tsx`, `apps/admin/src/features/academic/curriculum-actions.ts`, navigation, and typed curriculum methods in `packages/api-client/src/index.ts`.

The workspace provides program/status filters, pagination, rows-per-page controls, loading skeleton, friendly error/empty states, desktop table, mobile card-list, program labels, honest disabled Detail action, and create/edit/status mutations through the existing `/curricula` API. Search is intentionally not presented because the current API query contract does not support search. Subject mapping is intentionally deferred to its own operator task rather than shown as a fake mutation.

Verification PASS:

- `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- `pnpm --filter @lms/api-client test` (9 tests, 0 failed)
- Prettier on changed files
- `git diff --check`

Runtime browser review remains deferred because no authenticated operator session was available. Task is ready for human review and remains `REVIEW`, not `DONE`. No subsequent task was implemented.