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
| TASK-008 | `tasks/TASK-008-admin-operational-ui.md` | REVIEW | TASK-007 = DONE-WITH-DEFERRED |
| TASK-009 | `tasks/TASK-009-admin-person-user-ui.md` | REVIEW | TASK-008 = REVIEW |
| TASK-009A | `tasks/TASK-009A-admin-sidebar-routing.md` | REVIEW | TASK-009 = REVIEW |
| TASK-009B | `tasks/TASK-009B-admin-role-assignment-scope-ui.md` | REVIEW | TASK-009A = REVIEW |
| TASK-009C | `tasks/TASK-009C-admin-enterprise-shell-dashboard.md` | REVIEW | TASK-009B = REVIEW |
| TASK-009D | `tasks/TASK-009D-admin-enterprise-design-system-foundation-polish.md` | REVIEW | TASK-009C = REVIEW |
| TASK-009E | `tasks/TASK-009E-admin-organization-management-table-ux.md` | REVIEW | TASK-009D = REVIEW |
| TASK-009F | `tasks/TASK-009F-admin-organization-scalable-operator-ux.md` | REVIEW | TASK-009E = REVIEW |
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
| TASK-047 | `tasks/TASK-047-educator-exam-ui.md` | DONE | TASK-042, TASK-043, TASK-046 = DONE |
| TASK-048 | `tasks/TASK-048-student-exam-ui.md` | DONE | TASK-044, TASK-045 = DONE |
| TASK-049 | `tasks/TASK-049-exam-load-security-tests.md` | DONE | TASK-044, TASK-045, TASK-046 = DONE |
| TASK-050 | `tasks/TASK-050-grading.md` | DONE | TASK-040 dan TASK-024/046 sesuai component yang dipakai = DONE |
| TASK-051 | `tasks/TASK-051-final-grade.md` | DONE | TASK-050 = DONE |
| TASK-052 | `tasks/TASK-052-graduation.md` | DONE | TASK-051 dan TASK-033 = DONE |
| TASK-053 | `tasks/TASK-053-graduation-decision.md` | DONE | TASK-052 = DONE |
| TASK-054 | `tasks/TASK-054-certificate.md` | DONE | TASK-053 dan TASK-022 = DONE |
| TASK-055 | `tasks/TASK-055-certificate-revocation.md` | DONE | TASK-054 dan TASK-006 = DONE |
| TASK-060 | `tasks/TASK-060-reporting.md` | DONE | Core source domains minimal: enrollment, learning progress, attendance, final grade/graduation = DONE |
| TASK-061 | `tasks/TASK-061-executive-overview-api.md` | DONE | TASK-060 dan TASK-005 = DONE |
| TASK-062 | `tasks/TASK-062-organization-program-drill-down.md` | REVIEW | TASK-061 = DONE |
| TASK-063 | `tasks/TASK-063-attendance-learning-performance-kpis.md` | REVIEW | TASK-060 = DONE |
| TASK-064 | `tasks/TASK-064-graduation-trend-reporting.md` | NOT STARTED | TASK-060 dan TASK-053 = DONE |
| TASK-065 | `tasks/TASK-065-executive-ui.md` | NOT STARTED | TASK-061, TASK-062, TASK-063, TASK-064 = DONE |
| TASK-066 | `tasks/TASK-066-educator-portal-alignment.md` | DONE | TASK-025 = DONE-WITH-DEFERRED, TASK-047 = DONE |
| TASK-067 | `tasks/TASK-067-production-zero-downtime-deployment.md` | REVIEW | TASK-000 = DONE-WITH-DEFERRED |

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

Status note (2026-09-18, chained under standing user permission): TASK-047 (Educator Exam UI) has been reviewed, enhanced, verified, and approved as `DONE`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful, including `@lms/educator`), `pnpm test` (**217 API + 5 api-client = 222**, 0 fail) → PASS. Created and integrated full question bank authoring panel (`apps/educator/src/features/exam/question-bank-panel.tsx`), blueprint editor (`apps/educator/src/features/exam/blueprint-editor.tsx`), session & participant management (`apps/educator/src/features/exam/session-panel.tsx`), and grading panel (`apps/educator/src/features/exam/grading-panel.tsx`) unified in `/exam`. Expanded `@lms/api-client` with question banks, question types, questions, blueprint rule inputs, and 3 new client tests. Deferred: runtime educator browser interaction against a live Keycloak + API (no Docker/container runtime available).

