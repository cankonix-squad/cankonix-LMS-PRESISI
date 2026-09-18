# TASK-015 — Enrollment

**Status:** REVIEW

## Dependency
TASK-013 = DONE.

## Verification Result
- `pnpm lint` → PASS
- `pnpm typecheck` → PASS
- `pnpm test` → PASS (90 tests: 88 API + 2 api-client; 6 new Enrollment tests incl. OpenAPI contract)
- `pnpm build` → PASS
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS
- Runtime PostgreSQL migration remains DEFERRED (consistent with TASK-000 foundation).

## Objective
Menyimpan keikutsertaan peserta dan histori pendidikan.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`Enrollment`: id (UUID), personId (FK persons, Restrict), educationBatchId (FK education_batches, Restrict), academicClassId nullable (FK academic_classes, Restrict), enrollmentNumber nullable unique, enrolledAt (DATE), status (`EnrollmentStatus`: ACTIVE, WITHDRAWN, COMPLETED), completedAt nullable (DATE), metadata JSONB, timestamps.
Unique compound: `[personId, educationBatchId]` (baseline, satu keikutsertaan per person per batch).
Index: `[personId]`, `[educationBatchId]`, `[academicClassId]`, `[status]`.
Migration: `apps/api/prisma/migrations/20260921000000_task_015_enrollment/`.

## API / Application Contract
- `POST /api/v1/enrollments` (enroll)
- `GET /api/v1/enrollments` (filter personId, educationBatchId, academicClassId, educationProgramId, organizationId, status + pagination)
- `GET /api/v1/enrollments/:id`
- `GET /api/v1/enrollments/persons/:personId` (person education history; dideklarasikan sebelum `:id`)
- `PATCH /api/v1/enrollments/:id/status` (withdraw/complete/reactivate, dengan `reason` opsional)
- `PATCH /api/v1/enrollments/:id/class` (transfer kelas dalam batch yang sama)

## Business Rules
Enrollment adalah business context, bukan permanent PESERTA role. Person harus `ACTIVE` (`422` bila tidak), person atau kelas yang tidak dikenal ditolak `404`. Class, jika ada, wajib milik batch yang sama (`400`). Duplikat person+batch dan duplikat enrollmentNumber ditolak `409`. Withdrawal/completion hanya mengubah status — record tidak pernah dihapus sehingga histori pendidikan tetap utuh. Transisi status dibatasi (`ACTIVE ↔ WITHDRAWN/COMPLETED`; `422` untuk transisi ilegal, `400` untuk status yang sama). Transfer kelas hanya untuk enrollment `ACTIVE` dan mencatat before/after ke audit (`enrollment.class_transferred`).

## Acceptance Criteria
[x] duplicate enrollment ditolak; [x] invalid class/batch ditolak; [x] history preserved; [x] checks green.

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
