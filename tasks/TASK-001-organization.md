# TASK-001 — Organization Foundation

**Status:** NOT STARTED

## Dependency
TASK-000 = DONE atau DONE-WITH-DEFERRED.

## Objective
Membangun master organisasi recursive yang menjadi dasar scope authorization dan drill-down nasional.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Prisma model `Organization`: UUID `id`, unique `code`, `name`, nullable self-FK `parentId`, `organizationType` string nullable, `status` (ACTIVE/INACTIVE), `metadata` JSON nullable, timestamps. Tambahkan index pada `parentId`, `status`, dan `organizationType`. Gunakan self relation parent/children. Jangan membuat enum level organisasi yang mengunci POLRI/LEMDIKLAT/lembaga.

## API / Application Contract
Minimal endpoint: `POST /api/v1/organizations`, `GET /api/v1/organizations`, `GET /api/v1/organizations/:id`, `PATCH /api/v1/organizations/:id`, `GET /api/v1/organizations/:id/children`, `GET /api/v1/organizations/:id/tree`. List mendukung search, status, parentId, pagination. Response tidak mengekspos detail persistence yang tidak perlu.

## Business Rules
Code unik dan dinormalisasi. Parent harus ada. Organization tidak boleh menjadi parent dirinya sendiri. Update parent wajib mencegah circular hierarchy termasuk indirect cycle. Organization inactive tetap dipertahankan; jangan hard delete bila sudah direferensikan. Hierarchy depth tidak di-hardcode. Siapkan service/repository agar descendant resolution dapat dipakai TASK scope berikutnya. Permission hook boleh disiapkan tetapi jangan implement RBAC TASK-004.

## Acceptance Criteria
[ ] migration valid; [ ] CRUD/list/tree bekerja di unit/service test; [ ] duplicate code ditolak; [ ] invalid parent ditolak; [ ] self-parent dan indirect cycle ditolak; [ ] pagination/filter tervalidasi; [ ] controller tanpa Prisma; [ ] Swagger DTO terdokumentasi; [ ] lint/typecheck/test/build green.

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
