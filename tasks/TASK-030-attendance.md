# TASK-030 — Attendance Session & Record

**Status:** DONE-WITH-DEFERRED

## Implementation Report (2026-09-17)

### Files created
- `apps/api/src/attendance/attendance.module.ts`
- `apps/api/src/attendance/attendance.controller.ts`
- `apps/api/src/attendance/attendance.service.ts`
- `apps/api/src/attendance/attendance.repository.ts` (Symbol token + `PrismaAttendanceRepository`)
- `apps/api/src/attendance/attendance.types.ts`
- `apps/api/src/attendance/dto/attendance-method.dto.ts`
- `apps/api/src/attendance/dto/attendance-status.dto.ts`
- `apps/api/src/attendance/dto/attendance-session-status.dto.ts`
- `apps/api/src/attendance/dto/create-attendance-session.dto.ts`
- `apps/api/src/attendance/dto/record-attendance.dto.ts`
- `apps/api/src/attendance/dto/list-attendance-query.dto.ts`
- `apps/api/src/attendance/dto/attendance-response.dto.ts`
- `apps/api/prisma/migrations/20260929000000_task_030_attendance/migration.sql`
- `apps/api/test/attendance.test.cjs`

### Files modified
- `apps/api/prisma/schema.prisma` (added `AttendanceSession`, `AttendanceRecord`, enums `AttendanceMethod`, `AttendanceSessionStatus`, `AttendanceStatus`; back-relations on `ClassSubject`, `LearningMeeting`, `Enrollment`, `UserAccount`)
- `apps/api/src/app.module.ts` (registered `AttendanceModule`)
- `apps/api/src/audit/audit-actions.ts` (appended 5 attendance actions, append-only)

### Endpoints (`/api/v1`)
- `POST /attendance/sessions` — create session
- `GET /attendance/sessions` — list/filter sessions (classSubjectId, meetingId, status, paged)
- `GET /attendance/sessions/:id` — session detail with records
- `PATCH /attendance/sessions/:id` — update session (blocked when CLOSED/CANCELLED)
- `PATCH /attendance/sessions/:id/status` — DRAFT/OPEN/CLOSED/CANCELLED lifecycle
- `POST /attendance/records` — single participant record
- `POST /attendance/sessions/:id/records/bulk` — bulk record (all-or-nothing validation)
- `GET /attendance/records` — list/filter records (sessionId, enrollmentId, status, paged)
- `GET /attendance/records/:id` — record detail

### Business rules enforced
- Unique record per (session, enrollment) via `@@unique([sessionId, enrollmentId])`; writes are an upsert so the constraint is structural, not a code check.
- Eligibility chain: session exists → ClassSubject ACTIVE → enrollment exists → enrollment ACTIVE → enrollment `academicClassId` must equal the session's class subject class (409 otherwise). Optional `meetingId` must belong to the same class subject (409) and may not be ARCHIVED (422).
- Session lifecycle: `endAt` must be strictly after `startAt`; records can only be written while status is `OPEN`; CLOSED/CANCELLED sessions reject direct edits (422) — reserved for TASK-031 corrections.
- Idempotent same-status session transition returns the current state with no audit entry (retry-resilient).
- Audit actions: `attendance_session.created|updated|status_changed`, `attendance_record.recorded|bulk_recorded`; resource types `attendance_session`, `attendance_record`. Actor identity is resolved from request context by `AuditService`, never supplied by the caller.

### Verification (PASS)
- `pnpm lint` — 11/11 packages, Prettier clean
- `pnpm typecheck` — 14/14 packages
- `pnpm build` — 11/11 packages
- `pnpm test` — **161 API + 2 api-client = 163, 0 fail** (2 new tests in `apps/api/test/attendance.test.cjs`: service lifecycle/rules + OpenAPI route exposure)
- `pnpm --filter @lms/api db:validate` — valid
- `pnpm --filter @lms/api db:generate` — generated

### Deferred
- Runtime PostgreSQL migration execution (`migrate deploy`) — no container runtime available; not installed automatically. The migration SQL is deterministic and derived from the schema diff.

### Risks / notes
- Controllers use `@AllowAuthenticated()` (foundation baseline, as with all prior domain modules). Replacing it with explicit attendance permissions (`attendance.session.manage`, `attendance.record.manage`) remains the recorded carry-forward risk; no role-name branching was introduced.
- `recordedByUserId` stores `principal.accountId` (a `user_accounts` UUID, matching the FK), never the Keycloak subject.

## Dependency
TASK-017 dan TASK-015 = DONE.

## Objective
Mencatat sesi dan kehadiran.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AttendanceSession`: id, classSubjectId, meetingId nullable, startAt/endAt, method, status. `AttendanceRecord`: id, sessionId, enrollmentId, status, checkInAt nullable, note nullable, recordedByUserId; unique session+enrollment.

## API / Application Contract
Create/open/close session; record/bulk record attendance; list by session/student.

## Business Rules
Status baseline PRESENT/LATE/EXCUSED/SICK/ABSENT. Method MANUAL/QR_CODE/ONLINE/INTEGRATION sebagai configurable enum/master sesuai implementation. Enrollment harus sesuai class. Closed session tidak diedit langsung.

## Acceptance Criteria
[x] unique record; [x] eligibility; [x] session lifecycle; [x] checks green.

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
