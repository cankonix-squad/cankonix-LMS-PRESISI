# TASK-005 — Role Assignment & Scope

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-004 = DONE-WITH-DEFERRED (disetujui reviewer).

## Objective
Menghubungkan user-role dengan scope hierarkis yang dapat membatasi akses.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`UserRoleAssignment`: id, userAccountId, roleId, validFrom, validUntil nullable, status. `RoleAssignmentScope`: id, assignmentId, `scopeType` (ORGANIZATION/PROGRAM/BATCH/CLASS/CLASS_SUBJECT), `scopeId` UUID; unique assignment+type+id. Hindari polymorphic FK palsu; validasi existence di domain service sesuai type.

## API / Application Contract
Assign/revoke role, add/remove scopes, read effective assignments/scopes. Sediakan authorization service interface untuk `hasPermission` + scope evaluation.

## Business Rules
Satu assignment dapat banyak scope. Organization scope mencakup descendants melalui Organization service. Expired/revoked assignment tidak efektif. National access direpresentasikan explicit scope/semantics terdokumentasi, bukan role-name bypass.

## Acceptance Criteria
[x] effective permission resolver tested; [x] descendant org scope tested; [x] expired assignment denied; [x] multiple scopes supported; [x] no role-name authorization; [x] checks green.

---

## Implementasi

### Schema & Migration
- `apps/api/prisma/schema.prisma`:
  - enum `UserRoleAssignmentStatus` (`ACTIVE`, `INACTIVE`, `REVOKED`)
  - enum `ScopeType` (`ORGANIZATION`, `PROGRAM`, `BATCH`, `CLASS`, `CLASS_SUBJECT`)
  - model `UserRoleAssignment`: relasi ke `UserAccount` dan `Role`, timestamps, status, `validFrom`, `validUntil`
  - model `RoleAssignmentScope`: relasi cascade ke `UserRoleAssignment`, `scopeType`, `scopeId` UUID, dengan constraint `@@unique([assignmentId, scopeType, scopeId])`
- Migration: `apps/api/prisma/migrations/20260916000400_task_005_role_assignment_scope/migration.sql`

### Endpoint (`/api/v1`)
| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `/authorization/assignments` | Assign role ke user account (opsional list scope awal) |
| GET | `/authorization/assignments` | List assignment (filter userAccountId, roleId, status, pagination) |
| GET | `/authorization/assignments/:id` | Detail assignment + role + scopes |
| PATCH | `/authorization/assignments/:id/status` | Update status assignment (ACTIVE / INACTIVE / REVOKED) |
| DELETE | `/authorization/assignments/:id` | Hapus assignment (204) |
| POST | `/authorization/assignments/:id/scopes` | Tambah scope ke assignment |
| DELETE | `/authorization/assignments/:id/scopes/:scopeId` | Cabut scope dari assignment |
| GET | `/authorization/users/:userAccountId/effective-permissions` | Hitung permission efektif aktif (unrestricted vs scoped) |
| GET | `/authorization/users/:userAccountId/has-permission/:permissionCode` | Evaluasi izin caller pada scope tertentu (mendukung wildcard & descendant org) |

### Guard & Decorators
- `@RequirePermissions(...permissions: string[])`: mendeklarasikan izin yang wajib dimiliki caller.
- `@RequireScope({ scopeType, idSource, allowUnrestricted })`: mendeklarasikan konteks scope untuk eksekusi endpoint.
- `@RequireSelfOrPermission({ subjectParam, permission })`: self-service memakai identity token; membaca authorization account lain memerlukan permission administratif.
- `@AllowAuthenticated()`: allowlist eksplisit untuk route tanpa boundary Permission + Scope (mis. `GET /api/v1/me` dan foundation CRUD TASK-001/002).
- `PermissionGuard`: guard global (`APP_GUARD`) yang mengevaluasi caller terautentikasi terhadap permission dan scope hierarkis (descendant organization via `OrganizationsService.getDescendantIds()`), tanpa pernah melakukan branching berbasis nama role. Route tanpa metadata otorisasi ditolak `403` (fail closed).

### File Dibuat / Diubah
Dibuat:
- `apps/api/src/authorization/role-assignment.types.ts`
- `apps/api/src/authorization/role-assignments.repository.ts`
- `apps/api/src/authorization/role-assignments.service.ts`
- `apps/api/src/authorization/role-assignments.controller.ts`
- `apps/api/src/authorization/permission.guard.ts`
- `apps/api/src/authorization/authorization.decorators.ts`
- `apps/api/src/authorization/dto/scope-type.dto.ts`
- `apps/api/src/authorization/dto/role-assignment-request.dto.ts`
- `apps/api/src/authorization/dto/role-assignment-response.dto.ts`
- `apps/api/test/role-assignment-scope.test.cjs`
- `apps/api/prisma/migrations/20260916000400_task_005_role_assignment_scope/migration.sql`