Next eligible development task after TASK-047: TASK-048 (`tasks/TASK-048-student-exam-ui.md`, needs TASK-044, TASK-045).

Status note (2026-09-18, chained under standing user permission): TASK-048 (Student Exam UI) has been implemented, verified, reviewed, and approved as `DONE`. Verification: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful, including `@lms/student` route `/ujian`), `pnpm test` (**219 API + 6 api-client = 225**, 0 fail) → PASS. Added `/ujian` server component plus `exam-runtime.tsx` (sticky server-derived countdown, question navigator, per-question autosave status, submit confirmation with unanswered count), `exam-start-form.tsx`, framework-free helpers in `exam-view.ts`, and server actions in `actions.ts`; `/ujian` was added to the shared student navigation. Refresh/resume re-reads the attempt from the server, so no answer is cached in the browser and the revision sent on each write is the one the server acknowledged.

**Security fix carried by this task:** the TASK-044 attempt read path used a Prisma `include` that returned the whole `QuestionVersion` row, delivering `scoringRule` (the answer key) and `explanation` to the examinee on start/get/submit; TASK-044 asserted "no answer leak" but had no test behind it. Fixed with two independent defences — `ATTEMPT_SELECT` (an explicit `select` that never fetches the forbidden fields) and `toStudentAttempt()` (an allow-list builder that never spreads or deletes) — plus regression tests that walk the full payload and its JSON serialization for `scoringRule`/`explanation`/`isCorrect`/`correctKeys`/`maxScore`. No new persistence.

**Expiry gap closed in review:** the countdown originally only *displayed* expiry, and since the server leaves an attempt `IN_PROGRESS` until a submit arrives, an abandoned open tab would have kept the attempt open and made the `EXPIRED` message unreachable. The one-second tick now finalizes the attempt when the server deadline passes (skipping the pending-edit flush, which the API would reject), with an `inFlight` ref so a manual and an automatic submit cannot both fire.

Deferred: student browser runtime against a live Keycloak + API, including a real mid-attempt refresh and timer expiry (no Docker/container runtime available). `apps/student` has no test runner, so the runtime is covered by the shared `@lms/api` / `@lms/api-client` suites.

Next eligible development task after TASK-048: TASK-049 (`tasks/TASK-049-exam-load-security-tests.md`, needs TASK-044, TASK-045, TASK-046).

Status note (2026-09-19): TASK-049, TASK-050, and TASK-051 are `DONE`. TASK-052 (Graduation Rules & Evaluation) has been implemented and verified, and is moved to `REVIEW` awaiting human approval — Codex must not mark it `DONE`.

**Prerequisite gap found and closed during TASK-052.** Before starting TASK-052, an audit of the migration directory showed that **TASK-050 and TASK-051 were marked `DONE` without any Prisma migration, controller endpoint, or audit-catalogue entries.** The Prisma models (`GradingScheme`, `GradingComponent`, `FinalGrade`) existed in `schema.prisma`, and their logic passed tests because the tests drive fake in-memory repositories — so the suite was green while the tables did not exist in the database, the scheme/component configuration had no HTTP surface at all, and the final-grade routes were unreachable. This violated the "perubahan database memakai Prisma migration" rule in `AGENTS.md`. With reviewer approval the gap was closed in this session:

- `apps/api/prisma/migrations/20261009000000_task_050_grading/migration.sql` — `grading_schemes`, `grading_components`, `GradingSchemeStatus`, unique `(scheme_id, assessment_id)`.
- `apps/api/prisma/migrations/20261009000100_task_051_final_grade/migration.sql` — `final_grades`, `FinalGradeStatus`, unique `(enrollment_id, class_subject_id)`.
- Added the missing routes: `POST/GET /grading-schemes`, `GET /grading-schemes/:id`, `POST /grading-schemes/:id/components`, plus `POST /final-grades/calculate|recalculate`, `POST /final-grades/:id/approve|reopen`, `GET /final-grades/:id`; new controllers registered in `GradingModule` / `FinalGradesModule`.
- Added the missing audit vocabulary: `grading_scheme.*`, `grading_component.created`, `final_grade.calculated|approved|reopened` and their resource types; the service now uses the catalogue instead of inline string literals.
- Fixed a real defect in `PrismaFinalGradesRepository.listAssessmentScores`, which returned a hardcoded `score: 0` for every assessment, making every weighted final grade wrong. It now aggregates real scores from graded assignment submissions (TASK-024) and scored exam attempts (TASK-044), normalized to 0–100 against the assessment's `maxScore`, taking the best result per assessment and treating ungraded work as a missing component rather than a silent zero.
- Added `FinalGradesService.reopen`, so an `APPROVED` grade returns to `REOPENED` with its own audit action instead of being silently recalculated.

