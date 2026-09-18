# TASK-021 — Learning Activity & Content

**Status:** REVIEW

## Dependency
TASK-020 = REVIEW (implementation complete).

## Verification Result
- `pnpm lint` → PASS (11 tasks, Prettier clean)
- `pnpm typecheck` → PASS (14 tasks)
- `pnpm test` → PASS (124 tests: 122 API + 2 api-client; 8 new tests in `apps/api/test/learning-activities.test.cjs`, incl. OpenAPI contract)
- `pnpm build` → PASS (11 tasks)
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS
- Runtime PostgreSQL migration remains DEFERRED (consistent with TASK-000 foundation).
- Object storage (MinIO/S3) is not provisioned in this environment, so the signed-URL / upload runtime path is DEFERRED to TASK-022; TASK-021 therefore stores metadata only and never generates a key itself.

## Objective
Mendukung berbagai activity/content tanpa menyimpan binary di DB.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
- `LearningActivityType`: id, code (unique), name, description nullable, **requiresContent** (default true), status (`MasterStatus`: ACTIVE/INACTIVE), timestamps. `requiresContent` carries the per-type publish rule so validation is data-driven instead of branching on a hardcoded list of codes.
- `LearningActivity`: id, meetingId (FK learning_meetings, Restrict), activityTypeId (FK learning_activity_types, Restrict), sequence, title, instructions nullable, required (default false), availableFrom nullable, availableUntil nullable, status (`LearningActivityStatus`: DRAFT/PUBLISHED/ARCHIVED, default DRAFT), timestamps.
  - `@@unique([meetingId, sequence])`, indexes `[meetingId]`, `[activityTypeId]`, `[status]`.
  - Back-relation `LearningMeeting.activities`.
- `LearningContent`: id, activityId (FK learning_activities, Restrict), **versionGroupId**, contentType (`LearningContentType`: FILE/LINK), title, objectKey nullable, externalUrl nullable, mimeType nullable, sizeBytes nullable, version (default 1), status (`LearningContentStatus`: DRAFT/PUBLISHED/SUPERSEDED/ARCHIVED, default DRAFT), timestamps.
  - `@@unique([versionGroupId, version])`, indexes `[activityId]`, `[versionGroupId]`, `[status]`.
- **No binary column exists anywhere.** `docs/03-data-architecture.md` lists `learning_activity_types`, `learning_activities`, `learning_contents`; the FILE kind stores only an object-storage key produced by the file service (TASK-022).
- Migration: `apps/api/prisma/migrations/20260925000000_task_021_learning_activity_content/` (generated offline with `prisma migrate diff`).
- Audit actions (append-only): `learning_activity_type.created|updated`, `learning_activity.created|updated|status_changed|reordered`, `learning_content.created|updated|status_changed|version_created`; resource types `learning_activity_type`, `learning_activity`, `learning_content`.

## API / Application Contract
- `POST|GET /api/v1/learning-activity-types`, `GET|PATCH /api/v1/learning-activity-types/:id`.
- `POST|GET /api/v1/learning-activities`; `GET|PATCH /api/v1/learning-activities/:id`; `PATCH /api/v1/learning-activities/:id/status`; `PATCH /api/v1/learning-activities/reorder`.
- `POST|GET /api/v1/learning-activities/:id/contents` (content is nested under its activity — an activity is the only meaningful owner, it carries the availability window and the publish gate).
- `GET|PATCH /api/v1/learning-contents/:id`; `POST /api/v1/learning-contents/:id/versions`.
- `PATCH reorder` is declared **before** the `:id` routes so the literal path is matched first.

## Business Rules
- **Activity type data-driven**: any pedagogical form is a row. Code is normalized (uppercase, spaces → `_`) and unique → `409`. Deactivation is refused with `422` only while the type is used by a non-archived activity; historical activities keep their type so past delivery stays readable. Creating or switching to a non-ACTIVE type is refused `422`.
- **No binary in DB**: `FILE` content requires an `objectKey` and rejects an `externalUrl`; `LINK` content requires an http/https `externalUrl` and rejects an `objectKey`. The service never invents a storage key — it only records one produced by the file service, so a client filename can never become a path.
- **Ordering**: `sequence` is unique per meeting (`@@unique([meetingId, sequence])`); omitted on create → `max + 1`. Reorder takes the **complete** ordered id list for a meeting and renumbers 1..N inside a single two-phase transaction (park on a temporary sequence, then write the final values) because the unique index makes in-place swaps fail. Partial lists, duplicates, foreign ids and incomplete sets → `400`. Archived activities participate because they still hold a sequence.
- **Publish validation (data-driven)**: `DRAFT → PUBLISHED` requires (a) the activity type to be ACTIVE, (b) the owning meeting not to be ARCHIVED, and (c) when `requiresContent` is true, at least one PUBLISHED content. `DRAFT/PUBLISHED → ARCHIVED` allowed; `PUBLISHED → DRAFT` allowed because unpublishing is a non-destructive correction; `ARCHIVED` is terminal; same status → `400`, illegal edge → `422`. `PATCH :id` runs the same gate when the resolved status is PUBLISHED, and refuses any edit to an ARCHIVED activity.
- **Content version/history preserved for published use**: new material starts version group at version 1 and may only be created as `DRAFT`. Publishing is explicit via `PATCH :id { status }`; `SUPERSEDED` can never be set by a caller. `POST :id/versions` appends the next version and, in one transaction, marks the previous PUBLISHED row `SUPERSEDED` — so a group never holds two published rows and what a student already saw stays reconstructible. A new version must point to a new `objectKey`/`externalUrl`. Superseded rows are hidden from listing by default and readable with `includeSuperseded=true`; they cannot be edited (`422`).
- `availableUntil >= availableFrom` when both are present (`400`).

## Acceptance Criteria
[x] multiple activity types; [x] no binary DB; [x] ordering; [x] publish validation; [x] checks green.

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
