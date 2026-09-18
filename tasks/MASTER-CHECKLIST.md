# Lemdiklat LMS — Master Checklist

Dokumen ini dibuat ulang sebagai recovery governance setelah folder `tasks/` diperbarui dengan implementation specification v2.

## Workflow Rules

- Ikuti `AGENTS.md` sebelum memilih atau mengerjakan task.
- Kerjakan satu implementation task pada satu waktu.
- Codex boleh mengubah status task menjadi `IN PROGRESS`, `REVIEW`, atau `BLOCKED`.
- Codex tidak boleh menandai implementation task sebagai `DONE`; status `DONE` membutuhkan human/architecture review.
- Task dengan status `DONE-WITH-DEFERRED` memenuhi dependency development bila deferred verification terdokumentasi dan tidak menjadi dependency teknis langsung untuk task berikutnya.
- Deferred infrastructure verification wajib diselesaikan sebelum integration testing, UAT, atau production readiness.

## Foundation Status

TASK-000 berstatus `DONE-WITH-DEFERRED`.

Verification PASS:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Prisma `db:validate`
- Prisma `db:generate`

Verification DEFERRED:

- Docker Compose runtime
- PostgreSQL container runtime
- Redis container runtime
- MinIO container runtime
- Keycloak container runtime

Deferred verification tersebut bukan blocker untuk development task berikutnya selama task berikutnya tidak bergantung langsung pada runtime infra tersebut.

## Task Checklist