Fidelity of all three new migrations was verified statement-by-statement against the canonical SQL from `prisma migrate diff --from-empty --to-schema-datamodel`, so the hand-written SQL provably matches what Prisma would have generated.

TASK-052 details: four models (`GraduationRule`, `GraduationRuleComponent`, `GraduationEvaluation`, `GraduationEvaluationDetail`) with rules versioned on `(education_batch_id, code, version)`. The evaluator (`graduation-rules.ts`) is a **pure function**, which is what makes a stored snapshot reproducible. Evaluation is kept separate from the formal decision (TASK-053), a published rule is frozen, re-evaluation writes a new row and marks the previous one `SUPERSEDED` rather than deleting it, and a missing observation fails its component instead of passing as zero. Fourteen tests cover rule-component validation, threshold boundaries, missing-observation behaviour, optional components, snapshot reproducibility, supersede-don't-delete history, batch isolation, and audit emission.

Verification for TASK-052: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` → **262 API + 6 api-client, 0 fail**, `db:validate` and `db:generate` PASS.

Deferred: runtime `prisma migrate deploy` against a real PostgreSQL (no Docker/container runtime available; not installed automatically). Not a technical blocker — migration validity is evidenced by the canonical-SQL comparison above.

Carry-forward risk: `loadEvaluationContext` reads `attendance_summaries` (TASK-033) for the attendance component. If a summary has never been computed for an enrollment, the attendance component fails with an explicit note (deliberate fail-closed behaviour), so an operator must refresh summaries before evaluating a cohort.

TASK-053 is DONE (approved 2026-09-19).

TASK-053 details: one new model, `GraduationDecision` (`graduation_decisions`), with `graduation_evaluation_id` **UNIQUE** — one evaluation carries at most one decision, so "no decision without evaluation" holds at the schema level as well as in the service. `decision` is an enum (`PASS`, `FAIL`, `REMEDIAL`, `WITHDRAWN`) and `status` is a lifecycle (`DRAFT → APPROVED → REVOKED`) that is deliberately a straight line: `REVOKED` is terminal because re-opening a withdrawn decision would erase the fact that it was once withdrawn. A **correction** is not a status move — it changes the verdict while the status stays `APPROVED`, and the previous verdict survives in the audit entry's `before`. There is **no DELETE anywhere**: no `delete` method exists on the repository or the service, so history is reconstructible by construction.

The decision is kept in its own module (`src/graduation-decisions/`) rather than folded into the evaluation module, because an evaluation is a computed judgement while a decision is a formal human act with an author and a date; separating them is what lets a decision survive a re-evaluation. The module exports its service and repository token so TASK-054 (certificates) can consume a decision without pulling in the evaluator.

Four permissions rather than one umbrella — `graduation.decision.read|record|approve|revoke` — because the task spec calls this workflow "authorization sensitif": the act that puts a verdict in force should be grantable separately from the act that merely enters it. New audit vocabulary: `graduation_decision.created|approved|corrected|revoked` plus the `graduation_decision` resource type.

Sixteen tests cover the four acceptance criteria and every lifecycle guard: no decision without an existing evaluation, no decision against a superseded or pending evaluation, one decision per evaluation, approval exactly once, no revocation before approval, a required revocation reason, `REVOKED` being final, corrections preserving the prior verdict in the audit trail, and reads returning the evidence the decision rests on. One of these tests caught a real fake-repository fidelity bug — the fake returned its stored object reference, so a later mutation retroactively changed an earlier read; it now clones per query, matching Prisma.

Migration: `apps/api/prisma/migrations/20261009000300_task_053_graduation_decision/migration.sql`, verified statement-by-statement against the canonical SQL from `prisma migrate diff --from-empty --to-schema-datamodel` (12/12 verbatim).

Verification for TASK-053: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` → **278 API + 6 api-client, 0 fail**, `db:validate` PASS.

Approved by the reviewer (2026-09-19) with three design decisions consciously accepted rather than changed: (1) `PATCH /:id/correct` shares the `graduation.decision.approve` permission, because correcting an in-force decision is the same class of authority as putting it in force; (2) the deciding/approving/revoking user columns are not existence-validated in the service, relying on the database `Restrict` foreign keys, matching the TASK-052 precedent; (3) the `as never` enum mapping follows the existing `graduation.service.ts` precedent. Each remains a clear change point if a later task needs different behaviour.

