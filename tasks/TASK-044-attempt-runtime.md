# TASK-044 — Attempt Runtime & Server Timer

**Status:** DONE

## Dependency
TASK-043 = DONE.

## Objective
Membuat attempt dengan frozen question set dan deadline server.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`ExamAttempt`: participantId, attemptNo, startedAt, expiresAt, submittedAt, status, score nullable. `AttemptQuestion`: attemptId, questionVersionId, sequence, points, optionOrder JSON nullable; unique attempt+sequence.

## API / Application Contract
Start attempt; get safe attempt/questions; submit/finalize attempt.

## Business Rules
Start transactional dan idempotent. expiresAt = server start + duration bounded by session end policy. Frozen versions/order. Client clock tidak dipercaya. Redis bukan source of truth.

## Acceptance Criteria
[x] concurrent start safe; [x] frozen set; [x] timer tests; [x] expired attempt rejected/finalized; [x] no answer leak; [x] checks green.

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
