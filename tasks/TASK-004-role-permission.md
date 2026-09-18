# TASK-004 — Role & Permission

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-003 = DONE-WITH-DEFERRED (disetujui user/reviewer, memenuhi development sequencing).

## Objective
Membangun RBAC dinamis berbasis data.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`Role`: id, unique code, name, description, `isSystem`, status, timestamps. `Permission`: id, unique code, name, description, timestamps. `RolePermission`: roleId+permissionId composite unique. Seed permission minimum per domain hanya yang sudah dibutuhkan; jangan seed semua masa depan secara spekulatif.

## API / Application Contract
CRUD role (dengan proteksi system role), list permissions, assign/remove permission ke role, read role permissions.

## Business Rules
Tidak boleh branching business logic berdasarkan string role. `isSystem` mencegah delete/perubahan berbahaya tetapi authorization tetap permission. Permission naming `<domain>.<resource>.<action>` konsisten.

## Acceptance Criteria
[ ] unique role/permission; [ ] role-permission idempotent; [ ] system role protected; [ ] tests authorization service; [ ] no hardcoded admin bypass; [ ] checks green.

---

## Implementasi

### Schema & Migration
- `apps/api/prisma/schema.prisma`: enum `RoleStatus`, model `Role`, `Permission`, `RolePermission`.
- `RolePermission` memakai composite primary key `@@id([roleId, permissionId])` sehingga grant duplikat tidak mungkin tersimpan.
- `RolePermission.role` memakai `onDelete: Cascade` (link boleh hilang bersama role), `RolePermission.permission` memakai `onDelete: Restrict` (permission katalog tidak boleh hilang selama masih dipakai).
- Migration: `apps/api/prisma/migrations/20260916000300_task_004_role_permission/migration.sql`, digenerate deterministik dengan `prisma migrate diff --from-schema-datamodel ... --script`.
- Tidak ada seed permission spekulatif: permission didaftarkan melalui `POST /api/v1/authorization/permissions` atau `POST /api/v1/authorization/permissions/seed` saat domain yang membutuhkannya sudah ada.

### Endpoint (`/api/v1`)
| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `/authorization/roles` | Buat role, opsional `permissionIds` |
| GET | `/authorization/roles` | List role (search, status, pagination) |
| GET | `/authorization/roles/:id` | Detail role + permission |
| POST | `/authorization/roles/:id` | Update role (code/name/description/status) |
| DELETE | `/authorization/roles/:id` | Hapus role (204) |
| GET | `/authorization/roles/:id/permissions` | Baca permission milik role |
| POST | `/authorization/roles/:roleId/permissions/:permissionId` | Grant (idempotent) |
| DELETE | `/authorization/roles/:roleId/permissions/:permissionId` | Revoke (idempotent) |
| GET | `/authorization/permissions` | List permission (search, pagination) |
| POST | `/authorization/permissions` | Daftarkan permission |
| POST | `/authorization/permissions/seed` | Upsert permission + grant ke role code |

### Business Rules yang Ditegakkan
- **System role protected**: role `isSystem` tidak dapat dihapus, tidak dapat dinonaktifkan, dan code-nya tidak dapat diubah. Nama/deskripsi masih boleh diubah.
- **`isSystem` tidak dapat di-set via API**: `CreateRoleDto`/`UpdateRoleDto` tidak punya field tersebut, sehingga tidak ada jalur membuat system role baru dari HTTP.
- **Wildcard permission**: permission dengan segmen `*` hanya dapat diberikan ke system role, sehingga "akses sangat luas" menjadi keputusan eksplisit yang dapat direview.
- **Idempotensi**: grant memakai `createMany({ skipDuplicates: true })`; revoke memakai `deleteMany`. Respons melaporkan `granted`/`already_granted`/`removed`/`already_removed`.
- **Seed tidak mengarang role**: role code yang belum ada dilaporkan pada `skippedRoleCodes`, bukan dibuat otomatis.
- **Tidak ada authorization berbasis nama role**: `AuthorizationService` sengaja tidak mengekspos `hasPermission`/`can`/`isAdmin`. Efektivitas permission + scope adalah tanggung jawab task role-assignment & scope berikutnya. Test menegaskan tidak adanya method tersebut.