TASK-054 is DONE (approved 2026-09-19).

TASK-054 details: two new models. `CertificateTemplate` (`certificate_templates`) is versioned on `(code, version)` **UNIQUE**, so a certificate issued last year still names the exact template version it was printed from; editing an in-use template in place would silently rewrite history, so the design is a new version instead. `Certificate` (`certificates`) has `decision_id` **UNIQUE** — one graduation decision yields at most one certificate, which makes "only an approved PASS decision can be certified" a structural property rather than a rule someone must remember. The template artwork lives in object storage (`template_object_key`, TASK-022) and the rendered PDF is referenced by `file_id`; **no binary ever enters PostgreSQL**.

Two independent CSPRNG values are stored. `certificateNumber` is the human-facing identifier (`CERT-2026-XXXXXXXXXX`); `verificationCode` is the lookup key for the public endpoint. Both are drawn with **rejection sampling rather than `% alphabet.length`**, because plain modulo over 256 makes the first `256 % 31` symbols more likely and would shrink the effective entropy of a short code. The alphabet omits look-alikes (`0`, `1`, `I`, `L`, `O`) since these values are read off a printed document and typed by hand. Collisions are retried a bounded number of times and then fail loudly, because exhausting the retries means the generator is broken rather than that we were unlucky.

The public verification endpoint is the one genuinely unauthenticated route in this module, so it is `@Public()` and returns a **fixed minimal projection** — `valid`, `status`, `certificateNumber`, `holderName`, `programName`, `batchName`, `templateName`, `templateVersion`, `issuedAt`. A test walks the projection's keys and fails on any unexpected one, which is what stops PII (personnel number, email, phone, enrollment/decision/template ids, the verification code, storage keys) creeping in later. Four permissions rather than one umbrella — `certificate.template.read|manage` and `certificate.read|issue` — because designing a document and minting one are different authorities. New audit vocabulary: `certificate_template.created|updated|status_changed`, `certificate.issued`, `certificate.file_attached`, plus the `certificate_template` and `certificate` resource types. The audit entry for issuance deliberately **omits the verification code**, since a trail readable by many people must not hold the one secret protecting the public lookup.

Twenty-two tests cover the five acceptance criteria: eligibility (draft/revoked decisions, non-PASS verdicts, non-eligible/superseded/pending evaluations all refused; approved PASS accepted), uniqueness (alphabet purity, look-alike exclusion, 500/500 distinct numbers, symbol-frequency balance proving rejection sampling, collision retry, loud failure on exhaustion), the minimal public projection (exact key set plus an explicit no-PII assertion), file storage abstraction (reference only, no bytes, pending files refused), and the template lifecycle (`DRAFT → ACTIVE → ARCHIVED`, `ARCHIVED` terminal, archived templates not editable, no `delete` anywhere).

Migration: `apps/api/prisma/migrations/20261009000400_task_054_certificate/migration.sql`, verified statement-by-statement against the canonical SQL from `prisma migrate diff --from-empty --to-schema-datamodel` (17/17 verbatim).

