# TASK-007 — Admin Foundation UI

**Status:** NOT STARTED

## Dependency
TASK-001, TASK-002, TASK-004, TASK-005 = DONE.

## Objective
Membuat shell Admin portal dan UI foundation untuk organization/person/RBAC yang sudah tersedia.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak menambah business persistence baru. Gunakan shared api-client/types/auth package sesuai foundation.

## API / Application Contract
Admin pages: organization tree/list/detail/form; person list/detail; role/permission; assignment/scope. Semua akses melalui API, bukan direct DB.

## Business Rules
Portal bukan security boundary; API tetap enforce permission. Loading/error/empty states wajib. Form validation client hanya tambahan, server authoritative.

## Acceptance Criteria
[ ] routes/navigation; [ ] responsive basic admin; [ ] API errors handled; [ ] no duplicated business rules; [ ] build admin independently green.

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
