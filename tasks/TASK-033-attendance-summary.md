# TASK-033 — Attendance Summary

**Status:** REVIEW

## Dependency
TASK-031 = DONE.

## Objective
Menyediakan aggregate attendance efisien.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AttendanceSummary` reporting table/materialized view atau query aggregate terenkapsulasi; desain harus dapat di-refresh.

## API / Application Contract
Summary per enrollment/class/batch/program dengan counts dan percentage.

## Business Rules
Definisi denominator konsisten: sesi eligible/closed. Correction tercermin setelah refresh/update.

## Acceptance Criteria
[x] aggregate correctness fixtures; [x] no full raw scan pattern in executive path; [x] checks green.

## Implementation Evidence (2026-09-18)

### Persistence
- Prisma model `AttendanceSummary` (`attendance_summaries`) + enum `AttendanceSummaryScopeType` (`ENROLLMENT`, `ENROLLMENT_SUBJECT`, `CLASS_SUBJECT`, `CLASS`, `BATCH`, `PROGRAM`).
- Unique `(scopeType, scopeId)` makes each reporting scope addressable by one lookup; denormalized `enrollment_id`, `class_subject_id`, `academic_class_id`, `education_batch_id`, `academic_program_id` columns let a report filter by class/batch/program without re-joining the academic chain.
- Migration `apps/api/prisma/migrations/20261001000000_task_033_attendance_summary/migration.sql`. No foreign keys on the reporting columns: a summary is derived data and must not be able to block or cascade a domain delete.

### Refresh design ("desain harus dapat di-refresh")
- `AttendanceSummaryService.refresh` re-derives one scope from the raw tables and upserts its row, so it is idempotent and safe to repeat.
- `refreshQuietly` (non-fatal) is bound to attendance writes: `recordAttendance`, `bulkRecordAttendance`, and a session status change that enters or leaves `CLOSED`. `AttendanceCorrectionsService.applyCorrection` calls `refreshForSession` after the correction is committed.
- `refreshForClassSubject` refreshes personal rows first, then the class-subject row, then the class/batch/program roll-ups, so a drill-down can never disagree with the level above it.
- `POST /api/v1/attendance-summary/refresh` remains available for an explicit rebuild and writes an `attendance_summary.refreshed` audit entry.

### Denominator rule ("sesi eligible/closed")
- Only `CLOSED` sessions are eligible. `DRAFT`, `OPEN` and `CANCELLED` sessions never contribute — not even when records exist against them.
- A closed session with no record counts as `ABSENT`, so `present + late + excused + sick + absent === totalSessions` always holds for a personal scope.
- A group scope is the exact sum of the personal scopes inside it (participant-weighted), so `class total === sum of its participants` is an invariant rather than a coincidence.
- Applying a correction moves a count and the percentage but never the denominator: eligibility is a property of the session, not of the record.

### API / Application Contract
- `GET /api/v1/attendance-summary` (filters + pagination).
- `GET /api/v1/attendance-summary/enrollments/:enrollmentId` (`?classSubjectId=` narrows to `ENROLLMENT_SUBJECT`).
- `GET /api/v1/attendance-summary/class-subjects/:classSubjectId`.
- `GET /api/v1/attendance-summary/classes/:academicClassId`.
- `GET /api/v1/attendance-summary/batches/:educationBatchId`.
- `GET /api/v1/attendance-summary/programs/:educationProgramId`.
- `POST /api/v1/attendance-summary/refresh`.
- Each response carries `totalSessions`, `participants`, the five status counts, `attendancePercentage` (2-decimal), `recalculatedAt` and the scope identifiers.
- Authorization: `attendance.summary.read` for reads, `attendance.summary.refresh` for recalculation. Permission + Scope only; no role-name branching.

### No raw scan in the reporting path
- `getSummary` reads a single row through the unique `(scopeType, scopeId)` key. The raw tables are touched only inside `refresh*`. A scope that has never been refreshed is computed once and then persisted, so the fallback is not a per-request scan.
- A test asserts that repeated reads do not re-invoke the raw calculation.

### Client
- `@lms/api-client` gained `AttendanceSummaryScopeType`, `AttendanceSummary`, `AttendanceSummaryList`, `ListAttendanceSummariesQuery`, `RefreshAttendanceSummaryInput`, and `api.attendanceSummary.*` (`list`, `getEnrollment`, `getClassSubject`, `getClass`, `getBatch`, `getProgram`, `refresh`).

### Tests
- New `apps/api/test/attendance-summary.test.cjs` (14 tests): denominator eligibility, unrecorded-session ABSENT fallback, OPEN/CANCELLED exclusion, group-equals-sum-of-participants, class-subject narrowing, read path does not recalculate, unplaced enrollment yields an empty (not fabricated) summary, refresh idempotence, correction changes counts but not denominator, unknown scope rejected, audit on explicit refresh, quiet refresh never throws, composite personal key, and `/api/v1` OpenAPI + 401 fail-closed.
- Updated `attendance.test.cjs` and `attendance-corrections.test.cjs` for the new summary dependency and to assert the refresh hook fires.

### Verification
`pnpm lint` 11/11 (Prettier clean) · `pnpm typecheck` 14/14 · `pnpm test` **180 API + 2 api-client = 182, 0 fail** · `pnpm build` 11/11 · `db:validate` valid · `db:generate` Prisma Client v6.19.3.

### Deferred
- Runtime end-to-end against a live PostgreSQL + Keycloak (no container runtime available; not installed automatically). Not a technical blocker: the counting rules are covered by the in-memory Prisma double, and the migration is validated by `prisma validate`.

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