| Task | Specification | Status | Dependency |
| --- | --- | --- | --- |
| TASK-000 | `tasks/TASK-000-foundation.md` | DONE-WITH-DEFERRED | None |
| TASK-001 | `tasks/TASK-001-organization.md` | DONE-WITH-DEFERRED | TASK-000 = DONE atau DONE-WITH-DEFERRED |
| TASK-002 | `tasks/TASK-002-person-user.md` | DONE | TASK-001 = DONE |
| TASK-003 | `tasks/TASK-003-auth-keycloak.md` | DONE-WITH-DEFERRED | TASK-002 = DONE |
| TASK-004 | `tasks/TASK-004-role-permission.md` | DONE-WITH-DEFERRED | TASK-003 = DONE |
| TASK-005 | `tasks/TASK-005-scope.md` | DONE-WITH-DEFERRED | TASK-004 = DONE atau DONE-WITH-DEFERRED |
| TASK-006 | `tasks/TASK-006-audit.md` | DONE-WITH-DEFERRED | TASK-005 = DONE-WITH-DEFERRED |
| TASK-007 | `tasks/TASK-007-admin-foundation-ui.md` | DONE-WITH-DEFERRED | TASK-001, TASK-002, TASK-004, TASK-005 = DONE |
| TASK-010 | `tasks/TASK-010-academic-program.md` | DONE-WITH-DEFERRED | TASK-005 = DONE |
| TASK-011 | `tasks/TASK-011-curriculum-subject.md` | DONE-WITH-DEFERRED | TASK-010 = DONE |
| TASK-012 | `tasks/TASK-012-batch.md` | DONE-WITH-DEFERRED | TASK-011 = DONE |
| TASK-013 | `tasks/TASK-013-class.md` | DONE-WITH-DEFERRED | TASK-012 = DONE |
| TASK-014 | `tasks/TASK-014-class-subject.md` | DONE-WITH-DEFERRED | TASK-013 = DONE |
| TASK-015 | `tasks/TASK-015-enrollment.md` | DONE-WITH-DEFERRED | TASK-013 = DONE |
| TASK-016 | `tasks/TASK-016-educator-assignment.md` | DONE-WITH-DEFERRED | TASK-014 = DONE |
| TASK-017 | `tasks/TASK-017-academic-scheduling.md` | DONE-WITH-DEFERRED | TASK-014 = DONE |
| TASK-020 | `tasks/TASK-020-learning.md` | DONE-WITH-DEFERRED | TASK-014 = DONE |
| TASK-021 | `tasks/TASK-021-learning-activity-content.md` | DONE-WITH-DEFERRED | TASK-020 = DONE |
| TASK-022 | `tasks/TASK-022-file-management.md` | DONE-WITH-DEFERRED | TASK-000 = DONE-WITH-DEFERRED atau DONE |
| TASK-023 | `tasks/TASK-023-learning-progress.md` | DONE-WITH-DEFERRED | TASK-021 = DONE dan TASK-015 = DONE |
| TASK-024 | `tasks/TASK-024-assignment-submission.md` | DONE-WITH-DEFERRED | TASK-021, TASK-022, TASK-015 = DONE |
| TASK-025 | `tasks/TASK-025-educator-learning-ui.md` | DONE-WITH-DEFERRED | TASK-020, TASK-021, TASK-024 = DONE |
| TASK-026 | `tasks/TASK-026-student-learning-ui.md` | DONE-WITH-DEFERRED | TASK-023, TASK-024 = DONE |
| TASK-030 | `tasks/TASK-030-attendance.md` | DONE-WITH-DEFERRED | TASK-017 dan TASK-015 = DONE |
| TASK-031 | `tasks/TASK-031-attendance-correction-audit.md` | DONE-WITH-DEFERRED | TASK-030 dan TASK-006 = DONE |
| TASK-032 | `tasks/TASK-032-attendance-ui.md` | DONE-WITH-DEFERRED | TASK-031 = DONE |
| TASK-033 | `tasks/TASK-033-attendance-summary.md` | DONE-WITH-DEFERRED | TASK-031 = DONE |
| TASK-040 | `tasks/TASK-040-assessment.md` | DONE-WITH-DEFERRED | TASK-014 = DONE |
| TASK-041 | `tasks/TASK-041-question-bank.md` | DONE | TASK-040 = DONE |
| TASK-042 | `tasks/TASK-042-exam.md` | DONE | TASK-041 = DONE |
| TASK-043 | `tasks/TASK-043-exam-session.md` | DONE | TASK-042 dan TASK-015 = DONE |
| TASK-044 | `tasks/TASK-044-attempt-runtime.md` | DONE | TASK-043 = DONE |
| TASK-045 | `tasks/TASK-045-autosave.md` | DONE | TASK-044 = DONE |
| TASK-046 | `tasks/TASK-046-auto-manual-scoring.md` | DONE | TASK-045 = DONE |
| TASK-047 | `tasks/TASK-047-educator-exam-ui.md` | IN PROGRESS | TASK-042, TASK-043, TASK-046 = DONE |
| TASK-048 | `tasks/TASK-048-student-exam-ui.md` | NOT STARTED | TASK-044, TASK-045 = DONE |
| TASK-049 | `tasks/TASK-049-exam-load-security-tests.md` | NOT STARTED | TASK-044, TASK-045, TASK-046 = DONE |
| TASK-050 | `tasks/TASK-050-grading.md` | NOT STARTED | TASK-040 dan TASK-024/046 sesuai component yang dipakai = DONE |
| TASK-051 | `tasks/TASK-051-final-grade.md` | NOT STARTED | TASK-050 = DONE |
| TASK-052 | `tasks/TASK-052-graduation.md` | NOT STARTED | TASK-051 dan TASK-033 = DONE |
| TASK-053 | `tasks/TASK-053-graduation-decision.md` | NOT STARTED | TASK-052 = DONE |
| TASK-054 | `tasks/TASK-054-certificate.md` | NOT STARTED | TASK-053 dan TASK-022 = DONE |
| TASK-055 | `tasks/TASK-055-certificate-revocation.md` | NOT STARTED | TASK-054 dan TASK-006 = DONE |
| TASK-060 | `tasks/TASK-060-reporting.md` | NOT STARTED | Core source domains minimal: enrollment, learning progress, attendance, final grade/graduation = DONE |
| TASK-061 | `tasks/TASK-061-executive-overview-api.md` | NOT STARTED | TASK-060 dan TASK-005 = DONE |
| TASK-062 | `tasks/TASK-062-organization-program-drill-down.md` | NOT STARTED | TASK-061 = DONE |
| TASK-063 | `tasks/TASK-063-attendance-learning-performance-kpis.md` | NOT STARTED | TASK-060 = DONE |
| TASK-064 | `tasks/TASK-064-graduation-trend-reporting.md` | NOT STARTED | TASK-060 dan TASK-053 = DONE |
| TASK-065 | `tasks/TASK-065-executive-ui.md` | NOT STARTED | TASK-061, TASK-062, TASK-063, TASK-064 = DONE |

