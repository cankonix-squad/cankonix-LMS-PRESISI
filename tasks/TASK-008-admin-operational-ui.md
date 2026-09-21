# TASK-008 — Admin Operational UI Refinement

**Status:** REVIEW

## Dependency
TASK-007 = DONE-WITH-DEFERRED. Production login stack deployed and verified.

## Objective
Menyempurnakan portal Admin agar bisa dipakai sebagai jalur uji coba operasional awal: login/session Admin harus memakai Keycloak/OIDC sungguhan, dashboard foundation harus memakai bearer token dari session, dan wiring API foundation minimal harus dapat membuat serta membaca organisasi.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak menambah persistence baru. Semua perubahan memakai API foundation yang sudah ada.

## API / Application Contract
Admin frontend tetap menggunakan `packages/api-client`. Tidak ada raw fetch domain dari komponen UI. Bearer token dibaca dari cookie server-side hasil OIDC callback.

## Business Rules
Portal bukan security boundary; API tetap enforce authentication/authorization. Login UI tidak menyimpan password lokal dan tidak melakukan validasi kredensial sendiri. Client-side validation hanya tambahan untuk ergonomi form.

## Acceptance Criteria
[x] Login Admin mengarah ke Keycloak/OIDC, bukan prototipe lokal; [x] dashboard tidak mencoba membaca protected API tanpa token; [x] create organization memakai API foundation; [x] loading/error/empty state tetap ada; [x] admin build/typecheck/lint green.

## Aturan Implementasi Wajib
- Baca `AGENTS.md`, `tasks/MASTER-CHECKLIST.md`, dan dokumen pada `docs/` yang relevan sebelum coding.
- Backend tetap **NestJS Modular Monolith**. Jangan membuat microservice.
- Alur frontend: Admin UI → `packages/api-client` → REST `/api/v1`.
- Semua otorisasi tetap Permission + Scope di backend; UI tidak boleh hardcode role sebagai security boundary.
- Jangan mengerjakan `TASK-064` atau task berikutnya secara oportunistik.
- Jika runtime browser production tidak dapat diverifikasi dari lingkungan lokal, catat sebagai `DEFERRED`.
- Setelah implementasi dan verification yang tersedia berhasil, ubah status task menjadi `REVIEW`, update `MASTER-CHECKLIST`, lalu STOP. Codex tidak boleh menandai `DONE`.

## Laporan Akhir Codex
TASK-008 implemented and moved to `REVIEW`.

Perubahan:
- Admin login page no longer performs local prototype username/password handling. It now routes users to `/api/auth/login`, which starts the configured Keycloak/OIDC authorization-code flow.
- User-facing login copy now says SSO/Admin LMS PRESISI instead of exposing the technical Keycloak label, while the underlying OIDC route remains unchanged.
- Admin dashboard now checks for the HTTP-only `lms_access_token` cookie before calling protected API endpoints. Anonymous users see a login-required state instead of repeated `Bearer access token is required` API errors.
- Admin root `/` now redirects anonymous users to `/login`; authenticated users still land on the operational dashboard after the OIDC callback.
- Organization creation is now wired through a server action using `packages/api-client` and `POST /api/v1/organizations`; the dashboard revalidates after a successful create.
- `AGENTS.md` documents the temporary product priority: finish/review Admin usability before continuing `TASK-064`.

Files changed:
- `AGENTS.md`
- `apps/admin/src/app/login/login-form.tsx`
- `apps/admin/src/components/admin-shell.tsx`
- `apps/admin/src/features/foundation/actions.ts`
- `apps/admin/src/features/foundation/create-organization-form.tsx`
- `apps/admin/src/features/foundation/dashboard.tsx`
- `apps/admin/src/lib/api.ts`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-008-admin-operational-ui.md`

Verification PASS:
- `pnpm --filter @lms/admin lint`
- `pnpm --filter @lms/admin typecheck`
- `pnpm --filter @lms/admin build`

Verification DEFERRED:
- Live browser login/create-organization verification against production Keycloak + API from this local environment. Static build verifies the routes and server action compile, but the actual production credentials/browser flow must be checked after deploy.

Issue/risiko:
- This task wires the minimal Admin foundation path first. Person/account management, assignment/scope management, and broader academic master-data UI remain follow-up Admin work.
- `TASK-064` tetap tidak dikerjakan.
