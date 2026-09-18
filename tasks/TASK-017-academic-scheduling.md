# TASK-017 — Academic Scheduling

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-014 = DONE.

## Verification Result
- `pnpm lint` → PASS (11 tasks, Prettier clean)
- `pnpm typecheck` → PASS (14 tasks)
- `pnpm test` → PASS (109 tests: 107 API + 2 api-client; 7 new tests in `apps/api/test/academic-schedules.test.cjs`, incl. OpenAPI contract)
- `pnpm build` → PASS (11 tasks)
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS
- Runtime PostgreSQL migration remains DEFERRED (consistent with TASK-000 foundation).

## Objective
Menyimpan jadwal kegiatan akademik terpisah dari content.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
- `AcademicSchedule`: id (UUID), classSubjectId (FK class_subjects, Restrict), title, description nullable, startAt (TIMESTAMP(3)), endAt (TIMESTAMP(3)), mode (`AcademicScheduleMode`: FACE_TO_FACE, ONLINE, BLENDED, default FACE_TO_FACE), location nullable, url nullable, status (`AcademicScheduleStatus`: SCHEDULED, ONGOING, COMPLETED, CANCELLED, default SCHEDULED), metadata JSONB nullable, timestamps.
- Indexes: `[classSubjectId]`, `[startAt, endAt]`, `[status]`. Back-relation `ClassSubject.schedules`.
- Scheduling is a separate table from learning content: a timetable entry exists whether or not material has been authored, and one schedule can later be linked to content without a schema change to either side.
- Migration: `apps/api/prisma/migrations/20260923000000_task_017_academic_schedule/`.
- Audit actions (append-only): `academic_schedule.created|updated|cancelled`; resource type `academic_schedule`.

## API / Application Contract
- `POST /api/v1/academic-schedules` (create).
- `GET /api/v1/academic-schedules` — calendar read. Filters: classSubjectId, academicClassId, educationBatchId, mode, status, `from`/`to` window, pagination. Ordered by `startAt` ascending.
- `GET /api/v1/academic-schedules/:id` (detail).
- `PATCH /api/v1/academic-schedules/:id` (title, description, startAt, endAt, mode, location, url, status, metadata; `classSubjectId` is immutable).
- `PATCH /api/v1/academic-schedules/:id/cancel` (frees the slot, keeps the row).

## Business Rules
- **endAt > startAt** (`400` strict: a zero-length or inverted period is rejected, not silently coerced).
- **Kalender memakai semantics overlap**: entri dikembalikan bila `startAt <= window.to AND endAt >= window.from`, sehingga sesi yang menyeberang batas bulan tetap terlihat. `to < from` ditolak `400`.
- **Conflict detection minimal untuk exact resource/person overlap**: aktivitas pada `classSubjectId` yang sama dengan periode tumpang tindih ditolak `409`, dan response memuat daftar `conflicts` (id, title, startAt, endAt, status) — tidak silent. Overlap memakai perbandingan ketat (`startAt < endAt` baru AND `endAt > startAt` lama) sehingga sesi berurutan (back-to-back) tidak dianggap konflik. Conflict check dijalankan saat create, dan pada update hanya bila periode atau status berubah.
- Delivery target minimal per mode: FACE_TO_FACE butuh `location`, ONLINE butuh `url`, BLENDED butuh salah satu (`400`).
- **CANCELLED tidak menempati slot**: entri yang dibatalkan tidak pernah memicu konflik dan tidak memblokir jadwal pengganti, tetapi barisnya tetap tersimpan sehingga histori kalender tetap terbaca. Cancel pada entri yang sudah CANCELLED ditolak `400`.
- `classSubjectId` tidak dapat dipindah pada update: memindahkan jadwal antar kelas akan menulis ulang sejarah; batalkan dan buat baru.

## Acceptance Criteria
[x] date-range API; [x] invalid time rejected; [x] basic conflict test; [x] checks green.

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