## Reviewer Decision — TASK-005 approved (2026-09-16)

Human review confirmed that all three blocking findings from the 2026-09-16 code review are closed:

- `PermissionGuard` is a global `APP_GUARD`, runs after `JwtAuthGuard`, and is fail closed.
- Authorization/assignment endpoints declare explicit permission policies.
- `users/:userAccountId/...` endpoints use `@RequireSelfOrPermission`, so self-read and cross-user read are distinguished.
- Non-`ORGANIZATION` scopes are rejected with `400` until the owning domain validator is available.
- New security tests cover 401/403, cross-user denial, fail-closed routes, and invalid scopes.

Reviewer verification from the repo root: `pnpm lint`, `pnpm typecheck`, `pnpm test` (61 API + 2 api-client), `pnpm build`, `db:validate`, `db:generate` → PASS.

**Final status: TASK-005 = `DONE-WITH-DEFERRED`.** Accepted deferrals: runtime PostgreSQL migration, runtime Keycloak realm/audience verification, and the non-blocking carry-forward items below. This satisfies the dependency for TASK-006, TASK-007, and TASK-010.

## Next Eligible Development Task

TASK-007 (`tasks/TASK-007-admin-foundation-ui.md`) is the next eligible development task after user/reviewer approval of TASK-006 as `DONE-WITH-DEFERRED` on 2026-09-16.

Status note (2026-09-17, chained under standing user permission): TASK-020, TASK-021, TASK-022, TASK-023, and TASK-024 have been implemented, verified, and moved to `REVIEW`. TASK-022 (File Management) verification: `pnpm lint` (11), `pnpm typecheck` (14), `pnpm build` (11), `pnpm test` (132 API + 2 api-client = 134, 0 fail), `db:validate`, `db:generate` → PASS; migration `apps/api/prisma/migrations/20260926000000_task_022_stored_file/`. TASK-023 (Learning Progress) verification: `pnpm lint` (11), `pnpm typecheck` (14), `pnpm build` (11), `pnpm test` (**140 API + 2 api-client = 142**, 0 fail), `db:validate`, `db:generate` → PASS; migration `apps/api/prisma/migrations/20260927000000_task_023_learning_progress/`. TASK-024 (Assignment & Submission) verification: `pnpm lint` (11), `pnpm typecheck` (14), `pnpm build` (11), `pnpm test` (**159 API + 2 api-client = 161**, 0 fail; 19 new tests in `apps/api/test/assignments.test.cjs`), `db:validate`, `db:generate` → PASS; migration `apps/api/prisma/migrations/20260928000000_task_024_assignment_submission/` (4 model, 2 enum, 13 route di atas dua controller). Deferred for all three: runtime PostgreSQL migration (TASK-022 also defers the live MinIO/S3 runtime path).

Next eligible development tasks after TASK-024: TASK-025 (`tasks/TASK-025-educator-learning-ui.md`, needs TASK-020/021/024), TASK-026 (`tasks/TASK-026-student-learning-ui.md`, needs TASK-023/024), and TASK-030 (`tasks/TASK-030-attendance.md`, needs TASK-017/015).

