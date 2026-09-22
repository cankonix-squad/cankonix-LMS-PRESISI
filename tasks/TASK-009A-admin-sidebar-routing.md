# TASK-009A — Admin Sidebar Routing

**Status:** REVIEW

## Dependency
TASK-009 = REVIEW. Admin Person & User Account UI is available for routing into a dedicated page.

## Objective
Mengubah Admin foundation console dari satu halaman anchor menjadi shell operasional dengan sidebar dan route per area foundation.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/07-security-standards.md`

## Data Model / Persistence
Tidak ada persistence baru.

## API / Application Contract
Tidak menambah endpoint. Route baru memakai panel Admin yang sudah mengonsumsi `packages/api-client`.

## Acceptance Criteria
[x] Sidebar tersedia; [x] route `/organisasi`, `/personel`, `/roles`, `/assignments` tersedia; [x] root tetap redirect ke `/login` saat anonymous; [x] checks green.

## Laporan Akhir Codex
TASK-009A implemented and moved to `REVIEW`.

Perubahan:
- `AdminShell` now uses a sidebar-first operational layout with Foundation navigation.
- Added dedicated Admin routes:
  - `/organisasi`
  - `/personel`
  - `/roles`
  - `/assignments`
- Refactored foundation dashboard panels so the root dashboard and dedicated pages reuse the same API-backed panels.
- Anonymous access to the new routes redirects to `/login`, matching root behavior.

Files changed:
- `apps/admin/src/components/admin-shell.tsx`
- `apps/admin/src/features/foundation/dashboard.tsx`
- `apps/admin/src/app/organisasi/page.tsx`
- `apps/admin/src/app/personel/page.tsx`
- `apps/admin/src/app/roles/page.tsx`
- `apps/admin/src/app/assignments/page.tsx`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-009A-admin-sidebar-routing.md`

Verification PASS:
- `pnpm --filter @lms/admin lint`
- `pnpm --filter @lms/admin typecheck`
- `pnpm --filter @lms/admin build`
- `curl -I http://localhost:3000/organisasi` returns `307` with `location: /login` when anonymous.

Verification DEFERRED:
- Live production browser navigation after CI/CD deployment.

`TASK-064` tetap tidak dikerjakan.
