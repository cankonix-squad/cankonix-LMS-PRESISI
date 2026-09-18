# TASK-040 — Assessment Foundation

**Status:** REVIEW

## Dependency
TASK-014 = DONE.

## Objective
Umbrella assessment untuk berbagai metode penilaian.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AssessmentType`: code/name/status. `Assessment`: id, classSubjectId, typeId, title, maxScore, weight nullable, availability, status, metadata.

## API / Application Contract
CRUD/publish assessment/list by classSubject.

## Business Rules
Types data-driven: QUIZ/EXAM/ASSIGNMENT/PRACTICAL/OBSERVATION/COMPETENCY. Published assessment protected from destructive mutation.

## Acceptance Criteria
[x] lifecycle; [x] maxScore/weight validation; [x] checks green.

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

## Implementation Evidence (2026-09-18)

### Persistence

`apps/api/prisma/schema.prisma` — two new tables, no foreign keys on reporting columns:

- `AssessmentType` (`@@map("assessment_types")`): `id`, `code` (unique),
  `name`, `description?`, `status MasterStatus @default(ACTIVE)`, timestamps.
  Reuses `MasterStatus` so the retire-a-value semantics are identical to the
  other controlled vocabularies (`educator_types`, `learning_activity_types`).
- `Assessment` (`@@map("assessments")`): `id`, `classSubjectId`
  (FK → `ClassSubject`, `onDelete: Restrict`), `assessmentTypeId`
  (FK → `AssessmentType`, `onDelete: Restrict`), `title`, `description?`,
  `maxScore Decimal @db.Decimal(7,2)`, `weight Decimal? @db.Decimal(5,2)`,
  `availableFrom?`, `availableUntil?`, `status AssessmentStatus @default(DRAFT)`,
  `metadata Json?`, timestamps. Indexes on `classSubjectId`, `assessmentTypeId`,
  `status`, `availableFrom`.
- New enum `AssessmentStatus { DRAFT PUBLISHED CLOSED ARCHIVED }`.
- `Assignment.assessmentId` was a bare UUID column with no relation; it is now a
  real optional relation (`onDelete: SetNull`, `@@index([assessmentId])`), so the
  assignment domain can genuinely reference the umbrella assessment it feeds.
  `SetNull` was chosen over `Restrict` because an assessment being retired must
  not be blocked by an unrelated assignment row, and the link is informational.

Migration: `apps/api/prisma/migrations/20261002000000_task_040_assessment/migration.sql`
— creates the enum, both tables, seven indexes, the three FK constraints, and
**seeds the six baseline types** (QUIZ, EXAM, ASSIGNMENT, PRACTICAL, OBSERVATION,
COMPETENCY) with `ON CONFLICT ("code") DO NOTHING` so re-applying is safe and an
institution that added its own row keeps it.

### Why the type vocabulary is a table, not an enum

The task requires QUIZ/EXAM/ASSIGNMENT/PRACTICAL/OBSERVATION/COMPETENCY to be
**data-driven**. An enum in `schema.prisma` would make every new method a
migration plus a deploy, and every consumer would end up branching on the code —
exactly the role-name-style branching the authorization model forbids elsewhere.
As rows, a new method is a POST, and no service file mentions a type code.

### Lifecycle

`AssessmentStatusDto` + `ALLOWED_ASSESSMENT_TRANSITIONS`
(`apps/api/src/assessments/dto/assessment-status.dto.ts`):

```
DRAFT     -> PUBLISHED, ARCHIVED
PUBLISHED -> DRAFT, CLOSED, ARCHIVED
CLOSED    -> ARCHIVED
ARCHIVED  -> (terminal)
```

- `PUBLISHED -> DRAFT` is allowed: unpublishing is a normal correction (a
  mistaken publish is taken back before participants reach it) and it is the only
  documented way to unlock `maxScore`/`weight` again.
- `CLOSED` is one-way: results already exist, so re-opening would silently change
  what participants were measured on.
- `ARCHIVED` is terminal so anything hanging off the assessment stays
  reconstructible.
- An illegal edge is `UnprocessableEntityException` (422), matching the newest
  analogue (`assignments.service.ts`).
- A same-status request is an **idempotent no-op**: it returns the existing record
  unchanged and writes no audit entry, so a retried publish never looks like a
  transition. (The older `learning-activities` analogue throws 400 here; the
  assignment convention was followed because retry-safety matters more once a
  participant-facing publish is involved.)

### Published assessment is protected from destructive mutation

`assertMutable(record, field)` rejects changes to `maxScore` and `weight` while
the assessment is `PUBLISHED` or `CLOSED` with a 422 that names the field and
tells the operator to move it back to `DRAFT` first. The guard is applied on
**both** the generic `PATCH /assessments/:id` and the dedicated status endpoint,
so no path can bypass it. Non-destructive edits (title, description, metadata)
stay available.

The check is change-sensitive: sending the *same* `maxScore`/`weight` is not a
mutation and is allowed, so an idempotent re-PUT does not fail.

### Validation

- `maxScore` required, `> 0`, ≤ 99999.99, 2 decimal places (`IsNumber({ maxDecimalPlaces: 2 })`
  plus `normalizeMaxScore`). It is the denominator every score is measured
  against, so a non-positive or absent value is a 400.
- `weight` optional and nullable; when present it must be `> 0` (≤ 999.99). A
  `null` weight means "not yet weighted" (TASK-050 aggregates it), which is
  deliberately distinguishable from `0`.
- Availability window: `availableUntil` must be strictly after `availableFrom`.
  On update the untouched edge is read from the stored row before validating, so
  moving only one edge cannot produce an inverted window.
- `assessmentTypeId` must exist **and be `ACTIVE`** (422 otherwise) — an
  `INACTIVE` type is retired for new assessments but historical ones stay valid,
  mirroring `learning-activity-types`.
- Publishing requires an `ACTIVE` class subject (422). A class subject that is
  `INACTIVE` or `COMPLETED` must not expose a new graded activity.
- Decimals are normalized to strings via `toFixed(2)` at the write boundary and
  back to `number` via `Number(...)` in `toResponse`, matching the
  `AssignmentGrade.score` convention.

### API contract (all under `/api/v1`)

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/assessment-types` | `assessment.type.manage` |
| GET | `/assessment-types` | `assessment.type.read` |
| GET | `/assessment-types/:id` | `assessment.type.read` |
| PATCH | `/assessment-types/:id` | `assessment.type.manage` |
| POST | `/assessments` | `assessment.manage` |
| GET | `/assessments` | `assessment.read` |
| GET | `/assessments/:id` | `assessment.read` |
| PATCH | `/assessments/:id` | `assessment.manage` |
| PATCH | `/assessments/:id/status` | `assessment.manage` |

