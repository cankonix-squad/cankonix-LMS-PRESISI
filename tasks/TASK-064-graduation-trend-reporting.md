# TASK-064 — Graduation & Trend Reporting

**Status:** REVIEW

## Dependency
TASK-060 dan TASK-053 = DONE.

## Objective
Trend graduation/pass/fail/remedial over periods/scopes.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
ReportingSnapshot may be used to preserve historical trend.

## API / Application Contract
Trend endpoints with period granularity and scope.

## Business Rules
Historical snapshots not silently rewritten by later master-data changes unless refresh policy explicit.

## Acceptance Criteria
[x] period aggregation; [x] scope; [x] historical consistency; [x] checks green.

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
Implemented graduation trend reporting from the stored `reporting_metrics` read model.

Endpoint:
- `GET /api/v1/reporting/executive/graduation-trends`
- Protected by `reporting.executive.read`.
- Scope is resolved through the executive scope resolver before any reporting row is read.
- Query supports `scope`, `scopeId`, `level`, `granularity` (`COHORT`, `YEAR`, `QUARTER`, `MONTH`), `periodFrom`, `periodTo`, and `limit`.

Schema/migration:
- Added four stored outcome counters to `ReportingMetric`: `graduationPassCount`, `graduationFailCount`, `graduationRemedialCount`, and `graduationWithdrawnCount`.
- Added migration `apps/api/prisma/migrations/20261009000800_task_064_graduation_trend_reporting/migration.sql`.
- Prisma schema validation PASS with a dummy local PostgreSQL URL.
- Prisma client generation PASS.

Business rules:
- Trend reads consume only `reporting_metrics`; transactional graduation, evaluation, and certificate tables are read only during reporting refresh.
- Approved graduation decisions are split into `PASS`, `FAIL`, `REMEDIAL`, and `WITHDRAWN`.
- Trend periods are derived from the stored reporting row period and grouped by cohort, year, quarter, or month.
- Rates use explicit denominators and return `0` for empty denominators: pass/fail/remedial rates over approved decisions, certification rate over pass decisions.
- Scope filtering preserves the Permission + Scope model; no role-name branching was introduced.

Files created/changed:
- `apps/api/src/reporting/graduation-trend.controller.ts`
- `apps/api/src/reporting/graduation-trend.service.ts`
- `apps/api/src/reporting/graduation-trend-rules.ts`
- `apps/api/src/reporting/dto/graduation-trend-query.dto.ts`
- `apps/api/src/reporting/dto/graduation-trend-response.dto.ts`
- `apps/api/test/reporting-graduation-trends.test.cjs`
- Reporting schema/types/rules/repository/module/overview DTO updated to carry the new graduation outcome counters.

Verification:
- `apps/api/node_modules/.bin/prisma format --schema apps/api/prisma/schema.prisma` PASS
- `DATABASE_URL=postgresql://user:pass@localhost:5432/lms apps/api/node_modules/.bin/prisma validate --schema apps/api/prisma/schema.prisma` PASS
- `apps/api/node_modules/.bin/prisma generate --schema apps/api/prisma/schema.prisma` PASS
- `../../node_modules/.bin/eslint src test` from `apps/api` PASS
- `./node_modules/.bin/tsc --noEmit` from `apps/api` PASS
- `./node_modules/.bin/tsc -p tsconfig.build.json` from `apps/api` PASS
- `node --test test/reporting-graduation-trends.test.cjs` PASS (5/5)
- `node --test test/*.test.cjs` PASS outside sandbox (446/446). The first sandboxed run failed only because HTTP tests could not bind `127.0.0.1` (`listen EPERM`).
- `git diff --check` PASS

Deferred:
- Live PostgreSQL migration deployment and live Keycloak/API runtime verification remain DEFERRED because no runtime database/container was started in this environment. This does not block REVIEW because schema validation, generated Prisma client, build, lint, and full API tests pass.

Task boundary:
- TASK-065 was not started.
