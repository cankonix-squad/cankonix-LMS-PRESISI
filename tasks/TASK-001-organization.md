# TASK-001 — Organization Foundation

**Status:** DONE-WITH-DEFERRED

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
[x] migration valid; [x] CRUD/list/tree bekerja di unit/service test; [x] duplicate code ditolak; [x] invalid parent ditolak; [x] self-parent dan indirect cycle ditolak; [x] pagination/filter tervalidasi; [x] controller tanpa Prisma; [x] Swagger DTO terdokumentasi; [x] lint/typecheck/test/build green.

## Verification Evidence
- PASS: `pnpm lint`
- PASS: `pnpm typecheck`
- PASS: `pnpm test`
- PASS: `pnpm build`
- PASS: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lemdiklat_lms?schema=public" pnpm --filter @lms/api db:validate`
- PASS: `pnpm --filter @lms/api db:generate`
- DEFERRED: executing migration against PostgreSQL runtime. Docker/container runtime verification remains deferred from TASK-000 and is required before integration testing, UAT, or production readiness.

## Review Decision
- Reviewer approved TASK-001 as `DONE-WITH-DEFERRED` on 2026-09-16.
- Approved for development sequencing only. Executing the TASK-001 migration against PostgreSQL runtime remains DEFERRED and is not technically blocking TASK-002, which depends on organization persistence through the Prisma client layer already generated in this task.
- Deferred items must be closed before integration testing, UAT, or production readiness.
- Reviewer instructed that only TASK-001 work be committed; unrelated worktree changes are excluded.

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
