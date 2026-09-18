# TASK-023 — Learning Progress

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-021 = DONE dan TASK-015 = DONE.

## Objective
Menyimpan progress peserta secara incremental.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`LearningProgress`: id, enrollmentId, activityId, status, progressPercent, startedAt, completedAt, lastAccessedAt, metadata; unique enrollment+activity.

Implemented — `apps/api/prisma/schema.prisma`:
- `LearningProgress` (table `learning_progress`): `id`, `enrollment_id` (FK → `enrollments` `ON DELETE RESTRICT`), `activity_id` (FK → `learning_activities` `ON DELETE RESTRICT`), `status` (`LearningProgressStatus`), `progress_percent` (default 0), `started_at`, `completed_at`, `last_accessed_at`, `metadata` (JSONB), `created_at`, `updated_at`.
- **`@@unique([enrollmentId, activityId])`** — one progress row per participant per activity, which makes the write an upsert and the update naturally idempotent.
- Indexes: `[enrollment_id, status]`, `[activity_id]`, `[status]`.
- `enum LearningProgressStatus`: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`.
- Back-relations added: `Enrollment.progress`, `LearningActivity.progress`.
- Aggregate read model `ClassSubjectProgressAggregate` (table `class_subject_progress_aggregates`): `@@unique([classSubjectId, enrollmentId])`, columns `total_activities`, `completed_activities`, `required_activities`, `completed_required_activities`, `progress_percent`, `last_activity_at`, `recalculated_at`, timestamps; indexes `[class_subject_id, progress_percent]`, `[enrollment_id]`. Derived data — rebuildable from `learning_progress`, never a source of truth.
- Migration: `apps/api/prisma/migrations/20260927000000_task_023_learning_progress/migration.sql`.
- Audit actions (append-only catalogue): `learning_progress.started`, `learning_progress.updated`, `learning_progress.completed`; resource type `learning_progress`.

## API / Application Contract
Get/update progress; participant summary per classSubject/meeting.

Implemented in `apps/api/src/learning-progress/` (all routes under `/api/v1/learning-progress`, module `LearningProgressModule`):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/learning-progress` | Record or update progress for one activity (upsert). |
| GET | `/learning-progress` | Paginated list, filterable by enrollment/activity/classSubject/meeting/status. |
| GET | `/learning-progress/summary/class-subjects/:classSubjectId` | Pre-aggregated summaries for all participants of a class subject. |
| GET | `/learning-progress/summary/class-subjects/:classSubjectId/enrollments/:enrollmentId` | Pre-aggregated summary for one participant. |
| GET | `/learning-progress/enrollments/:enrollmentId/activities/:activityId` | Progress for one participant/activity pair. |

Layering: `LearningProgressController` → `LearningProgressService` → `LearningProgressRepository` (token `LEARNING_PROGRESS_REPOSITORY`) → Prisma. The controller never touches Prisma. Summary routes are declared before the parameterised `enrollments/...` route so static segments win.

## Business Rules
Hanya enrollment valid. progress 0..100. Completion idempotent. Aggregate disimpan/dioptimalkan; jangan hitung seluruh histori setiap dashboard request.

Implemented:
- **Only a valid enrollment may carry progress.** The enrollment must exist (404) and be `ACTIVE` (422 otherwise). A withdrawn or completed participant cannot keep recording progress.
- **The activity must be live.** The activity must be `PUBLISHED`, its meeting `PUBLISHED`, and the class subject `ACTIVE` — a DRAFT or ARCHIVED activity accepts no progress.
- **Enrollment/class alignment.** When the enrollment has an explicit `academicClassId` it must match the class subject's academic class, otherwise 409. This stops progress leaking across parallel classes of the same batch.
- **`progressPercent` is 0..100.** Out-of-range values are rejected at the DTO layer (`@Min(0) @Max(100)`) and again in the service (`BadRequestException`).
- **`status` and `progressPercent` cannot contradict.** Send either; the service derives the other (`0`→`NOT_STARTED`, `100`→`COMPLETED`, anything between →`IN_PROGRESS`). Send both and the pair is validated: `COMPLETED` requires `100`, `NOT_STARTED` requires `0`, otherwise 400. The contradictory state is unrepresentable over the API.
- **Completion is idempotent.** The write is an upsert keyed on `(enrollmentId, activityId)`. Re-sending an already-completed state leaves the stored row and the aggregate unchanged, and produces **no** additional audit entry — a client retry is not a second business event. `completedAt` is set once and preserved.
- **Aggregates are stored, not computed per request.** Every write incrementally recomputes the participant's class-subject rollup into `class_subject_progress_aggregates` in the same service call. Dashboard and reporting reads are a single indexed lookup; they never scan the whole progress history.
- **Audit only on real transitions.** `started` on first access or NOT_STARTED→IN_PROGRESS, `completed` on the transition into COMPLETED, `updated` otherwise. Redundant no-op writes are silent.
- **Backwards correction is allowed but explicit.** COMPLETED may return to IN_PROGRESS so a mis-click can be fixed; the reverse transition rules are data, not branches.

## Acceptance Criteria
[x] idempotent updates; [x] enrollment eligibility; [x] summary tests; [x] checks green.

## Verification Result
- `pnpm lint` — PASS (11 tasks).
- `pnpm typecheck` — PASS (14 tasks).
- `pnpm build` — PASS (11 tasks).
- `pnpm test` — PASS: **140 API tests** (8 new in `apps/api/test/learning-progress.test.cjs`) + 2 `@lms/api-client` = **142 total**, 0 fail.
- `pnpm --filter @lms/api db:validate` — PASS.
- `pnpm --filter @lms/api db:generate` — PASS.
- New tests cover: incremental record/update with derived status+percent; **idempotent completion** (repeat call leaves the row unchanged and adds no audit entry); non-ACTIVE enrollment refused; DRAFT activity refused; class-mismatch refused (409); contradictory `status`/`progressPercent` pairs refused (400); incremental class-subject aggregate maintained (totals, required counts, percent, `lastActivityAt`) without a history scan on read; OpenAPI exposure + 401 on anonymous access.

### Deferred Verification
- **Runtime PostgreSQL migration** (`prisma migrate deploy` / `migrate dev`) — DEFERRED (inherited from TASK-000). No container runtime is available; Docker is not installed automatically. The migration SQL was generated offline via `prisma migrate diff` and validated statically.

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