Status note (2026-09-17, chained under standing user permission): TASK-025 (Educator Learning UI) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm test` (**159 API + 2 api-client = 161**, 0 fail), `pnpm --filter @lms/educator build` (`next build`, Next.js 16.3.5/Turbopack, compiled successfully in 7.1s; routes `/`, `/aktivitas`, `/kelas`, `/pemantauan`, `/pertemuan`, `/tugas`) → PASS. No schema change, no migration (task declares no new persistence). Two defects fixed in this session in `apps/educator/src/features/learning/actions.ts`: a dangling `export type { AssignmentSubmission };` re-export with no import (TS2304, zero references — removed) and a Prettier formatting failure. Deferred: educator runtime end-to-end against a live API + Keycloak (no Docker/container runtime available; not installed automatically) — not a blocker since the educator production build, typecheck, and API-contract consumption are all statically verified.

Status note (2026-09-17, chained under standing user permission): TASK-026 (Student Learning UI) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm test` (**159 API + 2 api-client = 161**, 0 fail), `pnpm --filter @lms/student build` (`next build`, Next.js 16.3.5/Turbopack, compiled successfully; routes `/`, `/kemajuan`, `/materi`, `/tugas`), `pnpm build` (all 11 packages compiled successfully), `db:validate` & `db:generate` → PASS. No schema change, no migration (task declares no new persistence). Expanded `@lms/api-client` with typed contracts for enrollments, files, learningProgress mutations, and submissions. Deferred: student runtime end-to-end against a live API + Keycloak (no Docker/container runtime available; not installed automatically).

Next eligible development task after TASK-026: TASK-030 (`tasks/TASK-030-attendance.md`, needs TASK-017/015).

Status note (2026-09-17, chained under standing user permission): TASK-030 (Attendance Session & Record) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` (**161 API + 2 api-client = 163**, 0 fail; 2 new tests in `apps/api/test/attendance.test.cjs`), `db:validate`, `db:generate` → PASS. Migration `apps/api/prisma/migrations/20260929000000_task_030_attendance/` (2 tables, 3 enums, 5 FK, unique `session_id+enrollment_id`; 9 routes at `/api/v1/attendance`). Deferred: runtime PostgreSQL migration execution (no container runtime available; not installed automatically). Next eligible development task after TASK-030: TASK-031 (`tasks/TASK-031-attendance-correction-audit.md`, needs TASK-030 and TASK-006).

Status note (2026-09-17, chained under standing user permission): TASK-031 (Attendance Correction & Audit) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` (**165 API + 2 api-client = 167**, 0 fail; 4 new tests in `apps/api/test/attendance-corrections.test.cjs`), `db:validate`, `db:generate` → PASS. Migration `apps/api/prisma/migrations/20260930000000_task_031_attendance_correction/` (1 table, 1 enum, 3 FK, 4 index, plus `BEFORE UPDATE`/`BEFORE DELETE` append-only triggers); 4 routes at `/api/v1/attendance-corrections`. Correction writes are atomic (log row + record status in one transaction) and denials are side-effect free. Deferred: runtime PostgreSQL migration execution and live trigger behaviour (no container runtime available; not installed automatically). Next eligible development task after TASK-031: TASK-032 (`tasks/TASK-032-attendance-ui.md`) or TASK-033 (`tasks/TASK-033-attendance-summary.md`), both needing TASK-031.

Status note (2026-09-17, chained under standing user permission): TASK-032 (Attendance UI) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful, `pnpm --filter @lms/educator build` compiled successfully in Next.js 16.3.5 Turbopack with routes `/`, `/aktivitas`, `/kehadiran`, `/kelas`, `/pemantauan`, `/pertemuan`, `/tugas`), `pnpm test` (**165 API + 2 api-client = 167**, 0 fail), `db:validate`, `db:generate` → PASS. Expanded `@lms/api-client` with typed contracts for attendance sessions, records, and corrections. Deferred: educator runtime end-to-end against a live API + Keycloak (no container runtime available; not installed automatically). Next eligible development task after TASK-032: TASK-033 (`tasks/TASK-033-attendance-summary.md`, needs TASK-031).

