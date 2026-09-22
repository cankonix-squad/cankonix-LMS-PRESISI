# TASK-009D — Admin Enterprise Design System & Foundation UI Polish

**Status:** REVIEW

## Dependency
TASK-009C = REVIEW. Admin enterprise shell and dashboard baseline are available.

## Objective
Membuat Admin portal terasa seperti aplikasi enterprise standar dengan design system kecil yang konsisten, polish visual foundation pages, dan pola table-first untuk organisasi.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/05-api-standards.md`, `docs/07-security-standards.md`

## Data Model / Persistence
Tidak menambah persistence baru. Perubahan terbatas pada frontend Admin.

## API / Application Contract
Admin frontend tetap memakai `packages/api-client` dan endpoint foundation/authorization yang sudah ada. Permission + Scope tetap ditegakkan backend.

## Scope
- Ubah visual ke enterprise standard dengan hybrid dark sidebar + light neutral work surface.
- Buat komponen standar: `PageHeader`, `DataTable`, `Toolbar`, `StatCard`, `FormPanel`, `StatusBadge`, `EmptyState`, `ErrorState`.
- Ubah `/organisasi` menjadi table-first, bukan card list.
- Pindahkan form "Buat organisasi" ke panel operasional yang lebih rapi.
- Tambahkan active sidebar state.
- Tambahkan sidebar hide/unhide.
- Gunakan full-width layout untuk menghilangkan margin kosong kiri/kanan.
- Konsistenkan spacing, typography, radius, border, dan color token.
- Pertahankan API dan permission model.

## Acceptance Criteria
[x] Admin shell memakai hybrid enterprise surface.
[x] Sidebar menampilkan active state sesuai route.
[x] Sidebar dapat di-hide/unhide.
[x] Layout memakai full viewport width tanpa gutter kosong di sisi kiri/kanan.
[x] Design system components tersedia dan dipakai di dashboard/foundation.
[x] `/organisasi` table-first dengan status badge dan action area yang rapi.
[x] Form "Buat organisasi" berada di panel operasional, bukan blok utama di atas list.
[x] Error/empty state tetap ramah operator.
[x] API client dan permission model tidak diubah.
[x] checks green.

## Laporan Akhir Codex
TASK-009D implemented and moved to `REVIEW`.

Perubahan:
- Added Admin design system components: `PageHeader`, `Toolbar`, `StatCard`, `FormPanel`, `DataTable`, `StatusBadge`, `EmptyState`, `ErrorState`.
- Admin shell changed to hybrid enterprise style: dark navy sidebar, light neutral work surface, white topbar, and consistent borders/shadows.
- Sidebar now has route-aware active state through a client navigation component.
- Dashboard now uses design-system cards/table and a lighter enterprise surface.
- `/organisasi` changed to table-first layout with form moved into a right-side operational panel.
- Foundation forms/lists were polished to match the light enterprise surface.
- API client and Permission + Scope model were not changed.

Files changed:
- `apps/admin/src/components/admin-design-system.tsx`
- `apps/admin/src/components/admin-sidebar-nav.tsx`
- `apps/admin/src/components/admin-shell.tsx`
- `apps/admin/src/components/data-state.tsx`
- `apps/admin/src/features/foundation/dashboard.tsx`
- `apps/admin/src/features/foundation/create-organization-form.tsx`
- `apps/admin/src/features/foundation/create-person-account-form.tsx`
- `apps/admin/src/features/foundation/assignment-management.tsx`
- `AGENTS.md`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-009D-admin-enterprise-design-system-foundation-polish.md`

Verification PASS:
- `eslint . --max-warnings=0` from `apps/admin`
- `next typegen` from `apps/admin`
- `tsc --noEmit` from `apps/admin`
- `prettier --check` on changed files
- `next build --webpack` from `apps/admin`

Verification note:
- Default Turbopack build is still not used for local verification in this shell because the local sandbox previously blocked its internal worker port. Webpack production build passed.

Deferred:
- Live production browser check after CI/CD deployment.

## Review Revision — Full-width shell and collapsible sidebar

Reviewer feedback:
- Left/right layout should use the full available viewport width.
- Sidebar should support hide/unhide.

Changes:
- Removed the centered `max-width` shell wrapper so the Admin app spans the full viewport.
- Added a sidebar toggle button in the Admin shell.
- Added collapsed sidebar rendering for desktop: icon-only navigation, hidden brand/actions/status text, and narrower grid column.
- Kept mobile navigation behaviour unchanged.

Verification PASS:
- `eslint . --max-warnings=0` from `apps/admin`
- `next typegen` from `apps/admin`
- `tsc --noEmit` from `apps/admin`
- `prettier --check` on changed files
- `next build --webpack` from `apps/admin`
