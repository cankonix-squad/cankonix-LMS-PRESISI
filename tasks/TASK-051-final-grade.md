# TASK-051 — Final Grade

**Status:** DONE

> **Remediation note (2026-09-19).** This task had been marked `DONE` without the Prisma migration and HTTP surface its own sections require: `FinalGrade` existed only in `schema.prisma`, and `calculate`/`approve`/`recalculate` had no controller route. Two further defects were corrected at the same time. First, `PrismaFinalGradesRepository.listAssessmentScores` returned a hardcoded `score: 0` for every assessment, so every weighted final grade would have been wrong; it now aggregates real scores from graded assignment submissions (TASK-024) and scored exam attempts (TASK-044), normalized to 0–100 against the assessment's `maxScore`. Second, an `APPROVED` grade had no way back, so `FinalGradesService.reopen` was added with its own `final_grade.reopened` audit action. Migration `apps/api/prisma/migrations/20261009000100_task_051_final_grade/`, routes on a new `FinalGradesController` (`POST /final-grades/calculate|recalculate`, `POST /final-grades/:id/approve|reopen`, `GET /final-grades/:id`), and audit entries `final_grade.*` added to the catalogue. Closed under reviewer approval while starting TASK-052; migration fidelity verified against canonical `prisma migrate diff` SQL.

## Dependency
TASK-050 = DONE.

## Objective
Menghitung dan menyimpan final grade per enrollment/classSubject.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`FinalGrade`: enrollmentId, classSubjectId, gradingSchemeId, numericScore, letter/gradeCode nullable, status, calculatedAt, approvedBy nullable, approvedAt nullable; unique enrollment+classSubject.

## API / Application Contract
Calculate/recalculate; read; approve if workflow enabled.

## Business Rules
Calculation consumes assessment scores+weights. Missing required component handled explicitly. Approved grade changes require audit/reopen policy.

## Acceptance Criteria
[ ] deterministic fixtures; [ ] missing component; [ ] approval audit; [ ] checks green.

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
