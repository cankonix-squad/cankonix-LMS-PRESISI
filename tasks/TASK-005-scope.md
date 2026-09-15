# TASK-005 — Role Assignment & Scope

**Status:** NOT STARTED

## Dependency
TASK-004 = DONE.

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
[ ] effective permission resolver tested; [ ] descendant org scope tested; [ ] expired assignment denied; [ ] multiple scopes supported; [ ] no role-name authorization; [ ] checks green.

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