`GET /assessments` filters by `classSubjectId` (the required "list by
classSubject"), plus `academicClassId`, `curriculumSubjectId`,
`assessmentTypeId`, `status`, `search`, `page`, `limit`.

Authorization is Permission + Scope only (`apps/api/src/assessments/assessment-permissions.ts`,
`<domain>.<resource>.<action>`). No route branches on a role name; the
`PermissionGuard` is fail-closed, so an unauthenticated request to any of these
paths is `401`.

### Audit

`AUDIT_ACTIONS` gained `assessment_type.created`, `assessment_type.updated`,
`assessment.created`, `assessment.updated`, `assessment.status_changed`;
`AUDIT_RESOURCE_TYPES` gained `assessment_type` and `assessment`. Sensitive
mutations record before/after snapshots (the status change records
`{ from, to, reason }`).

### Files

Created (`apps/api/src/assessment-types/`): `assessment-type.types.ts`,
`assessment-types.repository.ts`, `assessment-types.service.ts`,
`assessment-types.controller.ts`, `assessment-types.module.ts`,
`dto/{assessment-type-status,create-assessment-type,update-assessment-type,assessment-type-response,list-assessment-types-query}.dto.ts`.

Created (`apps/api/src/assessments/`): `assessment.types.ts`,
`assessment-permissions.ts`, `assessments.repository.ts`,
`assessments.service.ts`, `assessments.controller.ts`, `assessments.module.ts`,
`dto/{assessment-status,assessment-actions,create-assessment,update-assessment,assessment-response,list-assessments-query}.dto.ts`.

Created: `apps/api/prisma/migrations/20261002000000_task_040_assessment/migration.sql`,
`apps/api/test/assessments.test.cjs`.

Changed: `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`,
`apps/api/src/audit/audit-actions.ts`, `packages/api-client/src/index.ts`.

### Client

`packages/api-client/src/index.ts` gained `AssessmentStatus`,
`AssessmentTypeStatus`, `AssessmentType`, `AssessmentTypeList`,
`ListAssessmentTypesQuery`, `CreateAssessmentTypeInput`,
`UpdateAssessmentTypeInput`, `Assessment`, `AssessmentList`,
`ListAssessmentsQuery`, `CreateAssessmentInput`, `UpdateAssessmentInput`,
`ChangeAssessmentStatusInput`, and the `api.assessmentTypes` /
`api.assessments` namespaces (`list`, `get`, `create`, `update`,
`changeStatus`).

### Tests

`apps/api/test/assessments.test.cjs` — **13 tests, all passing.** Drives the real
`AssessmentTypesService` and `AssessmentsService` against in-memory repositories
that implement the same interfaces as the Prisma implementations. Covered:

1. the type vocabulary is data-driven (`code` normalization, duplicate → 409,
   search, 404);
2. deactivation is blocked only by non-archived assessments;
3. create validates class subject (404) and rejects an inactive type (422);
4. `maxScore`/`weight` validation, `toFixed(2)` rounding, `null` weight default;
5. availability-window ordering on create *and* on a single-edge update;
6. published assessment is protected from `maxScore`/`weight` mutation (422),
   non-destructive edits still work, same-value writes are not mutations, and
   `PUBLISHED -> CLOSED -> ARCHIVED` still works;
7. `PUBLISHED -> DRAFT` unlocks the denominator again;
8. same-status is an idempotent no-op with no audit write; illegal edges → 422;
9. publishing is refused when the class subject is not ACTIVE (422), both via
   `changeStatus` and via `create({ status: 'PUBLISHED' })`;
10. the generic `PATCH` applies the same type and transition guards;
11. listing by `classSubjectId` plus `status` / `search` / `academicClassId` /
    `curriculumSubjectId` filters;
12. metadata round-trips as free-form JSON and defaults to `null`;
13. all nine paths appear in `/api/v1/docs-json` and an anonymous `GET
    /api/v1/assessments` is `401`.

### Verification

| Check | Result |
| --- | --- |
| `pnpm lint` | **11/11 successful**, "All matched files use Prettier code style!" |
| `pnpm typecheck` | **14/14 successful** |
| `pnpm test` | **193 API + 2 api-client = 195 tests, 0 fail** (was 182; +13) |
| `pnpm build` | **11/11 successful** |
| `prisma validate` | "The schema at prisma/schema.prisma is valid 🚀" |
| `prisma generate` | Prisma Client v6.19.3 regenerated |

### DEFERRED

Runtime end-to-end verification against a live PostgreSQL + Keycloak is
**DEFERRED**: no container runtime is available in this environment and Docker is
never installed automatically. This is not a technical blocker for TASK-040 —
the lifecycle, mutation-protection, validation and listing rules are all covered
by tests driving the real services, and the migration is validated by
`prisma validate`. What remains unverified at runtime is only that the generated
DDL applies cleanly to a real server and that the seeded rows are visible.

### Issues / risks

- The type seed lives inside the migration rather than a `prisma/seed.ts`. There
  is no seed file in this repository yet, and a seeded *vocabulary* the domain
  documents as baseline belongs with the schema that creates its table. If the
  project later adopts a seed file, the six rows should move there and the
  `INSERT` be dropped from the migration before it is applied anywhere.
- TASK-041 (Question Bank) and TASK-050 (Grading) will hang off `Assessment`.
  The `weight` column is intentionally inert here — it stores the intent but no
  code yet reads it, which is correct for an umbrella foundation task.
- `Assignment.assessmentId` now has a real FK with `ON DELETE SET NULL`. No code
  path deletes assessments (there is no delete endpoint by design), so this
  cannot fire today; it exists so the relation is honest if a retention job is
  ever added.

### Confirmation

TASK-041 and every other task were **not** started. No DONE status was set; the
task is left at REVIEW for human sign-off.
