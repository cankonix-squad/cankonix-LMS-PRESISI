# AGENTS.md — Lemdiklat Polri LMS

This repository is governed by the locked architecture under `/docs` and task specifications under `/tasks`.

## Mandatory workflow
1. Read this file.
2. Read `tasks/MASTER-CHECKLIST.md`.
3. If the user assigned an explicit task, evaluate that task. Otherwise, determine the next eligible unfinished implementation task from `MASTER-CHECKLIST.md`.
4. Select the next task by task status, checklist order, declared dependencies, and architecture prerequisites.
5. Do not start a task with unresolved mandatory dependencies.
6. A task with only explicitly DEFERRED infrastructure verification may allow the next task to proceed if the next task does not technically depend on that verification.
7. If any task is marked FIX REQUIRED, return to that task before starting new work.
8. Work on one implementation task at a time.
9. Before implementation, read the selected TASK file, read every architecture document referenced by that task, inspect the existing implementation, and verify dependencies.
10. Change the selected task to IN PROGRESS when implementation work starts.
11. Produce a concise implementation plan.
12. Implement only the selected task. Do not implement future tasks opportunistically.
13. Run lint, typecheck, tests, production build, and any other verification required by this file and the selected task.
14. If verification requires unavailable Docker/container infrastructure, do not install Docker automatically. Mark that specific verification as DEFERRED, record the reason, and continue only when it is not a mandatory dependency for the current work.
15. Update the selected task and `MASTER-CHECKLIST.md` only from verified results, keeping both synchronized with actual repository state.
16. After available verification passes, move the selected task to REVIEW. Codex may never mark an implementation task DONE automatically.
17. REVIEW is a mandatory human checkpoint. When a task reaches REVIEW, stop and do not automatically start the next task.
18. Only tasks explicitly approved as DONE by the user/reviewer may be considered completed dependencies. `DONE-WITH-DEFERRED` also satisfies dependencies for development tasks when the deferred verification is explicitly documented and does not technically block that next task.
19. If BLOCKED, stop and report the blocker.

## Autonomous execution mode
The standard future user command may be:

```
Read AGENTS.md and continue the project.
```

That command means Codex must inspect current status, determine the next eligible work, execute exactly one task, verify it, update documentation/checklist evidence, move the task to REVIEW, and stop.

`DONE-WITH-DEFERRED` means the user/reviewer approved the implementation as complete for development sequencing, with named verification still outstanding. Deferred infrastructure verification must be completed before integration testing, UAT, or production readiness.

## Locked architecture
- Monorepo: pnpm + Turborepo.
- Frontends: independent Next.js apps: admin, educator, student, executive.
- Backend: NestJS Modular Monolith.
- Database: PostgreSQL + Prisma.
- Redis: cache, queue, rate limiting and ephemeral coordination only.
- Queue: BullMQ.
- Object storage: MinIO/S3-compatible.
- Authentication/SSO: Keycloak.
- API: REST + OpenAPI, versioned under `/api/v1`.

## Non-negotiable rules
- Never modify another application unless the task explicitly requires it.
- Never hardcode roles as the authorization model. Authorization is Permission + Scope.
- Backend is the security boundary; hiding UI is not authorization.
- Never access Prisma directly from controllers.
- Every API input requires DTO validation.
- Every database schema change requires a migration.
- Frontends consume API contracts, not Prisma/database entities.
- Uploaded binary files are not stored in PostgreSQL.
- Exam answers must never rely on Redis as source of truth.
- Exam timer is server-authoritative.
- Sensitive mutations require audit logging.
- Breaking API changes require explicit versioning/approval.
- New business logic requires tests.
- Do not introduce microservices without explicit architectural approval.
- Do not add dependencies without justification.
- Do not silently redesign architecture.

## Conflict rule
If a task conflicts with locked architecture, STOP and report the conflict. Never change locked architecture merely to make implementation easier.
