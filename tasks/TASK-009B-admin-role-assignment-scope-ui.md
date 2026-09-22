# TASK-009B — Admin Role Assignment & Scope UI

**Status:** REVIEW

## Dependency
TASK-009A = REVIEW. Admin sidebar routing is available and `/assignments` has a dedicated page.

## Objective
Menyediakan UI Admin untuk membuat Role Assignment, menambahkan Scope, dan mengubah status assignment agar UserAccount yang dibuat dari Admin dapat diberi akses operasional.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/05-api-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak menambah persistence baru. Gunakan endpoint authorization yang sudah ada.

## API / Application Contract
Admin frontend memakai `packages/api-client` untuk:
- `POST /api/v1/authorization/assignments`
- `POST /api/v1/authorization/assignments/:id/scopes`
- `PATCH /api/v1/authorization/assignments/:id/status`
- `DELETE /api/v1/authorization/assignments/:id/scopes/:scopeId`

## Acceptance Criteria
[x] Admin dapat membuat assignment; [x] Admin dapat menambah scope; [x] Admin dapat mengubah status assignment; [x] Admin dapat menghapus scope; [x] checks green.

## Laporan Akhir Codex
TASK-009B implemented and moved to `REVIEW`.

Perubahan:
- Added API client methods for assignment create, scope add, status update, and scope removal.
- Added endpoint coverage in `packages/api-client/test/client.test.cjs`.
- Added `/assignments` management forms for:
  - creating role assignments,
  - adding scopes,
  - changing assignment status,
  - removing scope rows.
- Assignment form uses visible Person/UserAccount rows and active Roles as selectable sources.

Files changed:
- `packages/api-client/src/index.ts`
- `packages/api-client/test/client.test.cjs`
- `apps/admin/src/features/foundation/actions.ts`
- `apps/admin/src/features/foundation/assignment-management.tsx`
- `apps/admin/src/features/foundation/dashboard.tsx`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-009B-admin-role-assignment-scope-ui.md`

Verification PASS:
- `pnpm --filter @lms/api-client build`
- `pnpm --filter @lms/api-client test` (8 tests)
- `pnpm --filter @lms/admin lint`
- `pnpm --filter @lms/admin typecheck`
- `pnpm --filter @lms/admin build`

Verification DEFERRED:
- Live production browser create/update/remove assignment operations after CI/CD deployment.

Issue/risiko:
- The selectable UserAccount list is derived from the first 50 visible persons and one account lookup each. This is acceptable for the current Admin foundation workflow, but a dedicated admin user-account search endpoint should replace it for a large operator console.
- `TASK-064` tetap tidak dikerjakan.
