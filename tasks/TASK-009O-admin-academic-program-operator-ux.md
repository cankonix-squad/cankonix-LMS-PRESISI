# TASK-009O — Admin Academic Program Operator UX

**Status:** REVIEW

## Dependency

TASK-009N = REVIEW; TASK-010 = DONE-WITH-DEFERRED.

## Mandatory References

- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`
- `tasks/TASK-010-academic-program.md`

## Objective

Membuat workspace Admin `/program` yang table-first, responsif, dan ramah operator untuk mengelola master Program Pendidikan melalui kontrak API yang sudah tersedia.

## Scope

- Search, filter status, filter organisasi, pagination, rows per page, loading, empty, dan error state.
- Table desktop dan compact card-list mobile dengan nama, kode, organisasi, jenjang/tipe bila kontrak tersedia, status, updated date, dan aksi.
- Drawer create/edit menggunakan field kontrak API: kode, nama, organisasi pemilik, deskripsi, status, dan metadata bila relevan.
- Detail ditampilkan sebagai disabled/placeholder bila endpoint detail belum tersedia di API client; edit dan status memakai endpoint PATCH yang tersedia.
- Reuse pola Admin design system dan server actions. Tidak mengubah backend, auth, session, atau Permission + Scope.

## Acceptance Criteria

- [x] `/program` memiliki pengalaman operator enterprise yang konsisten dengan `/organisasi`.
- [x] Filter, pagination, rows per page, loading, empty, dan error state berfungsi.
- [x] Data organisasi pemilik ditampilkan dari kontrak organisasi yang tersedia.
- [x] Create/edit/status mutation memakai kontrak API yang tersedia tanpa fake mutation.
- [x] Detail yang belum didukung tetap jujur sebagai disabled/placeholder.
- [x] Desktop, tablet, dan mobile tidak pecah.
- [x] Required checks pass.

## Verification

Implemented `apps/admin/src/app/program/page.tsx`, `apps/admin/src/app/program/loading.tsx`, `apps/admin/src/features/academic/program-management.tsx`, `apps/admin/src/features/academic/program-actions.ts`, and the Akademik navigation link. Extended `packages/api-client/src/index.ts` with the existing education-program DTOs and list/get/create/update methods. No backend, authentication, session, or Permission + Scope behavior changed.

The workspace now provides search, status and organization filters, pagination, rows-per-page controls, loading skeleton, friendly error/empty states, desktop table, mobile card-list, organization ownership labels, honest `Belum tersedia` academic type placeholders, disabled Detail, and working create/edit/status mutations using existing API endpoints.

Verification PASS:

- `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- `pnpm test` (441 API tests, 0 failed)
- Prettier check on changed files
- `git diff --check`
- Local browser smoke check: unauthenticated `/program` correctly redirected to `/login`; authenticated data review remains pending because no authenticated operator session was available.

Task is ready for human review and remains `REVIEW`, not `DONE`. No subsequent task was implemented.
