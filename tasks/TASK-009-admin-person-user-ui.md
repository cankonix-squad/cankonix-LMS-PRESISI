# TASK-009 — Admin Person & User Account UI

**Status:** REVIEW

## Dependency
TASK-008 = REVIEW. Admin login/session path has been implemented and is awaiting human review.

## Objective
Menyediakan UI Admin awal untuk membuat Person dan menghubungkan UserAccount, agar operator dapat menambah akun/personel dasar tanpa SQL/manual API.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak menambah persistence baru. Gunakan endpoint foundation yang sudah ada: `POST /api/v1/persons`, `GET /api/v1/persons`, `POST /api/v1/persons/:personId/account`, dan `GET /api/v1/persons/:personId/account`.

## API / Application Contract
Admin frontend tetap memakai `packages/api-client`. UI tidak menyimpan credential; `UserAccount` hanya menyimpan identity-provider linkage/lifecycle seperti backend TASK-002.

## Business Rules
Portal bukan security boundary. Backend tetap validasi authoritative dan audit lifecycle account. UI boleh membantu mengisi username/email, tetapi tidak membuat password Keycloak dan tidak mengganti Permission + Scope.

## Acceptance Criteria
[x] Admin dapat membuat Person; [x] Admin dapat sekaligus membuat UserAccount opsional untuk Person tersebut; [x] daftar Person menampilkan status akun bila tersedia; [x] API errors/loading/empty state handled; [x] admin/api-client checks green.

## Aturan Implementasi Wajib
- Jangan mengerjakan `TASK-064` atau task reporting berikutnya secara oportunistik.
- Jangan menyimpan password atau secret pada UI/Admin database.
- Frontend hanya menggunakan `packages/api-client`.
- Setelah available verification berhasil, ubah status task menjadi `REVIEW`, update `MASTER-CHECKLIST`, lalu stop. Codex tidak boleh menandai `DONE`.

## Laporan Akhir Codex
TASK-009 implemented and moved to `REVIEW`.

Perubahan:
- `packages/api-client` now exposes `CreatePersonInput`, `UserAccount`, `CreateUserAccountInput`, `persons.create`, `persons.getAccount`, and `persons.createAccount`.
- Admin Person section now includes a create Person form with optional UserAccount creation.
- Person list now checks `GET /persons/:personId/account` for each visible row and shows account status/identifier when available.
- User-facing copy explicitly states that passwords are not created/stored in LMS; credentials remain managed by SSO/Keycloak.

Endpoints used:
- `GET /api/v1/persons`
- `POST /api/v1/persons`
- `GET /api/v1/persons/:personId/account`
- `POST /api/v1/persons/:personId/account`

Files changed:
- `AGENTS.md`
- `packages/api-client/src/index.ts`
- `packages/api-client/test/client.test.cjs`
- `apps/admin/src/features/foundation/actions.ts`
- `apps/admin/src/features/foundation/create-person-account-form.tsx`
- `apps/admin/src/features/foundation/dashboard.tsx`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-009-admin-person-user-ui.md`

Verification PASS:
- `pnpm --filter @lms/api-client build`
- `pnpm --filter @lms/api-client test` (7 tests)
- `pnpm --filter @lms/admin lint`
- `pnpm --filter @lms/admin typecheck`
- `pnpm --filter @lms/admin build`

Verification DEFERRED:
- Live production browser create-person/account test after GitHub Actions deployment. Static build and API-client endpoint tests passed locally.

Issue/risiko:
- Creating a `UserAccount` does not create a Keycloak user or password. The account can authenticate only after its `externalAuthId` is linked to the corresponding Keycloak subject.
- Account status lookups run per visible person row; acceptable for the current 8-row Admin preview, but should be replaced by a joined/admin summary endpoint if the page becomes a large paginated operator console.
- `TASK-064` tetap tidak dikerjakan.
