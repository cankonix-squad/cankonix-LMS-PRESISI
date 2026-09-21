# TASK-062 — Organization / Program Drill-down

**Status:** REVIEW

## Dependency
TASK-061 = DONE.

## Objective
Drilldown National→Lemdiklat→Lembaga→Program→Angkatan→Kelas→Mata Pelajaran→Peserta.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Reuse aggregate/read models.

## API / Application Contract
Hierarchical drilldown endpoints or generic scoped endpoint with explicit level and parent identifiers.

## Business Rules
Every transition validates parent-child relationship and user scope. No arbitrary ID data leak.

## Acceptance Criteria
[x] hierarchy traversal; [x] out-of-scope denied; [x] invalid parent-child rejected; [x] checks green (available checks; live infrastructure deferred below).

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

## Implementation and verification — 2026-09-20

Dependency: TASK-061 is approved DONE in the master checklist. Existing untracked TASK-062 draft code and tests were present before this work; this task completes and verifies that draft without replacing unrelated workspace changes.

Plan executed: inspect the draft and scope boundary, repair repository traversal and pagination, add regression coverage, run repository checks, and stop at human REVIEW.

Endpoint: `GET /api/v1/reporting/executive/drilldown?level=ORGANIZATION`, then descend using `level` and `parentId`. Organization nesting represents Lemdiklat → Lembaga; the remaining levels are PROGRAM → BATCH → CLASS → CLASS_SUBJECT → ENROLLMENT. Requires `reporting.executive.read` and the caller's resolved permission scopes. Query DTO validates levels, UUIDs, and pagination (limit 1–100).

Completed implementation under `apps/api/src/reporting/`: `drilldown.controller.ts`, `drilldown.service.ts`, `drilldown.repository.ts`, `drilldown-hierarchy.ts`, `drilldown-access.ts`, `drilldown-path.ts`, and `dto/drilldown-{query,response}.dto.ts`; existing module/token wiring lives in `reporting.module.ts` and `reporting.types.ts`. Regression coverage is in `apps/api/test/reporting-drilldown.test.cjs`. Documentation updated in this file and `MASTER-CHECKLIST.md`. No other application changed by this task; no dependency, schema, or migration added.

Repairs to the draft:

- Removed the premature empty response for ENROLLMENT so the real repository returns the subject's class roster.
- Restricted scoped organization entry points before pagination and count; unrelated national roots cannot enter the page or total. Descendants appear beneath their reachable parent rather than being duplicated at the entry level.
- Populated child counts from Prisma relation counts for organizations, programs, batches, classes, and subjects. Participants remain leaves.
- Rejected malformed hierarchy requests before resolving or expanding grants.
- Allowed an authorized parent to return an empty child page; lack of existing children is not an authorization denial.

Metrics reuse stored `reporting_metrics`; hierarchy names and relations are read from their authoritative tables. Unrefreshed metrics are `null`. No metric refresh or domain mutation occurs. Out-of-scope and nonexistent parents return the same 404; incorrect parent levels return 400 only after the scope check. Scope is recomputed on each request. Narrow program/class grants cannot read ancestor roll-ups; callers must enter via an authorized parent ID at their available depth.

Verification PASS:

- `pnpm lint`: 11/11 tasks, repository Prettier check passed.
- `pnpm typecheck`: 14/14 tasks.
- `pnpm test`: 436 API + 6 api-client = 442 passed, zero failures. Includes 62 drill-down tests covering hierarchy, scope denial, parent validation, HTTP authentication/DTO boundaries, real repository pagination, participant retrieval, and child counts.
- `pnpm build`: 11/11 tasks (production build; existing valid Turbo cache reused).
- `pnpm db:validate`: PASS with an explicit dummy local `DATABASE_URL` for schema-only validation. Initial invocation lacked DATABASE_URL; no database connection is claimed.
- `pnpm --filter @lms/api db:generate`: PASS.

DEFERRED: live PostgreSQL/Keycloak end-to-end verification. No Docker, Podman, or psql executable is available in this environment; no runtime installed. Repository tests use Prisma doubles and HTTP tests use test identity/scope providers. These checks do not establish production database or identity-provider behavior. Existing migrations from prior tasks still require runtime verification before integration/UAT/production readiness.

Review considerations: scoped reach currently expands descendant identifiers per request; large institution datasets require runtime performance verification. Participant metrics retain the existing ENROLLMENT scope semantics, while the subject determines the roster. No subject-specific participant aggregate is introduced here.

TASK-063, TASK-064, and TASK-065 were not started. Per AGENTS.md rule 17, stop at REVIEW and await human approval; TASK-062 is not marked DONE.