### File
Dibuat:
- `apps/api/src/authorization/authorization.module.ts`
- `apps/api/src/authorization/authorization.controller.ts`
- `apps/api/src/authorization/authorization.service.ts`
- `apps/api/src/authorization/authorization.repository.ts`
- `apps/api/src/authorization/authorization.types.ts`
- `apps/api/src/authorization/permission-code.ts`
- `apps/api/src/authorization/dto/authorization-request.dto.ts`
- `apps/api/src/authorization/dto/authorization-response.dto.ts`
- `apps/api/src/authorization/dto/role-status.dto.ts`
- `apps/api/test/authorization.test.cjs`
- `apps/api/prisma/migrations/20260916000300_task_004_role_permission/migration.sql`

Diubah:
- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`

### Test (12 test baru, total 45 API)
- unique role/permission (code dinormalisasi, duplikat ditolak)
- validasi vocabulary permission `<domain>.<resource>.<action>` termasuk wildcard
- idempotensi grant/revoke (tidak ada baris duplikat)
- permission awal saat create role bersifat atomik (permission tidak dikenal → rollback)
- proteksi system role (delete/deactivate/ubah code ditolak, rename diizinkan)
- wildcard permission hanya untuk system role (grant yang ditolak tidak tersimpan)
- update role: uniqueness code, validasi code, resource tidak ditemukan
- list role & permission: search, filter status, pagination
- seed idempotent dan tidak mengarang role
- tidak ada authorization berbasis nama role
- endpoint authorization butuh caller terautentikasi (401 tanpa bearer)
- validasi payload + kontrak OpenAPI

### Verification (dijalankan dari root repo)
- `pnpm lint` → PASS
- `pnpm typecheck` → PASS
- `pnpm test` → PASS (45 API, 2 api-client)
- `pnpm build` → PASS
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS

### Verification DEFERRED
- Eksekusi migration di runtime PostgreSQL (`prisma migrate deploy`) — Docker/container runtime tidak tersedia di environment ini dan tidak diinstal otomatis. Ini inherited deferred dari TASK-000/001/002/003 dan bukan blocker teknis untuk TASK-004 maupun task berikutnya, namun wajib diselesaikan sebelum integration testing, UAT, atau production readiness.
- Runtime Keycloak terhadap realm nyata dan verifikasi audience mapper (inherited dari TASK-003).

### Catatan / Risiko
- Endpoint authorization saat ini dilindungi autentikasi (default-deny) tetapi belum dilindungi permission, karena evaluasi permission + scope adalah deliverable TASK-005 dan audit adalah TASK-006. Sampai saat itu, setiap caller terautentikasi dapat mengelola katalog RBAC.
- `AuthorizationModule` belum diimpor oleh modul lain; TASK-005 akan mengonsumsi `AuthorizationService` sebagai application service.

## Aturan Implementasi Wajib
- Baca `AGENTS.md`, `tasks/MASTER-CHECKLIST.md`, dan dokumen pada `docs/` yang relevan sebelum coding.
- Backend tetap **NestJS Modular Monolith**. Jangan membuat microservice.
- Alur backend: Controller → Application Service → Domain/Business Logic → Repository → Prisma → PostgreSQL. Controller tidak boleh mengakses Prisma langsung.
- Semua input API divalidasi; perubahan database memakai Prisma migration; business logic baru wajib memiliki test.
- Gunakan `/api/v1`; jangan hardcode role untuk authorization. Permission + scope tetap menjadi security boundary.
- Jangan mengerjakan task berikutnya secara oportunistik.
- Jika Docker/database runtime tidak tersedia, verification runtime boleh dicatat `DEFERRED` hanya bila bukan blocker teknis task. Jangan menginstal runtime container otomatis.
- Setelah implementasi dan verification yang tersedia berhasil, ubah status task menjadi `REVIEW`, update `MASTER-CHECKLIST`, lalu STOP. Codex tidak boleh menandai `DONE`.

## Laporan Akhir Codex
Laporkan file dibuat/diubah, migration/schema, endpoint, test, hasil lint/typecheck/test/build, verification yang DEFERRED, issue/risiko, dan konfirmasi bahwa task berikutnya tidak dikerjakan.