Diubah:
- `apps/api/prisma/schema.prisma`
- `apps/api/src/authorization/authorization.module.ts`
- `apps/api/src/auth/auth.types.ts`
- `apps/api/src/user-accounts/user-accounts.repository.ts`
- `apps/api/src/user-accounts/user-accounts.service.ts`

### Test (10 test pada `role-assignment-scope.test.cjs` + `authorization-enforcement.test.cjs`, total 61 API tests)
- CRUD role assignment, status lifecycle, multiple scopes, dan filtered listing
- Validasi waktu `validUntil > validFrom` dan penolakan assignment untuk role nonaktif
- Effective permission resolver (unrestricted national access vs scoped permissions)
- Descendant organization scope hierarchy (akses pada organisasi induk mewarisi akses ke organisasi anak/turunan)
- Penolakan akses untuk assignment yang expired atau revoked
- Default deny & 401 unauthenticated pada endpoint assignment, serta verifikasi schema OpenAPI
- 403 untuk caller terautentikasi tanpa permission pada endpoint authorization (fail closed)
- Self-service vs cross-user denial pada endpoint evaluasi permission
- Penolakan scope type yang belum dapat divalidasi dan organization scope non-existing

### Verification (dijalankan dari root repo)
- `pnpm lint` → PASS
- `pnpm typecheck` → PASS
- `pnpm test` → PASS (61 API, 2 api-client)
- `pnpm build` → PASS
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS

### Verification DEFERRED
- Eksekusi migration di runtime PostgreSQL (`prisma migrate deploy`) — Docker runtime tidak tersedia di environment ini (inherited deferred). Wajib dijalankan saat infra runtime PostgreSQL tersedia sebelum integration testing, UAT, atau production readiness.
- Runtime Keycloak verification (inherited).

### Konfirmasi
TASK-006 (Audit) dan task berikutnya TIDAK dikerjakan. Setelah code review 2026-09-16 task berada di status `FIX REQUIRED`; fase perbaikan dan verifikasi ulang sudah diselesaikan dan status dikembalikan ke `REVIEW` (lihat “Laporan Perbaikan Temuan Review”).


## Code Review Decision — 2026-09-16

**Status:** FIX REQUIRED

Review foundation TASK-001 sampai TASK-005 menemukan blocking issue pada integrasi authorization/scope TASK-005. Verifikasi lokal tetap PASS, tetapi implementasi belum memenuhi prinsip Permission + Scope sebagai security boundary backend.

### Temuan Blocking

1. **CRITICAL — PermissionGuard tidak aktif sebagai global guard dan endpoint authorization tidak memakai permission decorator.**
   - File: `apps/api/src/authorization/authorization.module.ts`, `apps/api/src/authorization/authorization.controller.ts`, `apps/api/src/authorization/role-assignments.controller.ts`, `apps/api/src/authorization/permission.guard.ts`.
   - Dampak: endpoint RBAC dan role assignment hanya membutuhkan autentikasi, sehingga setiap user terautentikasi berpotensi mengelola role, permission, assignment, dan scope.
   - Acceptance criteria: endpoint sensitif wajib dilindungi permission/scope guard yang benar-benar dieksekusi; route tanpa policy eksplisit harus fail closed atau memakai mekanisme public/allowlist yang eksplisit; test harus membuktikan user terautentikasi tanpa permission ditolak 403.

2. **HIGH — Endpoint evaluasi permission menerima `userAccountId` arbitrary tanpa otorisasi caller terhadap subject.**
   - File: `apps/api/src/authorization/role-assignments.controller.ts`.
   - Dampak: caller terautentikasi dapat membaca effective permissions atau mengevaluasi permission milik account lain hanya dengan mengganti path parameter.
   - Acceptance criteria: endpoint yang mengevaluasi permission subject lain harus memeriksa permission administratif yang sesuai; endpoint self-service harus memakai identity dari token/current user, bukan `userAccountId` bebas dari path; test harus mencakup cross-user denial.