Status note (2026-09-18, chained under standing user permission): TASK-033 (Attendance Summary) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm test` (**180 API + 2 api-client = 182**, 0 fail; 14 new tests in `apps/api/test/attendance-summary.test.cjs`), `pnpm build` (11/11 successful), `db:validate`, `db:generate` → PASS. Migration `apps/api/prisma/migrations/20261001000000_task_033_attendance_summary/` (1 table, 1 enum, 1 unique + 7 index, no FK deliberately: a summary is derived data and must not block or cascade a domain delete). New reporting read model `attendance_summaries` keyed by unique `(scopeType, scopeId)`, covering `ENROLLMENT`, `ENROLLMENT_SUBJECT`, `CLASS_SUBJECT`, `CLASS`, `BATCH`, `PROGRAM`. 7 routes at `/api/v1/attendance-summary` gated by `attendance.summary.read` / `attendance.summary.refresh`. Denominator rule: only `CLOSED` sessions are eligible; a closed session without a record counts as ABSENT; a group scope is the exact participant-weighted sum of the personal scopes inside it. Refresh is idempotent and bound to attendance writes, session CLOSE/CANCEL transitions, and corrections, so a report never shows a stale figure. The reporting read path is a single indexed lookup — a test asserts repeated reads do not re-run the raw calculation. Deferred: runtime end-to-end against a live PostgreSQL + Keycloak (no container runtime available; not installed automatically); not a technical blocker as the counting rules are covered by an in-memory Prisma double. Next eligible development task after TASK-033: TASK-040 (`tasks/TASK-040-assessment.md`, needs TASK-014).

Status note (2026-09-18, chained under standing user permission): TASK-040 (Assessment Foundation) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm test` (**193 API + 2 api-client = 195**, 0 fail; 13 new tests in `apps/api/test/assessments.test.cjs`), `pnpm build` (11/11 successful), `db:validate` ("schema is valid 🚀"), `db:generate` → PASS. Migration `apps/api/prisma/migrations/20261002000000_task_040_assessment/` (2 tables `assessment_types`/`assessments`, 1 enum `AssessmentStatus`, 3 FK, 7 index) and it **seeds the six baseline types** QUIZ/EXAM/ASSIGNMENT/PRACTICAL/OBSERVATION/COMPETENCY with `ON CONFLICT (code) DO NOTHING` — types are data-driven rows, never an enum in code, so a new method needs no schema or service change. `Assignment.assessmentId` was a bare UUID column with no relation; it is now a real optional FK (`ON DELETE SET NULL`, indexed), honest for TASK-024's assignment↔assessment link. 9 routes at `/api/v1/assessment-types` and `/api/v1/assessments` gated by `assessment.type.read` / `assessment.type.manage` / `assessment.read` / `assessment.manage` (Permission + Scope only, no role-name branching). Lifecycle `DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED` with `PUBLISHED -> DRAFT` allowed as a correction and `CLOSED`/`ARCHIVED` one-way; illegal edges are 422 and a same-status request is an idempotent no-op with no audit write. A `PUBLISHED`/`CLOSED` assessment is **protected from destructive mutation**: `maxScore` and `weight` are frozen (422 naming the field) on both `PATCH /assessments/:id` and the status endpoint, and unpublishing is the documented way to unlock them. `maxScore` required `> 0`, `weight` nullable but `> 0` when set (`null` = not yet weighted, distinct from `0`), availability window must be ordered even when only one edge moves, and an `INACTIVE` type or a non-`ACTIVE` class subject blocks selection/publishing. Deferred: runtime end-to-end against a live PostgreSQL + Keycloak (no container runtime available; not installed automatically); not a technical blocker as every rule is covered by tests driving the real services. Next eligible development task after TASK-040: TASK-041 (`tasks/TASK-041-question-bank.md`, needs TASK-040).

