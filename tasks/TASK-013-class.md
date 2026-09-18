# TASK-013 — Academic Class

**Status:** REVIEW

## Dependency
TASK-012 = DONE.

## Verification Result
- `pnpm lint` → PASS
- `pnpm typecheck` → PASS
- `pnpm test` → PASS (81 tests: 79 API + 2 api-client)
- `pnpm build` → PASS
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS
- Runtime PostgreSQL migration remains DEFERRED (consistent with TASK-000 foundation).

## Objective
Membagi batch menjadi kelas akademik.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AcademicClass`: id (UUID), educationBatchId (UUID fk to education_batches), code (unique per batch), name, capacity (nullable integer >= 0), status (`AcademicClassStatus`: ACTIVE, INACTIVE, ARCHIVED), createdAt, updatedAt.
Index: `[educationBatchId]`, `[status]`.
Unique compound: `[educationBatchId, code]`.

## API / Application Contract
CRUD/list class:
- `POST /api/v1/academic-classes`
- `GET /api/v1/academic-classes` (supports filters: educationBatchId, educationProgramId, organizationId, status, search, pagination)
- `GET /api/v1/academic-classes/:id`
- `PATCH /api/v1/academic-classes/:id`

## Business Rules
Class selalu milik satu batch. Code unik per batch. Capacity tidak boleh negatif. Mutasi sensitif create dan update dicatat ke Audit Service (`academic_class.created`, `academic_class.updated`).

## Acceptance Criteria
[x] CRUD/filter; [x] uniqueness; [x] lifecycle; [x] checks green.

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