Verification for TASK-054: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` → **300 API + 6 api-client, 0 fail**, `db:validate` PASS. `prisma migrate deploy` is **DEFERRED** (no Docker/runtime container in this environment); it is not a technical blocker, and the migration was verified verbatim against Prisma's own output.

Open items for the reviewer on TASK-054: (1) `CertificateRevocation` is intentionally **not** created here — the spec assigns it to TASK-055 — but `CertificateStatus.REVOKED`, `revokedReason`/`revokedAt` and the revoked branch of the public projection are already in place, so TASK-055 adds the table, the endpoint and the audit action rather than reshaping anything; (2) the public endpoint returns **`404`** for an unknown code rather than `200 {valid:false}` — this needs confirmation, since the alternative would make "revoked" and "wrong code" indistinguishable in some response shapes.

TASK-055 is DONE (approved 2026-09-19).

TASK-055 details: one new model, `CertificateRevocation` (`certificate_revocations`), holding `certificate_id` (**UNIQUE**), `reason`, `revoked_by_user_id`, `revoked_at`. It is a separate table rather than extra columns on `certificates` for the same reason TASK-053 keeps decisions apart from evaluations: the certificate records what was issued, while this table records who withdrew it, when, and why. `certificate_id` being unique is what makes "first reason wins" structural — a certificate is revoked at most once, so there is one authoritative account instead of an append-only pile a reader would have to interpret. Revocation **withdraws, it does not delete**: the `Certificate` row, its number and its holder all remain, because the holder may still be presenting the printed copy and the institution must be able to prove the document was once legitimately issued. There is **no `delete` and no `update`** on the evidence, so it is immutable like the audit trail (TASK-006).

The status move and the evidence row are written in **one `prisma.$transaction`**, so a certificate can never be found marked `REVOKED` without a recorded reason, nor carry a reason while still reading as `ISSUED`. That matters specifically because the public verification endpoint reports validity: a partial outcome would make it either overstate or understate whether a document is genuine. The reason is mandatory and length-floored (8 characters), validated at the DTO **and** repeated in the domain rules, because the reason is the only part of the record that cannot be reconstructed from anything else — and it is the part an auditor will actually need.

New permission `certificate.revoke`, deliberately separate from `certificate.issue`: telling the world that a document the institution already put its name to is no longer valid is a different authority from creating one, and it should be grantable to a compliance or supervisory function without also handing over issuance. New audit action `certificate.revoked`, recorded with `before.status`/`after.status` and the reason in metadata, so the withdrawal is explicable from the trail alone without joining the domain table.

Twelve tests cover the four acceptance criteria: revoked verification (the public projection flips to `valid:false`, `status: REVOKED` and carries the reason, while holder and number are preserved, plus a no-PII assertion on the revoked shape), history (the certificate row survives with its number and holder, exactly one evidence row, no `delete` anywhere), audit (the `certificate.revoked` entry with its before/after and reason), and the revocation policy (second revocation refused with the first reason intact, empty/whitespace/too-short reasons rejected leaving nothing behind, unknown certificate is a 404, actor defaults to the caller and an explicit revoker overrides it, and a revoked certificate still blocks re-issuance because reinstating is a new decision under a new number).

Migration: `apps/api/prisma/migrations/20261009000500_task_055_certificate_revocation/migration.sql`, verified statement-by-statement against the canonical SQL from `prisma migrate diff --from-empty --to-schema-datamodel` (6/6 verbatim).

Verification for TASK-055: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` → **312 API + 6 api-client, 0 fail**, `db:validate` PASS. `prisma migrate deploy` is **DEFERRED** (no Docker/runtime container in this environment); not a technical blocker, and the migration was verified verbatim against Prisma's own output.

Approved by the reviewer (2026-09-19) for TASK-054 and TASK-055 together. Decisions consciously accepted rather than changed: (1) the public verification endpoint returns `404` for an unknown code rather than `200 {valid:false}`; (2) re-revoking is refused (`409`) under a "first reason wins" policy rather than appending a second evidence row; (3) there is no un-revoke, since reinstating a wrongly withdrawn certificate is a new issuance under a new number. Each remains a clear change point if a later task needs different behaviour.

TASK-060 is DONE (approved 2026-09-19).

TASK-060 details: one new model, `ReportingMetric` (`reporting_metrics`), plus `enum ReportingScopeType` (ORGANIZATION, PROGRAM, BATCH, CLASS, CLASS_SUBJECT, ENROLLMENT). The table is a **derived** read model: the transactional tables stay the source of truth, and every column here is recomputed from them and can be thrown away and rebuilt. Nothing in the reporting module writes a domain row.

The task draws one boundary and defends it. `list`/`find` read **only** `reporting_metrics`; `listScopes`/`readSourceCounts` read **only** the transactional tables and are reached exclusively from a refresh. A report read therefore cannot get slower as enrollments, attendance records and grades accumulate — which is the entire reason the read model exists.

Endpoints: `GET /api/v1/reporting/metrics` and `GET /api/v1/reporting/metrics/:scopeType/:scopeId` behind `reporting.metric.read`, and `POST /api/v1/reporting/refresh` behind `reporting.metric.refresh`. The two permissions are separate because reading a report is routine while rebuilding the read model is a maintenance act that writes derived rows across many scopes at once. A refresh is a route rather than an internal-only call because a scheduled job is not the only way an operator needs to run one — after a backfill or an incident a human needs to trigger it deliberately and see what it did.

