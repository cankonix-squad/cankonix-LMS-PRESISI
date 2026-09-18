# TASK-006 — Audit Foundation

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-005 = DONE-WITH-DEFERRED (approved by reviewer; satisfies development sequencing).

## Objective
Menyediakan immutable audit trail untuk mutation sensitif.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AuditLog`: id, actorUserAccountId nullable, action, resourceType, resourceId nullable, organizationId nullable, before JSON nullable, after JSON nullable, metadata JSON nullable, ipAddress/userAgent nullable, createdAt. Index actor/resource/action/date.

## API / Application Contract
Internal AuditService untuk record event; read/search audit endpoint harus permission-protected. Tidak ada generic endpoint untuk edit/delete audit.

## Business Rules
Audit append-only. Sensitive mutation: role/scope, identity lifecycle, organization hierarchy dan domain kritis berikutnya wajib memanggil audit service. Redact secret/token/password.

## Acceptance Criteria
[x] append-only API design; [x] audit on representative sensitive mutation; [x] redaction test; [x] searchable by actor/resource/date; [x] checks green.

---

## Implementasi

### Schema & Migration

- `apps/api/prisma/schema.prisma`: model `AuditLog` dengan `actorUserAccountId`, `action`, `resourceType`, `resourceId`, `organizationId`, `before`, `after`, `metadata`, `ipAddress`, `userAgent`, dan `createdAt`.
- Migration: `apps/api/prisma/migrations/20260916000500_task_006_audit/migration.sql`.
- Append-only enforcement: migration memasang trigger `audit_logs_append_only` yang menolak `UPDATE` dan `DELETE` pada `audit_logs`.
- Index tersedia untuk actor/date, resource/date, action/date, organization/date, dan createdAt.

### API / Service

- `AuditModule` mengekspor `AuditService` untuk dipakai domain service.
- `AuditContextInterceptor` global menyimpan actor, IP, dan user agent ke `AuditContextService`.
- `AuditService.record(...)` adalah append-only internal API; tidak ada endpoint client untuk membuat/mengubah/menghapus audit log.
- Endpoint read-only `/api/v1/audit-logs` dan `/api/v1/audit-logs/:id` dilindungi permission `audit.log.read`.
- Query audit mendukung filter actor, action, resource type/id, organization, date range, search term, pagination.

### Sensitive Mutation Coverage

Audit service sudah dipanggil pada mutation sensitif foundation:

- Organization create/update.
- Person create/update/deactivate dan placement assign/end.
- User account create/update.
- Role/permission catalogue mutation.
- Role assignment create/status/delete dan scope add/remove.

### Redaction

- `redactAuditValue` menutup field rahasia seperti password, token, authorization, client secret, API key, credential, private key, salt.
- Redaction dijalankan saat write dan saat read sebagai pertahanan tambahan terhadap payload lama/manual.
- Snapshot besar dibatasi agar audit log tidak menjadi data store besar.

### File Dibuat / Diubah

Dibuat:

- `apps/api/src/audit/audit-actions.ts`
- `apps/api/src/audit/audit-context.interceptor.ts`
- `apps/api/src/audit/audit-context.service.ts`
- `apps/api/src/audit/audit-permissions.ts`
- `apps/api/src/audit/audit-redaction.ts`
- `apps/api/src/audit/audit.controller.ts`
- `apps/api/src/audit/audit.module.ts`
- `apps/api/src/audit/audit.repository.ts`
- `apps/api/src/audit/audit.service.ts`
- `apps/api/src/audit/audit.types.ts`
- `apps/api/src/audit/dto/audit-log-response.dto.ts`
- `apps/api/src/audit/dto/list-audit-logs-query.dto.ts`
- `apps/api/test/audit.test.cjs`
- `apps/api/prisma/migrations/20260916000500_task_006_audit/migration.sql`

Diubah:

- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/authorization/authorization.module.ts`
- `apps/api/src/authorization/authorization.service.ts`
- `apps/api/src/authorization/role-assignments.service.ts`
- `apps/api/src/organizations/organizations.module.ts`
- `apps/api/src/organizations/organizations.service.ts`
- `apps/api/src/persons/persons.module.ts`
- `apps/api/src/persons/persons.service.ts`
- `apps/api/src/user-accounts/user-accounts.module.ts`
- `apps/api/src/user-accounts/user-accounts.service.ts`
- test stubs terkait agar mutation service menerima fake audit service.

### Test

- `apps/api/test/audit.test.cjs`: redaction recursive, append dengan actor/provenance, search/filter by actor/resource/date/search, read-only lookup semantics.
- `apps/api/test/organizations.test.cjs`: representative sensitive mutation mencatat audit entry pada organization create/update.
- Regression test existing disesuaikan untuk fake audit service.
- Total API tests: 66, api-client tests: 2.

### Verification (dijalankan dari root repo)

- PASS: `pnpm lint`
- PASS: `pnpm typecheck`
- PASS: `pnpm test`
- PASS: `pnpm build`
- PASS: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lemdiklat_lms?schema=public" pnpm --filter @lms/api db:validate`
- PASS: `pnpm --filter @lms/api db:generate`
- PASS tambahan: direct non-cached API test `pnpm --filter @lms/api build && node --test apps/api/test/*.test.cjs` → 66 pass.

### Verification DEFERRED

- Eksekusi migration di runtime PostgreSQL (`prisma migrate deploy`) untuk TASK-006 audit migration belum dijalankan karena Docker/container runtime tidak tersedia dan tidak diinstal otomatis. Wajib sebelum integration testing, UAT, atau production readiness.
- Runtime Keycloak realm/audience verification tetap inherited deferred dari TASK-003.

### Issue / Risiko

1. Audit write saat ini dipanggil setelah mutation repository selesai. Jika proses crash di antara commit mutation dan audit write, perubahan bisa terjadi tanpa audit row. Atomic audit bersama domain mutation memerlukan transaction boundary lintas repository dan perlu desain/refactor tersendiri sebelum production readiness.
2. Endpoint audit read membutuhkan `audit.log.read`, tetapi belum ada seeded role yang memegang permission tersebut. Ini konsisten dengan fail-closed authorization; bootstrap permission/role tetap perlu keputusan berikutnya.
3. Trigger append-only baru terbukti lewat migration SQL dan Prisma validation/generation; enforcement runtime perlu diverifikasi saat PostgreSQL runtime tersedia.

### Konfirmasi

TASK-007 dan task berikutnya **TIDAK** dikerjakan. Status TASK-006 dipindahkan ke `REVIEW` untuk human/architecture review sesuai `AGENTS.md`; Codex tidak menandai task ini `DONE`.

## Approval — 2026-09-16

User/reviewer approved TASK-006 after verification passed.

Status final: `DONE-WITH-DEFERRED`. Runtime PostgreSQL migration for `20260916000500_task_006_audit` and inherited Keycloak runtime verification remain deferred and must be completed before integration testing, UAT, or production readiness.

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
