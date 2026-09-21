# TASK-050 — Grading Scheme & Components

**Status:** DONE

> **Remediation note (2026-09-19).** This task had been marked `DONE` without the Prisma migration and HTTP surface that its own "Data Model / Persistence" and "API / Application Contract" sections require: `GradingScheme` and `GradingComponent` existed only in `schema.prisma`, and the scheme/component service methods had no controller route. The tests passed because they drive a fake in-memory repository, so the gap was invisible to the suite. Closed under reviewer approval while starting TASK-052 — migration `apps/api/prisma/migrations/20261009000000_task_050_grading/`, routes on a new `GradingSchemesController` (`GET/POST /grading-schemes`, `GET /grading-schemes/:id`, `POST /grading-schemes/:id/components`), DTOs in `dto/grading-scheme.dto.ts`, permission codes in `grading-permissions.ts`, and audit entries `grading_scheme.*` / `grading_component.created` in the catalogue. Migration fidelity verified statement-by-statement against canonical `prisma migrate diff` SQL.

## Dependency
TASK-040 dan TASK-024/046 sesuai component yang dipakai = DONE.

## Objective
Membuat skema bobot penilaian configurable.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`GradingScheme`: classSubjectId, name, status. `GradingComponent`: schemeId, assessmentId, name, weight, required; unique scheme+assessment.

## API / Application Contract
CRUD scheme/components; validate/publish scheme.

## Business Rules
Total weight published = 100% (atau normalized policy eksplisit). Assessment harus classSubject sama. Tidak hardcode exam/assignment weight.

## Acceptance Criteria
[ ] weight validation; [ ] cross-subject rejected; [ ] checks green.

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
