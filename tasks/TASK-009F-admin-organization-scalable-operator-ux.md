# TASK-009F — Admin Organization Scalable Operator UX

**Status:** REVIEW

## Dependency

TASK-009E = REVIEW. Organization management table and API-client update are available.

## Objective

Meningkatkan halaman `/organisasi` agar nyaman untuk operator awam dan tetap rapi saat data organisasi bertambah banyak: table full-width, pagination, search/filter yang jelas, create/edit lewat drawer, parent organization picker, dan konfirmasi status action.

## Mandatory References

`docs/02-domain-architecture.md`, `docs/05-api-standards.md`, `docs/07-security-standards.md`

## Data Model / Persistence

Tidak menambah persistence baru. Gunakan endpoint organisasi yang sudah tersedia.

## API / Application Contract

Admin frontend tetap memakai `packages/api-client` untuk:

- `GET /api/v1/organizations`
- `POST /api/v1/organizations`
- `PATCH /api/v1/organizations/:id`

Tidak membuat hard delete karena backend tidak menyediakan `DELETE /organizations/:id`. Aksi destructive tetap nonaktifkan (`PATCH status=INACTIVE`).

## Scope

- Table organisasi full-width dengan pagination server-side.
- Search dan filter status yang ramah operator.
- Tombol utama `Tambah Organisasi`.
- Create organization lewat drawer/panel, bukan form permanen di kanan.
- Edit organization lewat drawer/panel, bukan inline row expansion.
- Parent organization picker memakai select data organisasi, bukan input UUID manual.
- Konfirmasi sebelum organisasi dinonaktifkan.
- Copy UI menghindari istilah teknis seperti API, backend, foundation, UUID.

## Acceptance Criteria

[x] `/organisasi` table tetap rapi untuk data banyak dengan pagination.
[x] Search/filter menggunakan bahasa operator.
[x] Create organisasi dibuka dari tombol utama.
[x] Edit organisasi dibuka dari row action yang jelas.
[x] Parent organisasi dipilih dari daftar, bukan diketik sebagai UUID.
[x] Nonaktifkan organisasi meminta konfirmasi.
[x] Tidak ada tombol hard delete palsu.
[x] checks green.

## Verification

- `apps/admin`: `eslint . --max-warnings=0`
- `apps/admin`: `next typegen`
- `apps/admin`: `tsc --noEmit`
- `apps/admin`: `next build --webpack`
- Targeted Prettier check for edited files.