3. **HIGH — Scope type selain ORGANIZATION diterima tanpa validasi existence.**
   - File: `apps/api/src/authorization/role-assignments.service.ts`.
   - Dampak: assignment bisa dibuat untuk PROGRAM/BATCH/CLASS/CLASS_SUBJECT dengan UUID yang belum pernah terbukti valid, sehingga data authorization dapat berisi scope yatim dan keputusan akses berikutnya tidak dapat dipercaya.
   - Acceptance criteria: sampai domain terkait tersedia, scope type yang belum dapat divalidasi harus ditolak atau wajib divalidasi melalui service/repository domain terkait ketika tersedia; test harus membuktikan scope non-existing ditolak.

### Verification saat review

- PASS: `pnpm lint`
- PASS: `pnpm typecheck`
- PASS: `pnpm test`
- PASS: `pnpm build`
- PASS: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lemdiklat_lms?schema=public" pnpm --filter @lms/api db:validate`
- PASS: `pnpm --filter @lms/api db:generate`

### Batas Review

Reviewer tidak memperbaiki source code dan tidak memulai TASK-006. Docker tidak diinstal dan runtime verification PostgreSQL/Keycloak tetap deferred sesuai governance.

---

## Laporan Perbaikan Temuan Review — 2026-09-16

**Status:** REVIEW (fase perbaikan selesai; menunggu review ulang)

### Temuan 1 (CRITICAL) — PermissionGuard tidak aktif & endpoint tanpa permission decorator

Diperbaiki:

- `PermissionGuard` sekarang diregistrasi sebagai `APP_GUARD` global di `AuthorizationModule.register()` (`apps/api/src/authorization/authorization.module.ts`), setelah `JwtAuthGuard` di `AuthModule`, sehingga setiap controller dievaluasi Permission + Scope secara default.
- Guard bersifat **fail closed**: route tanpa metadata otorisasi (`@RequirePermissions`, `@RequireScope`, `@RequireSelfOrPermission`, `@AllowAuthenticated`, `@Public`) ditolak `403 ForbiddenException`, sehingga penambahan controller baru tidak pernah otomatis terbuka. `@RequirePermissions()` kosong juga bukan grant implisit.
- Endpoint sensitif diberi policy eksplisit:
  - `AuthorizationController` — `authorization.role.read` / `authorization.role.manage` / `authorization.permission.read` / `authorization.permission.manage`.
  - `RoleAssignmentsController` — `authorization.assignment.read` / `authorization.assignment.manage`.
- Katalog permission domain authorization ditambahkan di `apps/api/src/authorization/authorization-permissions.ts` (shape `<domain>.<resource>.<action>`, tanpa branching role code).
- Allowlist eksplisit dan auditabel ditambahkan untuk route yang **tidak** memiliki boundary Permission + Scope:
  - `@AllowAuthenticated()` pada `GET /api/v1/me` (identitas sendiri; tidak mengembalikan role/permission).
  - `@AllowAuthenticated()` pada `OrganizationsController`, `PersonsController`, `UserAccountsController` (foundation TASK-001/002). Keputusan ini tidak menaikkan privilege dibanding baseline yang sudah direview (authentication-only) dan wajib diganti `@RequirePermissions(...)` oleh task yang memiliki domain tersebut sebelum production readiness — dicatat sebagai risiko bagian “Issue/Risiko”.
- Test baru `apps/api/test/authorization-enforcement.test.cjs` membuktikan: caller terautentikasi tanpa permission → `403`; caller dengan permission lolos boundary; route tanpa policy → `403` (dan evaluator tidak dipanggil); caller anonim → `401`.

### Temuan 2 (HIGH) — Endpoint evaluasi permission menerima `userAccountId` arbitrary

Diperbaiki:

- Dekorator baru `@RequireSelfOrPermission({ subjectParam, permission })` diterapkan pada `GET /authorization/users/:userAccountId/effective-permissions` dan `GET /authorization/users/:userAccountId/has-permission/:permissionCode`.
- Self-service memakai **identity dari token**: bila `userAccountId` path sama dengan `principal.accountId`, akses diberikan tanpa permission tambahan. Bila berbeda, akses memerlukan `authorization.effective_permission.read`. Nilai path tidak lagi dipercaya begitu saja.
- Test membuktikan self-read lolos, cross-user denial `403`, dan cross-user read diizinkan hanya ketika caller memegang permission administratif.

### Temuan 3 (HIGH) — Scope type selain ORGANIZATION diterima tanpa validasi existence

Diperbaiki:

