# TASK-045 — Answer Autosave & Concurrency

**Status:** DONE

## Dependency
TASK-044 = DONE.

## Objective
Autosave durable dan idempotent.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AttemptAnswer`: attemptQuestionId unique, answerPayload JSON, revision integer, savedAt; indexes attempt. PostgreSQL source of truth.

## API / Application Contract
`PUT /api/v1/exam-attempts/:attemptId/questions/:attemptQuestionId/answer` dengan revision/idempotency semantics; get own saved state.

## Business Rules
Validate ownership, active deadline, payload by question type. Prevent stale revision overwrite. Redis optional only lock/cache.

## Acceptance Criteria
[ ] repeated PUT idempotent; [ ] stale revision conflict; [ ] deadline enforced; [ ] concurrent tests at service level; [ ] checks green.

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
