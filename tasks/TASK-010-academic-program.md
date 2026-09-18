# TASK-010 — Program Pendidikan

**Status:** REVIEW

## Dependency
TASK-005 = DONE.

## Verification Result
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms pnpm --filter @lms/api lint` → PASS
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms pnpm --filter @lms/api typecheck` → PASS
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms pnpm --filter @lms/api build` → PASS
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms node --test apps/api/test/education-programs.test.cjs` → PASS (4/4)

Implemented the education program model, DTOs, service, repository, controller, and migration for organization-scoped program CRUD with duplicate-code prevention and audit logging.

## Objective
Membangun master definisi program pendidikan per organisasi.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`EducationProgram`: id, organizationId, unique code (scope org or global documented), name, description, status, metadata, timestamps. Index organization/status.

## API / Application Contract
CRUD/list programs dengan org scope/filter/pagination.

## Business Rules
Program adalah definition, bukan cohort. Authorization mengikuti organization scope. Inactive tidak menghapus histori.

## Acceptance Criteria
[ ] CRUD + scope; [ ] uniqueness rule tested; [ ] audit mutation; [ ] checks green.

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
