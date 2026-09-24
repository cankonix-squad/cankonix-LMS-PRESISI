# TASK-009Y — Admin Frontend Structure & Component Governance

**Status:** REVIEW

## Dependency

TASK-009X = REVIEW.

## Mandatory References

- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`

## Objective

Merapikan struktur reusable frontend Admin agar lebih mudah dilanjutkan oleh developer dan AI lain tanpa menumpuk semua komponen enterprise dalam satu file besar.

## Scope

- Pecah `admin-design-system.tsx` menjadi modul reusable di `apps/admin/src/components/admin/`.
- Tambahkan barrel export `apps/admin/src/components/admin/index.ts`.
- Pertahankan `admin-design-system.tsx` sebagai compatibility re-export agar halaman lama tidak rusak.
- Tambahkan `components/admin/README.md` berisi convention pemakaian.
- Update `/organisasi` dan `/personel` agar memakai import `@/components/admin`.
- Tidak mengubah visual besar, API, auth, permission, backend, atau persistence.

## Acceptance Criteria

- [x] Komponen admin dipisah menjadi modul page, toolbar, table, drawer, form, actions, feedback, pagination, dan tokens.
- [x] Barrel export tersedia di `@/components/admin`.
- [x] `admin-design-system.tsx` tetap kompatibel melalui re-export.
- [x] `/organisasi` dan `/personel` memakai import standar baru.
- [x] README convention tersedia.
- [x] Required checks pass.

## Verification

PASS:

- `prettier --check` untuk modul admin components, `/organisasi`, `/personel`, dan task docs.
- `eslint` untuk modul admin components, compatibility re-export, `/organisasi`, dan `/personel`.
- `tsc --noEmit` dari `apps/admin`.
- `next build --webpack` dari `apps/admin`.
- `git diff --check`.

## Implementation Notes — 2026-09-24

- Added modular Admin component structure under `apps/admin/src/components/admin/`:
  `page.tsx`, `toolbar.tsx`, `table.tsx`, `drawer.tsx`, `form.tsx`, `actions.tsx`, `feedback.tsx`, `pagination.tsx`, `tokens.ts`, and `index.ts`.
- Kept `apps/admin/src/components/admin-design-system.tsx` as a compatibility re-export for existing pages that still import the old path.
- Added `apps/admin/src/components/admin/README.md` with frontend conventions for page, table, drawer, form, action, and boundary usage.
- Updated `/organisasi` and `/personel` imports to use the new `@/components/admin` barrel.
- No visual redesign, backend, persistence, auth, Permission + Scope, or API contract changes were made.

Task is ready for human review. It must remain `REVIEW`, not `DONE`.