Status note (2026-09-18, chained under standing user permission): TASK-041 (Question Bank & Versioning) has been implemented, verified, and moved to `REVIEW`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm test` (**206 API + 2 api-client = 208**, 0 fail; 13 new tests in `apps/api/test/question-banks.test.cjs`), `pnpm build` (11/11 successful), `db:validate` ("schema is valid 🚀"), `db:generate` → PASS. Migration `apps/api/prisma/migrations/20261003000000_task_041_question_bank/` (5 tables `question_banks`/`question_types`/`questions`/`question_versions`/`question_options`, 1 enum `QuestionVersionStatus`, 5 FK, 14 index) and it **seeds the five baseline question types** SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE/ESSAY/SHORT_ANSWER with `ON CONFLICT (code) DO NOTHING` — option validation is DATA-DRIVEN through `has_options`/`multi_select`, so no service code compares a type against a string code. 15 routes at `/api/v1/question-banks`, `/api/v1/question-types`, and `/api/v1/questions` gated by `question.bank.read` / `question.bank.manage` / `question.type.read` / `question.read` / `question.manage` / `question.participate` (Permission + Scope only, no role-name branching). **Version immutability is structural**: `(question_id, version)` is unique, only a DRAFT version can be edited (a PUBLISHED or SUPERSEDED row answers 422 and directs the caller to create a new version), and publishing a new version supersedes the previous one in ONE transaction so a question never has two published versions or none. The **student-safe projection is a separate DTO and a separate permission** (`question.participate`) built from an explicit allow-list — `isCorrect`, `value`, `scoringRule` and `explanation` are not properties of it at all, and the leak test walks the whole payload plus its JSON serialization to prove none can appear; a DRAFT version is never readable, while PUBLISHED/SUPERSEDED versions stay readable so a historical attempt renders exactly what the participant saw. Audit snapshots deliberately omit the answer key. Deferred: runtime end-to-end against a live PostgreSQL + Keycloak (no container runtime available; not installed automatically); not a technical blocker as the immutability, option-validation, and leak rules are covered by in-memory repository doubles. Next eligible development task after TASK-041: TASK-042 (`tasks/TASK-042-exam.md`, needs TASK-041).

Closed TASK-005 fix summary (kept for history):

- `PermissionGuard` is a global `APP_GUARD` and is fail closed: routes need `@RequirePermissions`, `@RequireScope`, `@RequireSelfOrPermission`, `@AllowAuthenticated`, or `@Public`; anything else is rejected with `403`.
- Sensitive authorization endpoints declare explicit Permission + Scope policies; the RBAC catalogue is never authentication-only.
- Subject-scoped reads are self-service from the token identity, and cross-user reads require `authorization.effective_permission.read`.
- Scope types whose owning domain cannot validate existence (`PROGRAM`, `BATCH`, `CLASS`, `CLASS_SUBJECT`) are rejected instead of persisted as orphan rows.

### Carried-forward risk (from TASK-005 review fix)

- `OrganizationsController`, `PersonsController`, and `UserAccountsController` currently use the explicit `@AllowAuthenticated()` allow-list (equivalent to the reviewed TASK-001/TASK-002 authentication-only baseline). Their owning domain tasks must replace it with `@RequirePermissions(...)` before production readiness.
- No seeded role yet holds the `authorization.*` permissions, so authorization endpoints correctly return `403` until an administrator role is created and assigned.

### Outstanding deferred work (not a task substitute)

- Runtime PostgreSQL migration, inherited from TASK-000, TASK-001, TASK-002, TASK-003, TASK-004, and TASK-005. This includes TASK-004 migration `apps/api/prisma/migrations/20260916000300_task_004_role_permission/` and TASK-005 migration `apps/api/prisma/migrations/20260916000400_task_005_role_assignment_scope/` and TASK-006 migration `apps/api/prisma/migrations/20260916000500_task_006_audit/`. Must be cleared before integration testing, UAT, or production readiness.
- Runtime Keycloak against a real realm (TASK-003).
- Audience mapper/client audience Keycloak verification (TASK-003).
