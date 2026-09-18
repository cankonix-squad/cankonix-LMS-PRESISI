# TASK-031 — Attendance Correction & Audit

**Status:** REVIEW

## Implementation Report (2026-09-17)

### Files created
- `apps/api/src/attendance-corrections/attendance-corrections.module.ts`
- `apps/api/src/attendance-corrections/attendance-corrections.controller.ts`
- `apps/api/src/attendance-corrections/attendance-corrections.service.ts`
- `apps/api/src/attendance-corrections/attendance-corrections.repository.ts` (Symbol token + `PrismaAttendanceCorrectionsRepository`)
- `apps/api/src/attendance-corrections/attendance-corrections.types.ts`
- `apps/api/src/attendance-corrections/dto/apply-attendance-correction.dto.ts`
- `apps/api/src/attendance-corrections/dto/list-attendance-corrections-query.dto.ts`
- `apps/api/src/attendance-corrections/dto/attendance-correction-status.dto.ts`
- `apps/api/src/attendance-corrections/dto/attendance-correction-response.dto.ts`
- `apps/api/src/attendance/attendance-permissions.ts` (`attendance.record.read|manage`, `attendance.correction.read|manage`)
- `apps/api/prisma/migrations/20260930000000_task_031_attendance_correction/migration.sql`
- `apps/api/test/attendance-corrections.test.cjs`

### Files modified
- `apps/api/prisma/schema.prisma` (added `AttendanceCorrection` + enum `AttendanceCorrectionStatus`; back-relation `AttendanceRecord.corrections`; two named `UserAccount` relations for requester/approver)
- `apps/api/src/app.module.ts` (registered `AttendanceCorrectionsModule`)
- `apps/api/src/audit/audit-actions.ts` (appended `attendance_correction.applied`, append-only)

### Schema / persistence
- `AttendanceCorrection` (`attendance_corrections`): `attendanceRecordId`, `previousStatus`, `newStatus`, `reason` (mandatory), `requestedByUserId`, `approvedByUserId`, `approvedAt`, `status`, `createdAt`. Indexed on `(attendanceRecordId, createdAt)`, requester, approver, status.
- **Append-only at the database level**: the migration installs `BEFORE UPDATE` / `BEFORE DELETE` triggers on `attendance_corrections` that raise, mirroring the `audit_logs` guard from TASK-006. The repository exposes no update/delete operation.
- History lives in its own table rather than a `previousStatus` column on the record, so a chain of corrections survives intact.
- `AttendanceCorrectionStatus` (`PENDING`/`APPLIED`/`REJECTED`) is modelled even though the minimal workflow applies immediately, so a future four-eyes approval flow needs no migration.

### Endpoints (`/api/v1`)
- `POST /attendance-corrections/records/:recordId` — apply a correction (`attendance.correction.manage`)
- `GET /attendance-corrections/records/:recordId` — correction history of one record, oldest first (`attendance.correction.read`)
- `GET /attendance-corrections` — list corrections with `recordId`/`sessionId`/`requestedByUserId`/`status` filters and pagination (`attendance.correction.read`)
- `GET /attendance-corrections/:id` — correction detail (`attendance.correction.read`)

### Business rules enforced
- **Reason mandatory**: DTO requires 5..1000 chars, and the service re-checks after `trim()` so a whitespace-only reason is a 400 even if the DTO is bypassed.
- **Closed attendance changes only through a correction**: TASK-030 rejects direct record writes once a session is `CLOSED`; this endpoint is the sanctioned path and works on a CLOSED session. A `CANCELLED` session is not correctable (422).
- **History preserved**: the log row and the record's status update happen in ONE `$transaction`, so a record can never change without a matching correction row, and a correction can never be recorded without the record changing.
- **Unauthorized correction denied** (fail closed, cheapest check first): missing/incomplete actor identity → 403; participant correcting their own record (`enrollment.personId === actor.personId`) → 403; record not found → 404; cancelled session → 422; same-status "correction" → 409.
- **Denials are side-effect free**: no history row and no audit entry is written for any rejected correction (asserted in tests).
- **AuditLog wajib**: `attendance_correction.applied` with `before`/`after` status, check-in and note, plus `metadata.attendanceRecordId`, `metadata.sessionId` and the reason. The actor is attributed by `AuditService` from request context, never supplied by the caller.
- **No delete**: neither the API nor the repository exposes a correction delete, and the trigger blocks it even if code tried.

### Explicit permissions (not the `@AllowAuthenticated()` baseline)
This controller declares `@RequirePermissions(...)` with the new `ATTENDANCE_PERMISSIONS` vocabulary instead of the foundation allow-list, so the fail-closed `PermissionGuard` is what denies an authenticated caller without the right permission. This is the first attendance-domain controller to move off the foundation baseline.

### Verification (PASS)
- `pnpm lint` — 11/11 packages, Prettier clean
- `pnpm typecheck` — 14/14 packages
- `pnpm build` — 11/11 packages
- `pnpm test` — **165 API + 2 api-client = 167, 0 fail** (4 new tests in `apps/api/test/attendance-corrections.test.cjs`: apply + history, chained corrections, denial matrix, OpenAPI/401)
- `pnpm --filter @lms/api db:validate` — valid
- `pnpm --filter @lms/api db:generate` — generated

### Deferred
- Runtime PostgreSQL migration execution (`migrate deploy`) and the trigger behaviour under a live database — no container runtime available; not installed automatically.

### Risks / notes
- TASK-030's `attendance` controller still uses `@AllowAuthenticated()`; switching it to the new `ATTENDANCE_PERMISSIONS` catalogue is a recorded carry-forward item (changing it would require the permissions to be seeded and granted first, or every attendance route would 403). The `attendance.correction.*` codes must be registered via `POST /api/v1/authorization/permissions` and granted to roles before these endpoints are usable in a live environment.

## Dependency
TASK-030 dan TASK-006 = DONE.

## Objective
Memungkinkan koreksi tanpa menghapus histori.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AttendanceCorrection`: id, attendanceRecordId, previousStatus, newStatus, reason, requested/approvedBy ids sesuai workflow minimal, createdAt. Record current status dapat diperbarui transactional setelah correction log.

## API / Application Contract
Request/apply correction; history endpoint.

## Business Rules
Reason mandatory. Closed attendance hanya berubah melalui correction. AuditLog wajib. Tidak delete correction.

## Acceptance Criteria
[x] history preserved; [x] audit emitted; [x] unauthorized correction denied; [x] checks green.

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