Aggregate definitions, documented next to the code that computes them (the spec requires this): **participants** is the enrollment count including withdrawn participants, because a cohort of 40 that lost 3 people is still a cohort of 40; **activeParticipants** is reported alongside rather than instead of it, since "40 enrolled, 37 active" is a different statement from "37 enrolled". **averageProgressPercent** is the mean over *participants*, not over activities — averaging over activities would let one participant with many activities dominate. **attendancePercentage** is `(present + late) / totalSessions` computed from summed counters, not from averaged per-participant percentages, because averaging percentages would let a participant with three sessions outweigh one with thirty. **averageFinalScore** is the mean of stored grades, not of participants, which is what makes it a statement about coursework rather than about people. **gradedCount** and **unapprovedGradeCount** are reported as a pair because an average built on unapproved grades is provisional and a reader needs to see how provisional.

Attendance is read from the pre-aggregated `attendance_summaries` (TASK-033) and progress from `class_subject_progress_aggregates` (TASK-023) rather than from `attendance_records` and `learning_progress`. Those two are the highest-volume tables in the schema; reading their maintained aggregates instead of scanning them is the difference between a report that stays fast and one that degrades every term. Because `attendance_summaries` stops at PROGRAM, an ORGANIZATION's attendance is the **sum of its programs' rows** rather than an independently computed number that could disagree with its parts.

Idempotency comes from recomputing each scope from source and upserting on the `(scopeType, scopeId)` unique key — counters are never accumulated into what is already stored, so a second refresh converges on the same row instead of doubling it. That property is asserted directly rather than assumed.

Decisions worth a reviewer's attention: (1) `GET` for one scope returns **404** when nothing has been refreshed rather than computing on demand — a missing row is operational information, and computing on read would put the cold transactional scan straight back on the read path this task exists to clear; (2) a refresh that hits a failing scope logs and **skips** it rather than aborting, because a partial refresh leaves the model *stale* (easy to reason about, easy to retry) while an aborted one leaves it *half-updated with no record of where it stopped* — the audit entry records both `refreshed` and `attempted` so a partial run is never indistinguishable from a clean one; (3) **no Redis** — `docs/03-data-architecture.md` allows it as a cache but not as a source, and the PostgreSQL read model is already the cheap-read mechanism, so a cache in front of it would add a second place for a stale number to live without removing the first; (4) **no `delete`** on the repository, since a metric row is a derived cache and a scope that disappears simply stops being refreshed — with no delete operation, nothing can erase a report by accident; (5) a scope that does not name its own parent is refused before a row is written, because that parent id is what the TASK-062 drill-down will filter on.

All division lives in pure functions (`deriveMetrics`/`safeAverage`/`safePercentage`) so the averaging policy is testable without a database — which is what the "fixture totals match transactional data" criterion actually needs. Empty scopes report `0`, never `null` or `NaN`: a dashboard rendering `NaN%` is worse than one rendering `0%` beside a zero participant count.

Twenty-two tests cover the four acceptance criteria: fixture totals matching transactional data (ratios checked against hand-computed values, mean-of-participants vs mean-of-grades, present+late as attended with excused/sick/absent excluded, summed-totals vs averaged-percentages, two-decimal rounding, and zero-not-NaN on empty scopes), documented structure (scope nesting, parent-naming, the `(scopeType, scopeId)` key), refresh idempotency (one row, unchanged values, no doubling, stale values overwritten, empty scopes still readable, 404 for an unknown scope, a failing scope skipped with `refreshed` 1 / `attempted` 2 recorded, and an orphan scope refused with zero writes), and the read path (stored model read without recomputing — asserted by an unchanged upsert counter, pagination, 404 for an unrefreshed scope, and ancestry surfaced with the metrics).

New audit action `reporting.refreshed` plus resource type `reporting_metric`.

Migration: `apps/api/prisma/migrations/20261009000600_task_060_reporting/migration.sql`, verified statement-by-statement against the canonical SQL from `prisma migrate diff --from-empty --to-schema-datamodel` (10/10 verbatim: 1 CreateEnum, 1 CreateTable, 8 CreateIndex).

