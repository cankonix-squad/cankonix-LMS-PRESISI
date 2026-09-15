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
| TASK-001 | `tasks/TASK-001-organization.md` | NOT STARTED | TASK-000 = DONE atau DONE-WITH-DEFERRED |
| TASK-002 | `tasks/TASK-002-person-user.md` | NOT STARTED | TASK-001 = DONE |
| TASK-003 | `tasks/TASK-003-auth-keycloak.md` | NOT STARTED | TASK-002 = DONE |
| TASK-004 | `tasks/TASK-004-role-permission.md` | NOT STARTED | TASK-003 = DONE |
| TASK-005 | `tasks/TASK-005-scope.md` | NOT STARTED | TASK-004 = DONE |
| TASK-006 | `tasks/TASK-006-audit.md` | NOT STARTED | TASK-005 = DONE |
| TASK-007 | `tasks/TASK-007-admin-foundation-ui.md` | NOT STARTED | TASK-001, TASK-002, TASK-004, TASK-005 = DONE |
| TASK-010 | `tasks/TASK-010-academic-program.md` | NOT STARTED | TASK-005 = DONE |
| TASK-011 | `tasks/TASK-011-curriculum-subject.md` | NOT STARTED | TASK-010 = DONE |
| TASK-012 | `tasks/TASK-012-batch.md` | NOT STARTED | TASK-011 = DONE |
| TASK-013 | `tasks/TASK-013-class.md` | NOT STARTED | TASK-012 = DONE |
| TASK-014 | `tasks/TASK-014-class-subject.md` | NOT STARTED | TASK-013 = DONE |
| TASK-015 | `tasks/TASK-015-enrollment.md` | NOT STARTED | TASK-013 = DONE |
| TASK-016 | `tasks/TASK-016-educator-assignment.md` | NOT STARTED | TASK-014 = DONE |
| TASK-017 | `tasks/TASK-017-academic-scheduling.md` | NOT STARTED | TASK-014 = DONE |
| TASK-020 | `tasks/TASK-020-learning.md` | NOT STARTED | TASK-014 = DONE |
| TASK-021 | `tasks/TASK-021-learning-activity-content.md` | NOT STARTED | TASK-020 = DONE |
| TASK-022 | `tasks/TASK-022-file-management.md` | NOT STARTED | TASK-000 = DONE-WITH-DEFERRED atau DONE |
| TASK-023 | `tasks/TASK-023-learning-progress.md` | NOT STARTED | TASK-021 = DONE dan TASK-015 = DONE |
| TASK-024 | `tasks/TASK-024-assignment-submission.md` | NOT STARTED | TASK-021, TASK-022, TASK-015 = DONE |
| TASK-025 | `tasks/TASK-025-educator-learning-ui.md` | NOT STARTED | TASK-020, TASK-021, TASK-024 = DONE |
| TASK-026 | `tasks/TASK-026-student-learning-ui.md` | NOT STARTED | TASK-023, TASK-024 = DONE |
| TASK-030 | `tasks/TASK-030-attendance.md` | NOT STARTED | TASK-017 dan TASK-015 = DONE |
| TASK-031 | `tasks/TASK-031-attendance-correction-audit.md` | NOT STARTED | TASK-030 dan TASK-006 = DONE |
| TASK-032 | `tasks/TASK-032-attendance-ui.md` | NOT STARTED | TASK-031 = DONE |
| TASK-033 | `tasks/TASK-033-attendance-summary.md` | NOT STARTED | TASK-031 = DONE |
| TASK-040 | `tasks/TASK-040-assessment.md` | NOT STARTED | TASK-014 = DONE |
| TASK-041 | `tasks/TASK-041-question-bank.md` | NOT STARTED | TASK-040 = DONE |
| TASK-042 | `tasks/TASK-042-exam.md` | NOT STARTED | TASK-041 = DONE |
| TASK-043 | `tasks/TASK-043-exam-session.md` | NOT STARTED | TASK-042 dan TASK-015 = DONE |
| TASK-044 | `tasks/TASK-044-attempt-runtime.md` | NOT STARTED | TASK-043 = DONE |
| TASK-045 | `tasks/TASK-045-autosave.md` | NOT STARTED | TASK-044 = DONE |
| TASK-046 | `tasks/TASK-046-auto-manual-scoring.md` | NOT STARTED | TASK-045 = DONE |
| TASK-047 | `tasks/TASK-047-educator-exam-ui.md` | NOT STARTED | TASK-042, TASK-043, TASK-046 = DONE |
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

## Next Eligible Development Task

TASK-001 is the next eligible development task after governance recovery because TASK-000 is recorded as `DONE-WITH-DEFERRED`, and its deferred infrastructure verification is documented as not blocking development sequencing.

Do not start TASK-001 as part of this recovery step.
