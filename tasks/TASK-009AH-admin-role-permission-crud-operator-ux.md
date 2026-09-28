# TASK-009AH — Admin Role & Permission CRUD Operator UX

**Status:** REVIEW

## Dependency
TASK-009M = REVIEW. `/roles` already has a table-first workspace with search, filters, pagination, and detail drawer.

## Mandatory References
- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`

## Objective
Menjadikan `/roles` halaman enterprise CRUD-ready dengan kemampuan membuat, mengedit, mengaktifkan/menonaktifkan role, serta attach/detach permission. Wiring hanya untuk endpoint yang sudah tersedia di backend.

## Backend Endpoint Inventory
Semua endpoint mutation berikut **sudah tersedia** di backend (`AuthorizationController`):

| Method | Path | Permission Required | Fungsi |
|--------|------|---------------------|--------|
| POST | `/authorization/roles` | `authorization.role.manage` | Buat role |
| POST | `/authorization/roles/:id` | `authorization.role.manage` | Update role |
| DELETE | `/authorization/roles/:id` | `authorization.role.manage` | Hapus role |
| POST | `/authorization/roles/:roleId/permissions/:permissionId` | `authorization.role.manage` | Attach permission |
| DELETE | `/authorization/roles/:roleId/permissions/:permissionId` | `authorization.role.manage` | Detach permission |
| POST | `/authorization/permissions` | `authorization.permission.manage` | Buat permission |

**Kesimpulan:** Tidak ada fake mutation — semua endpoint sudah ada. Wiring penuh.

## Scope

1. **api-client wiring** — tambah method dan types:
   - `CreateRoleInput`, `UpdateRoleInput`, `CreatePermissionInput`
   - `authorization.createRole()`, `authorization.updateRole()`, `authorization.deleteRole()`
   - `authorization.grantPermission()`, `authorization.revokePermission()`
   - `authorization.createPermission()`

2. **Server actions** — tambah di `actions.ts`:
   - `createRoleAction`
   - `updateRoleAction`
   - `updateRoleStatusAction`
   - `grantPermissionAction`
   - `revokePermissionAction`

3. **UI `/roles`** — rewrite `role-permission-management.tsx`:
   - Tombol "Buat Role" di header
   - Table role dengan action: Detail, Edit, Aktifkan/Nonaktifkan
   - Create/Edit drawer menggunakan form pattern dari organisasi
   - Detail drawer diperluas: tampilkan permission + tombol attach/detach
   - Jika operator tidak punya `authorization.role.manage`, tombol mutation disabled dengan helper text jelas
   - Jika operator tidak punya `authorization.role.read`, error state menjelaskan permission yang kurang dan mengarahkan ke `/assignments`

4. **Error state permission ramah operator**:
   - Jelaskan permission yang kurang
   - Beri arahan: buka `/assignments` dan assign role yang memiliki permission `authorization.role.read`, `authorization.permission.read`, dan permission manage terkait

5. **Jangan hardcode role** — Role adalah data operasional, security tetap Permission + Scope.

6. **Jangan menyentuh** portal educator/student/executive.

7. **Pertahankan** API/auth/session/permission model yang ada.

## Acceptance Criteria
- [x] Operator bisa membuat, mengedit, dan mengaktifkan/menonaktifkan role dari UI.
- [x] Operator bisa attach/detach permission di detail drawer.
- [x] Tombol mutation disabled dengan penjelasan jika permission kurang.
- [x] Error state permission ramah operator dengan panduan ke `/assignments`.
- [x] Search, filter status, pagination tetap berfungsi.
- [x] Responsive presentation tidak rusak.
- [x] API, auth, dan Permission + Scope behavior tidak berubah.
- [x] Tidak ada fake mutation.
- [x] Required checks pass: lint, typecheck, build, api-client test.

## Laporan Akhir Codex
TASK-009AH implemented and moved to `REVIEW`.

Backend/Api-client inventory memastikan semua endpoint mutation berikut SUDAH tersedia di backend (`AuthorizationController`), sehingga tidak ada fake mutation:
- `POST /authorization/roles` → createRole
- `POST /authorization/roles/:id` → updateRole
- `DELETE /authorization/roles/:id` → deleteRole (tidak dipakai di UI karena delete role berisiko tinggi dan tidak diminta scope)
- `POST /authorization/roles/:roleId/permissions/:permissionId` → attach
- `DELETE /authorization/roles/:roleId/permissions/:permissionId` → detach

Perubahan:
- `packages/api-client`: tambah types `CreateRoleInput`, `UpdateRoleInput`, `CreatePermissionInput`, `RolePermissionOutcome`, `RolePermissionMutationResult`, `RoleDetail`; method `createRole`, `updateRole`, `deleteRole`, `grantPermission`, `revokePermission`, `createPermission`.
- `actions.ts`: tambah server actions `createRoleAction`, `updateRoleAction`, `updateRoleStatusAction`, `grantPermissionAction`, `revokePermissionAction`.
- `role-permission-management.tsx`: tombol "Buat role" di header, Edit aktif, Aktifkan/Nonaktifkan (system role dilindungi), detail drawer dengan attach/detach permission, dan error state operator-friendly yang menjelaskan permission kurang & mengarahkan ke `/assignments`.

Tidak dikerjakan di scope ini (namun endpoint tersedia):
- Delete role (tidak diminta; system role tidak boleh dihapus).
- Create permission UI (katalog permission tetap read-only; `createPermission` tersedia di client untuk follow-up).

Verification PASS:
- `pnpm --filter @lms/api-client build`
- `pnpm --filter @lms/api-client test` (9 tests)
- `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- `git diff --check`

Task siap direview manusia dan tetap di `REVIEW`, bukan `DONE`.

## Verification
- `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- `pnpm --filter @lms/api-client build`
- `pnpm --filter @lms/api-client test`
- `git diff --check`

## Files to Change
- `packages/api-client/src/index.ts`
- `packages/api-client/test/client.test.cjs`
- `apps/admin/src/features/foundation/actions.ts`
- `apps/admin/src/features/foundation/role-permission-management.tsx`
- `apps/admin/src/app/roles/page.tsx`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-009AH-admin-role-permission-crud-operator-ux.md` (this file)