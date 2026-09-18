# TASK-022 — File Management

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-000 = DONE-WITH-DEFERRED atau DONE.

## Objective
Menyediakan abstraction object storage aman untuk seluruh domain.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`StoredFile`: id, objectKey unique, originalName, mimeType, size, checksum nullable, ownerUserId nullable, status, timestamps. Binary MinIO/S3, bukan PostgreSQL.

Implemented:
- Prisma models `StoredFile` + enum `StoredFileStatus` (`PENDING`, `UPLOADED`, `ACTIVE`, `ARCHIVED`), mapped to table `stored_files`.
- Columns: `id`, `object_key` (unique), `namespace`, `original_name`, `mime_type`, `size_bytes`, `checksum` (nullable), `owner_user_id` (nullable, FK → `user_accounts.id` `ON DELETE RESTRICT`), `status`, `uploaded_at` (nullable), `created_at`, `updated_at`.
- **No binary column.** The row carries metadata only; bytes live in S3-compatible storage. This is enforced at the schema level.
- Indexes: `object_key` (unique), `namespace`, `owner_user_id`, `status`.
- Migration: `apps/api/prisma/migrations/20260926000000_task_022_stored_file/migration.sql`.
- Audit actions (append-only catalogue): `stored_file.upload_initiated`, `stored_file.upload_completed`, `stored_file.download_url_issued`, `stored_file.status_changed`, `stored_file.archived`; resource type `stored_file`.

## API / Application Contract
Internal FileService + API upload initiation/completion/download signed URL sesuai kebutuhan; delete logical/retention-aware.

Implemented in `apps/api/src/files/` (all routes under `/api/v1/files`, module `FilesModule`):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/files/upload-policy` | Discoverable size/type whitelist (declared before `:id`). |
| POST | `/files/uploads` | Initiate upload; returns metadata + presigned PUT. |
| POST | `/files/:id/complete` | Confirm upload against storage; PENDING → UPLOADED. |
| GET | `/files` | Paginated, filterable listing. |
| GET | `/files/:id` | Metadata for one file. |
| GET | `/files/:id/download-url` | Issue a signed, short-lived GET capability. |
| PATCH | `/files/:id/activate` | Mark a confirmed file usable (UPLOADED → ACTIVE). |
| PATCH | `/files/:id/archive` | Logical delete; row and bytes retained. |

Layering: `FilesController` → `FilesService` → `StoredFilesRepository` (token `STORED_FILES_REPOSITORY`) → Prisma. Storage is a port (`ObjectStorage` / `OBJECT_STORAGE` token); the adapter is bound with `useFactory` so an unconfigured deployment gets a fail-closed null object that refuses every operation instead of silently succeeding.

## Business Rules
Whitelist size/type configurable. Object key generated server. Jangan percaya filename client. Authorization dilakukan sebelum signed URL. Runtime MinIO boleh DEFERRED.

Implemented:
- **Configurable whitelist** (`upload-policy.ts`, bound via `UPLOAD_POLICY`) is enforced in `initiateUpload` *before* any URL is signed: a disallowed MIME type → 422, an oversize file → 400. An unlisted type is always refused, so `defaultMaxSizeBytes` can only narrow limits, never widen the whitelist.
- **Object key is generated server-side** (`object-key.ts`): `<namespace>/<owner|system>/<yyyy>/<mm>/<uuid>[.<ext>]`. Namespaces are a code-owned vocabulary. The client filename never reaches the key.
- **Client filenames are untrusted display metadata.** `sanitizeOriginalName` reduces the name to a basename, strips control characters and bidi overrides, replaces disallowed characters, caps the length while preserving the extension, and falls back to `unnamed` for dot-only/empty input. `resolveExtension` prefers the whitelisted MIME mapping and only falls back to a client extension matching `^[a-z0-9]{1,8}$`.
- **Completion is not taken on trust.** `completeUpload` requires `headObject` confirmation; if storage cannot confirm existence the file stays `PENDING` (422). Size/content-type disagreement → 409.
- **Authorization happens before signing.** A signed URL is a capability, so it is only minted for a confirmed (`UPLOADED`/`ACTIVE`) file, and the route is guarded. `PENDING`/`ARCHIVED` → 422. Download URLs are audited with the requesting user.
- **Delete is logical and retention-aware.** Only `archive` is exposed; there is no hard-delete endpoint. `ARCHIVED` is terminal. `removeObject` exists on the port for a future retention job but is never called from the API.
- **Fail closed on missing configuration.** `loadStorageConfig` returns `null` when incomplete; `FilesModule` then binds a null object whose every method rejects, and startup logs a single warning.
- **No new dependency.** The S3 adapter implements AWS SigV4 query signing directly with `node:crypto`; path-style and virtual-host-style addressing are both supported.

## Acceptance Criteria
[x] metadata persistence; [x] key sanitization; [x] authorization boundary; [x] mocked storage tests; [x] no binary DB; [x] checks green.

## Verification Result
- `pnpm lint` — PASS (11 tasks).
- `pnpm typecheck` — PASS (14 tasks).
- `pnpm build` — PASS (11 tasks).
- `pnpm test` — PASS: **132 API tests** (10 new in `apps/api/test/files.test.cjs`) + 2 `@lms/api-client` = **134 total**, 0 fail.
- `pnpm --filter @lms/api db:validate` — PASS.
- `pnpm --filter @lms/api db:generate` — PASS.
- New tests cover: server-generated keys ignoring client filenames; filename sanitization; object-key traversal rejection; whitelist enforcement before signing; non-trusting completion; download-URL gating and auditing; logical-only lifecycle + filters; fail-closed storage config; SigV4 signature recomputed independently from the spec (no live bucket required); OpenAPI exposure + 401 on anonymous access.

### Deferred Verification
- **Runtime PostgreSQL migration** (`prisma migrate deploy` / `migrate dev`) — DEFERRED (inherited from TASK-000). No container runtime is available; Docker is not installed automatically. The migration SQL was generated offline via `prisma migrate diff` and validated statically.
- **Live MinIO/S3 runtime path** — DEFERRED. No S3-compatible endpoint is available. It is permissible here because the task explicitly allows runtime MinIO to be DEFERRED. The adapter is instead verified against the SigV4 specification (canonical request, credential scope, signature recomputed independently). This must be exercised against a real bucket before integration/UAT.

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