- `RoleAssignmentsService.validateScopesExist` sekarang bersifat exhaustif: `ORGANIZATION` divalidasi lewat `OrganizationsService.findOne`, sedangkan `PROGRAM`, `BATCH`, `CLASS`, `CLASS_SUBJECT` **ditolak** (`400 BadRequestException`) sampai modul domain pemiliknya tersedia untuk memvalidasi existence. Tidak ada lagi scope yatim yang tersimpan.
- Test membuktikan penolakan keempat scope type tersebut, penolakan organization yang tidak ada, dan penerimaan organization yang valid.

### Seam komposisi untuk test (tanpa melemahkan guard)

`createApp({ permissionEvaluator })` / `AppModule.register` / `AuthorizationModule.register` menerima `PermissionEvaluator` opsional (`PERMISSION_EVALUATOR` token). Default produksi tetap `RoleAssignmentsService` (`useExisting`). Seam ini hanya dapat **menjawab** pertanyaan permission; ia tidak dapat membuat guard melewati pemeriksaan.

### File Dibuat / Diubah

Dibuat:

- `apps/api/src/authorization/authorization-permissions.ts`
- `apps/api/src/authorization/permission-evaluator.ts`
- `apps/api/test/authorization-enforcement.test.cjs`

Diubah:

- `apps/api/src/authorization/permission.guard.ts` (fail closed, `@Public`/`@AllowAuthenticated`/`@RequireSelfOrPermission`, evaluator)
- `apps/api/src/authorization/authorization.decorators.ts` (`AllowAuthenticated`, `RequireSelfOrPermission`)
- `apps/api/src/authorization/authorization.module.ts` (dynamic module + `APP_GUARD` global)
- `apps/api/src/authorization/authorization.controller.ts`, `apps/api/src/authorization/role-assignments.controller.ts` (policy per route)
- `apps/api/src/authorization/role-assignments.service.ts` (validasi scope type)
- `apps/api/src/app.module.ts`, `apps/api/src/app.ts` (wiring + seam evaluator)
- `apps/api/src/auth/auth.controller.ts`, `apps/api/src/organizations/organizations.controller.ts`, `apps/api/src/persons/persons.controller.ts`, `apps/api/src/user-accounts/user-accounts.controller.ts` (allowlist eksplisit)
- `apps/api/test/role-assignment-scope.test.cjs`, `apps/api/test/authorization.test.cjs` (evaluator deterministik + assertion 403/401)

### Verification (dijalankan dari root repo)

- PASS: `pnpm lint` (11 tasks, termasuk `prettier --check .`)
- PASS: `pnpm typecheck` (14 tasks)
- PASS: `pnpm test` (61 API tests + 2 api-client tests, 0 fail)
- PASS: `pnpm build` (11 tasks)
- PASS: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lemdiklat_lms?schema=public" pnpm --filter @lms/api db:validate`
- PASS: `pnpm --filter @lms/api db:generate`

### Verification DEFERRED

- Eksekusi migration PostgreSQL secara runtime (`prisma migrate deploy`) dan verifikasi Keycloak (realm/audience mapper) — Docker/container tidak tersedia di environment ini, tetap inherited dari TASK-001..TASK-004.

### Issue / Risiko

1. Permission `authorization.*` belum memiliki seeded role, sehingga sampai role/assignment dibuat lewat endpoint RBAC, pemanggilan endpoint authorization yang sebenarnya akan mengembalikan `403`. Ini konsekuensi langsung dari boundary Permission + Scope yang benar (fail closed), bukan regresi; bootstrap role pertama perlu keputusan reviewer/task berikutnya.
2. `OrganizationsController`, `PersonsController`, dan `UserAccountsController` masih memakai allowlist `@AllowAuthenticated()` (setara baseline authentication-only TASK-001/002). Ini state tambahan yang paling sempit yang bisa dibuat sekarang tanpa mengarang permission spekulatif (dilarang TASK-004), namun harus diganti `@RequirePermissions(...)` oleh task yang memiliki domain tersebut sebelum production readiness.
3. Migration TASK-005 belum dieksekusi di database runtime (DEFERRED).

### Konfirmasi

TASK-006 dan task berikutnya **TIDAK** dikerjakan. Codex tidak menandai task ini `DONE`; status diubah ke `REVIEW` untuk review ulang oleh reviewer manusia.

## Approval — 2026-09-16

User/reviewer approved TASK-005 after review ulang PASS.

Status final: `DONE-WITH-DEFERRED`. Runtime PostgreSQL migration and Keycloak runtime verification remain deferred and must be completed before integration testing, UAT, or production readiness. Carried-forward non-blocking risks remain documented in the TASK-005 repair report.

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
