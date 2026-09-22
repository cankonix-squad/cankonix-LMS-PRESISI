# TASK-009E — Admin Organization Management Table UX

**Status:** REVIEW

## Dependency
TASK-009D = REVIEW. Admin enterprise design system and foundation shell are available.

## Objective
Meningkatkan halaman `/organisasi` agar mengikuti pola enterprise master-data management: table list utama, search, filter, create panel, edit inline, dan status action.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/05-api-standards.md`, `docs/07-security-standards.md`

## Data Model / Persistence
Tidak menambah persistence baru. Gunakan endpoint organisasi yang sudah tersedia.

## API / Application Contract
Admin frontend tetap memakai `packages/api-client` untuk:
- `GET /api/v1/organizations`
- `POST /api/v1/organizations`
- `PATCH /api/v1/organizations/:id`

Tidak membuat hard delete karena backend tidak menyediakan `DELETE /organizations/:id`. Aksi destructive di UI adalah nonaktifkan (`PATCH status=INACTIVE`) agar aman untuk master data.

## Scope
- Search organisasi.
- Filter status organisasi.
- Table list organisasi sebagai konten utama.
- Create organization panel.
- Inline edit organisasi.
- Status action: aktifkan/nonaktifkan.
- API dan permission model tetap dipertahankan.

## Acceptance Criteria
[x] `/organisasi` memiliki toolbar search/filter.
[x] `/organisasi` menampilkan table list organisasi enterprise.
[x] Admin dapat create organisasi dari panel.
[x] Admin dapat edit organisasi dari row action.
[x] Admin dapat aktifkan/nonaktifkan organisasi dari row action.
[x] Tidak ada tombol hard delete palsu.
[x] checks green.

## Verification
- `apps/admin`: `eslint . --max-warnings=0`
- `apps/admin`: `next typegen`
- `apps/admin`: `tsc --noEmit`
- `apps/admin`: `next build --webpack`
- `packages/api-client`: `eslint src test --max-warnings=0`
- `packages/api-client`: `tsc -p tsconfig.json`
- `packages/api-client`: `node --test test/client.test.cjs`
- Targeted Prettier check for edited files.
