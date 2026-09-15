# TASK-049 — Exam Load & Security Tests

**Status:** NOT STARTED

## Dependency
TASK-044, TASK-045, TASK-046 = DONE.

## Objective
Menguji invariants concurrency/security exam sebelum dianggap production-ready.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak menambah business model kecuali test fixtures/tooling justified.

## API / Application Contract
Test harness untuk start/autosave/submit concurrency dan authorization boundaries.

## Business Rules
Tidak boleh menurunkan security untuk membuat test lolos. Docker unavailable boleh DEFERRED untuk real load test, tetapi unit/integration-style mocked tests tetap jalan.

## Acceptance Criteria
[ ] no answer leak; [ ] unauthorized attempt denied; [ ] concurrent autosave semantics; [ ] double submit/start; [ ] runtime load test documented/deferred if unavailable.

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
