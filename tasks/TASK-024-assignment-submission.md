# TASK-024 — Assignment & Submission

**Status:** NOT STARTED

## Dependency
TASK-021, TASK-022, TASK-015 = DONE.

## Objective
Mendukung tugas, submission, file, dan penilaian assignment.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`Assignment`: id, assessmentId nullable, activityId, dueAt, maxScore, attemptsAllowed, status. `AssignmentSubmission`: id, assignmentId, enrollmentId, attemptNo, submittedAt, textAnswer nullable, status. `SubmissionFile`: submissionId, storedFileId. `AssignmentGrade`: submissionId unique, score, graderPersonId, feedback, gradedAt.

## API / Application Contract
Educator CRUD/publish assignment; student submit; attach file; educator grade; read own submission/grade.

## Business Rules
Deadline server authoritative. attemptsAllowed enforced. Grade 0..maxScore. Resubmission tidak overwrite historical attempt. Authorization by enrollment/educator assignment.

## Acceptance Criteria
[ ] deadline/attempt tests; [ ] file relation; [ ] grade validation; [ ] tests + checks green.

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
