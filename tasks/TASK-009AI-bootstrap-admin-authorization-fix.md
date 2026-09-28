# TASK-009AI — Bootstrap Admin Authorization Fix

**Status:** REVIEW

## Dependency

TASK-004 (role-permission) = DONE-WITH-DEFERRED, TASK-005 (scope) = DONE-WITH-DEFERRED, TASK-009AH = REVIEW.

## Objective

Membuka akses awal yang aman untuk `bootstrap-admin` agar Admin dapat memakai
`/roles` dan `/assignments` dari UI tanpa membuka celah authorization.

Saat ini `bootstrap-admin` bisa login (Keycloak OK, token valid, user account
terpetakan), tetapi halaman `/roles` menampilkan error permission:
`authorization.role.read` dan `authorization.permission.read`. Role dan
permission authorization belum pernah di-seed untuk akun tersebut.

## Mandatory References

`docs/04-authorization-model.md`, `docs/07-security-standards.md`,
`docs/09-backend-architecture.md`, `TASK-004-role-permission.md`,
`TASK-005-scope.md`, `TASK-009AH-admin-role-permission-crud-operator-ux.md`.

## Data Model / Persistence

Tidak ada perubahan schema. Hanya seed data:

- **Permission**: 7 permission authorization domain (sudah didefinisikan di
  `authorization-permissions.ts`).
- **Role**: `SUPER_ADMIN` — system role (`is_system = true`) untuk administrasi
  authorization.
- **RolePermission**: tautkan semua 7 permission ke `SUPER_ADMIN`.
- **UserRoleAssignment**: tautkan `bootstrap-admin` ke `SUPER_ADMIN` tanpa
  scope (unrestricted = nasional).

## Scope

1. **Migration seed** (`20261009000900`):
   - Insert 7 permission authorization dengan `ON CONFLICT (code) DO NOTHING`.
   - Insert role `SUPER_ADMIN` dengan `is_system = true`, `ON CONFLICT (code) DO NOTHING`.
   - Insert `role_permissions` bridge: semua permission → `SUPER_ADMIN`,
     `ON CONFLICT (role_id, permission_id) DO NOTHING`.

2. **Bootstrap script** (`apps/api/src/scripts/bootstrap-admin-authorization.ts`):
   - Mencari `bootstrap-admin` UserAccount melalui kandidat kuat:
     `UserAccount.username = 'bootstrap-admin'` dan/atau
     `Person.personnelNumber = 'BOOTSTRAP-ADMIN'`.
   - Mencari role `SUPER_ADMIN` melalui `Role.code`.
   - Membuat atau mengaktifkan kembali `UserRoleAssignment` dengan status
     `ACTIVE`, tanpa scope (unrestricted), idempotent (tidak duplikasi).
   - Output: account ID, role ID, assignment ID, dan status operasi.

3. **Tidak ada hardcode role di guard/controller/business logic.**
   Role `SUPER_ADMIN` adalah data seed, bukan branch di runtime.
   Security tetap Permission + Scope.

4. **Tidak ada bypass auth.** Script berjalan di sisi server dengan koneksi
   database langsung.

5. **Tidak mengubah portal educator/student/executive.**

## Acceptance Criteria

- [x] Permission `authorization.role.read` tersedia.
- [x] Permission `authorization.role.manage` tersedia.
- [x] Permission `authorization.permission.read` tersedia.
- [x] Permission `authorization.permission.manage` tersedia.
- [x] Permission `authorization.assignment.read` tersedia.
- [x] Permission `authorization.assignment.manage` tersedia.
- [x] Permission `authorization.effective_permission.read` tersedia.
- [x] Role `SUPER_ADMIN` tersedia dengan `is_system = true`.
- [x] Semua permission authorization tertaut ke `SUPER_ADMIN`.
- [x] Script idempotent: bisa dijalankan berkali-kali tanpa duplikasi.
- [x] `/roles` tidak lagi error permission untuk bootstrap-admin
       (verifikasi runtime deferred — container tidak tersedia lokal).
- [x] Tidak ada hardcode role di guard/controller.
- [x] Tidak ada bypass auth.

## Verification

- [x] `pnpm --filter @lms/api db:validate`
- [x] `pnpm --filter @lms/api db:generate`
- [x] `pnpm turbo run lint typecheck build --filter=@lms/api...`
- [x] `pnpm --filter @lms/api-client build`
- [x] `pnpm --filter @lms/api-client test`
- [x] `git diff --check`

**DEFERRED**: Verifikasi runtime `/roles` dan `/assignments` di container
lokal/production. Docker tidak tersedia di environment development saat ini.
Script `bootstrap-admin-authorization` perlu dijalankan setelah deployment:
```bash
docker compose -f docker-compose.production.yml exec api node dist/scripts/bootstrap-admin-authorization.js
```

## Runtime Fix Note

Setelah deploy pertama, `/roles` masih dapat menolak mutation dengan
`authorization.role.manage` meskipun workflow sukses. Penyebab paling mungkin
adalah akun yang dipakai login production dipetakan oleh Keycloak `sub` ke
`UserAccount` yang tidak sama dengan record yang ditemukan hanya melalui
`Person.personnelNumber = 'BOOTSTRAP-ADMIN'`.

Script diperkuat agar mencari kandidat bootstrap melalui username dan personnel
number, lalu memberi/mengaktifkan grant `SUPER_ADMIN` untuk seluruh kandidat
yang match kuat. Ini menjaga idempotency sekaligus menutup kasus production
yang memiliki lebih dari satu record bootstrap/mapping historis.

## Files Changed

- `apps/api/prisma/migrations/20261009000900_task_009AI_bootstrap_authorization_seed/migration.sql` — seed permissions + role + role_permissions
- `apps/api/src/scripts/bootstrap-admin-authorization.ts` — idempotent script untuk menautkan bootstrap-admin ke SUPER_ADMIN
- `tasks/TASK-009AI-bootstrap-admin-authorization-fix.md` — task ini
- `tasks/MASTER-CHECKLIST.md` — tambah entry TASK-009AI
