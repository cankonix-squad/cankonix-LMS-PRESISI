# TASK-009X — Admin Frontend Enterprise Standardization

**Status:** REVIEW

## Dependency

TASK-009L = REVIEW. Organization and person operator workspaces are available.

## Mandatory References

- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`

## Objective

Membuat fondasi frontend Admin lebih standar enterprise melalui reusable components yang langsung dipakai oleh halaman `/organisasi` dan `/personel`, tanpa mengubah API, authentication, authorization, atau model Permission + Scope.

## Scope

- Tambahkan reusable Admin components untuk page shell, toolbar/filter, responsive table, action group, drawer, form field/actions, feedback message, dan pagination.
- Refactor `/organisasi` agar memakai reusable components tersebut.
- Refactor `/personel` agar memakai reusable components tersebut.
- Pertahankan table-first operator UX, mobile card fallback, drawer forms, disabled honest actions, search/filter, pagination, dan friendly states.
- Tidak mengubah kontrak API, server actions, auth/session, atau Permission + Scope.

## Acceptance Criteria

- [x] Reusable enterprise Admin components tersedia dan terdokumentasi melalui pemakaian nyata.
- [x] `/organisasi` memakai reusable PageHeader/Toolbar/Table/Drawer/Form/Pagination pattern.
- [x] `/personel` memakai reusable PageHeader/Toolbar/Table/Drawer/Form/Pagination pattern.
- [x] Responsive table/card behaviour tetap aman untuk desktop sempit dan mobile.
- [x] Tidak ada perubahan backend, API, auth, permission, atau persistence.
- [x] Required checks pass.

## Verification

PASS:

- `prettier --check` untuk komponen dan halaman yang berubah.
- `eslint` untuk `admin-design-system.tsx`, `organization-management.tsx`, dan `person-management.tsx`.
- `tsc --noEmit` dari `apps/admin`.
- `next build --webpack` dari `apps/admin`.
- `git diff --check`.

## Implementation Notes — 2026-09-24

- Extended `apps/admin/src/components/admin-design-system.tsx` with reusable enterprise components: `AdminPage`, `PrimaryActionButton`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `StickyActionCell`, `ActionGroup`, `ActionButton`, `EnterpriseDrawer`, `FormField`, `FormActions`, `ActionMessage`, `PaginationBar`, and shared input/action classes.
- Refactored `/organisasi` to consume the reusable page header, filter toolbar, responsive table, sticky action cell, drawer, form fields/actions, feedback message, and pagination bar.
- Refactored `/personel` to consume the same reusable patterns while preserving the existing table-first layout, mobile card fallback, drawer workflows, disabled honest actions, account/person status display, and API/server action contracts.
- No backend, persistence, authentication, authorization, Permission + Scope, or API contract changes were made.

Task is ready for human review. It must remain `REVIEW`, not `DONE`.
