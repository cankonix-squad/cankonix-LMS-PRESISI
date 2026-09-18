# TASK-014 — Class Subject

**Status:** REVIEW

## Dependency
TASK-013 = DONE.

## Verification Result
- `pnpm lint` → PASS
- `pnpm typecheck` → PASS
- `pnpm test` → PASS (84 tests: 82 API + 2 api-client; 3 new ClassSubject tests)
- `pnpm build` → PASS
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS
- Runtime PostgreSQL migration remains DEFERRED (consistent with TASK-000 foundation).

## Objective
Membuat delivery instance mata pelajaran per kelas.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`ClassSubject`: id (UUID), academicClassId (FK academic_classes), curriculumSubjectId (FK curriculum_subjects), code nullable, displayName nullable, startDate/endDate nullable (DATE), status (`ClassSubjectStatus`: ACTIVE, INACTIVE, COMPLETED), timestamps.
Unique compound: `[academicClassId, curriculumSubjectId]`.
Index: `[academicClassId]`, `[curriculumSubjectId]`, `[status]`.
Migration: `apps/api/prisma/migrations/20260920000000_task_014_class_subject/`.

## API / Application Contract
- `POST /api/v1/class-subjects`
- `GET /api/v1/class-subjects` (filter academicClassId, curriculumSubjectId, educationBatchId, educationProgramId, organizationId, status + pagination)
- `GET /api/v1/class-subjects/:id`
- `PATCH /api/v1/class-subjects/:id`

## Business Rules
CurriculumSubject harus berasal dari curriculum batch kelas tersebut (cross-curriculum mapping ditolak dengan `400`). Satu curriculum subject hanya sekali per kelas (`409`). `endDate >= startDate`. Kelas dan curriculum subject tidak dapat dipindahkan setelah dibuat — hanya code/displayName/date/status yang mutable. Mutasi create/update dicatat ke Audit Service (`class_subject.created`, `class_subject.updated`).

## Acceptance Criteria
[x] cross-curriculum mapping ditolak; [x] unique delivery; [x] tests + checks green.

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