Verification for TASK-060: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` → **334 API + 6 api-client, 0 fail**, `db:validate` PASS. `prisma migrate deploy` is **DEFERRED** (no Docker/runtime container in this environment); not a technical blocker, and the migration was verified verbatim against Prisma's own output.

TASK-061 through TASK-065 were **not** started. Only the reporting boundary is exposed here: a read of stored metrics and a refresh that rebuilds them. `ReportingSnapshot` (historical trend, TASK-064) is deliberately not created yet — the spec marks it optional, and its shape depends on what the trend reporting actually needs to preserve.

TASK-061 is DONE (approved 2026-09-19).

TASK-061 details: the executive overview reads the TASK-060 read model and nothing else, so a dashboard costs the same whether the institution has taught for one term or ten. Two endpoints carry it: `GET /api/v1/reporting/executive/overview` (KPIs plus a paginated breakdown at the requested grain) and `GET /api/v1/reporting/executive/institutions/:organizationId`. Both sit behind a new permission, `reporting.executive.read`, deliberately separate from `reporting.metric.read` — reading the read model at the grain you already administer is a different disclosure from reading the institution-wide view, and one must not imply the other.

The spec's rule is "National vs institution access melalui scope, bukan role string", so the reach of a report is computed from the **scopes attached to the caller's permission grant**, never from a role name. The dangerous version of this rule — a controller deciding how much to show by inspecting which roles the caller holds — rots silently every time a role is renamed or added. Nothing on this path inspects a role code.

The controller passes only `user.accountId`; the grant decides reach and the request only selects a grain. A scoped caller who types `scope=NATIONAL` receives their own institutions with `accessLevel: "SCOPED"` echoed back, because the honest answer names what population the figures cover rather than implying the numbers are national. Empty grant, or a grain outside the grant, is a **403 — not a zeroed dashboard**: a dashboard of zeroes and a denied request are different statements about the institution, and only one of them would be true. Both checks run before a single row is read.

The load-bearing invariant is that `null` and `[]` are never collapsed: a `null` axis means "no restriction here", an empty axis means "nothing here" and matches nothing. Confusing them turns a caller with no grants into a caller with all of them, which is why it is asserted directly.

KPIs are never means of means. Every figure is `sum(total) / sum(denominator)` across the scopes in the roll-up; the tempting shortcut — averaging the `averageProgressPercent` already stored on each row — is wrong in a way a dashboard cannot show, because a class of 8 and a class of 400 would carry identical weight. The stored totals and denominators exist so the file never has to choose between being fast and being right, and a test asserts the naive mean (55) differs from the correct figure (11.76) on the same fixture. Only disjoint levels may be summed — ORGANIZATION, PROGRAM, BATCH, CLASS — because a class subject's roster repeats the class roster once per subject, so summing across subjects would count the same person several times.

Graduation is reported as three separate facts (evaluated / eligible-or-approved / certified) plus a `certificationRate`, so "approved but never certified" stays visible instead of hiding inside one number; only `ISSUED` certificates count, since a revoked certificate is not a graduation. `EXECUTIVE_AGGREGATE_LEVELS` and the grain DTO enum are checked against each other so the two cannot drift.

A read is deliberately **not** audited. `AGENTS.md` requires audit for sensitive mutations and this writes nothing; an audit row per dashboard view would put a write on the read path this task exists to keep cheap and would bury the mutations in page views. The control is the permission plus the resolved scope, both enforced before any row is read.

Decisions worth a reviewer's attention: (1) `institutionDetail` is deliberately one level deep and takes an organization id — the full National → … → Peserta walk is TASK-062 and is not anticipated here; (2) `periodTo` is widened to `T23:59:59.999Z` so a quarterly figure includes its last day; (3) `countExecutiveScopes` counts entities from the read model rather than the transactional tables, which is honest but means a scope that has never been refreshed is not counted; (4) `ReportingModule` became a dynamic module so the scope resolver's one real dependency (where scopes come from) is an injected option — production passes the authorization evaluator, a test passes a stub, and the *production* wiring is therefore the path under test. With no source bound the resolver returns an empty grant, which denies rather than opens.

A single permission source serves both the guard and the resolver, so the scope that authorises the request is the same scope that bounds the query — there is no second, differently-computed answer to keep in sync.

Forty tests cover the four acceptance criteria: scope tests (unrestricted vs scoped vs empty grants, wildcard permission matching without widening segment counts, descendant expansion, `NATIONAL` with and without an id, out-of-grant and unknown grains denied, `null` vs `[]` axis semantics, and the DTO enum checked against the pure grain set), a KPI fixture (hand-computable figures, the mean-of-means counterexample, zero-not-NaN on empty denominators, and disjoint-level enforcement), pagination (page/limit reaching the repository unchanged, defaults of 1/25, the echoed page, and the bounded `limit`), plus the stored totals the roll-up depends on and three tests over the real `createApp` wiring for the 401/403/400 boundary.

One real bug was found and fixed by these tests: `collectExecutiveScopeGrant` was resetting an unrestricted grant to an empty one, which would have turned the widest possible access into no access — a denial, but a wrong one, and one that would have masked a misconfiguration behind a plausible 403.

Migration: `apps/api/prisma/migrations/20261009000700_task_061_executive_overview/migration.sql`, verified statement-by-statement against the canonical SQL from `prisma migrate diff --from-schema-datamodel` (2/2 verbatim: 1 AlterTable adding 10 columns, 1 CreateIndex).

Verification for TASK-061: `pnpm lint` (11/11 successful, Prettier clean), `pnpm typecheck` (14/14 successful), `pnpm build` (11/11 successful), `pnpm test` → **374 API + 6 api-client, 0 fail** (up from 334 API), `db:validate` PASS. `prisma migrate deploy` is **DEFERRED** (no Docker/runtime container in this environment); not a technical blocker, and the migration was verified verbatim against Prisma's own output.

TASK-062 through TASK-065 were **not** started.

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

## TASK-062 — REVIEW (2026-09-20)

Completed the pre-existing drill-down draft and repaired real repository participant traversal, scoped organization entry pagination/counts, child counts, malformed-request ordering, and empty-branch handling. Endpoint: `GET /api/v1/reporting/executive/drilldown`, protected by executive permission and scope. No schema change, migration, or dependency added.

Verification: `pnpm lint` (11/11 plus Prettier), `pnpm typecheck` (14/14), `pnpm test` (436 API + 6 api-client = 442, zero failures, including 62 drill-down tests), `pnpm build` (11/11), Prisma schema validation using a dummy local DATABASE_URL, and Prisma client generation all PASS. Live PostgreSQL/Keycloak verification remains DEFERRED because container/database runtime tooling is unavailable. Detailed evidence and limitations are in TASK-062.

Current checkpoint: TASK-062 awaits human review. TASK-063 is now separately implemented and awaits human review. TASK-064–065 remain NOT STARTED. TASK-065 still requires approved TASK-062, TASK-063, and TASK-064. Earlier next-task/status notes above are historical and do not supersede the latest checkpoints below.

## TASK-063 — REVIEW (2026-09-21)

Implemented attendance, learning, score/remedial KPI detail in the reporting module. New endpoint: `GET /api/v1/reporting/executive/kpis`, protected by `reporting.executive.read` and bounded by the same executive scope resolver used by TASK-061. The controller passes only the caller account id; the service resolves/narrows Permission + Scope before any read.

No schema change, no migration, and no dependency added. KPI detail reads only the stored `reporting_metrics` read model. It does not scan `attendance_records`, `learning_progress`, `final_grades`, or other transactional source tables on the hot path.

Added DTOs, controller, service, pure KPI rules, repository support for bounded trend rows, and 5 tests in `apps/api/test/reporting-kpis.test.cjs`. The response includes summary KPIs, distributions, attention list, cohort-period trend points, resolved scope, and paging. Formula rules are documented in code and task report: fixed KPI buckets, weakest-dimension remedial risk, explicit attention reasons, and TASK-061 weighted denominator rules for summary/trend figures.

Verification: `pnpm --filter @lms/api typecheck` PASS; `pnpm --filter @lms/api build` PASS; targeted KPI tests PASS (5/5); `pnpm --filter @lms/api lint` PASS; targeted Prettier check PASS; `pnpm typecheck` PASS (14/14); `DATABASE_URL='postgresql://validation:validation@127.0.0.1:5432/lms_validation' pnpm db:validate` PASS; `pnpm --filter @lms/api db:generate` PASS; `pnpm lint` PASS (11/11 plus Prettier); `pnpm test` PASS (441 API + 6 api-client = 447, zero failures); `pnpm build` PASS (11/11).

Deferred: live PostgreSQL/Keycloak end-to-end runtime verification, because container/database runtime is unavailable and was not installed automatically. This does not block TASK-063 review because API contract, scope behavior, formula fixtures, read-model-only path, and full repo checks are green.

Review notes: the trend is cohort-period trend from `periodStart`/`periodEnd`, not historical snapshot trend; TASK-064 remains responsible for graduation/trend reporting depth. For `CLASS_SUBJECT`, bucket `participants` represent per-subject participant rows, while summary headline remains on disjoint levels to avoid duplicated roster rollups.

Current checkpoint: TASK-063 awaits human review. TASK-064 and TASK-065 remain NOT STARTED. Per AGENTS.md rule 17, Codex must stop at REVIEW and not start TASK-064 until directed after review.
