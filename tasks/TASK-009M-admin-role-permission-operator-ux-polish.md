# TASK-009M — Admin Role & Permission Operator UX Polish

**Status:** REVIEW

## Dependency

TASK-009L = REVIEW.

## Mandatory References

- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`

## Objective

Menyetarakan pengalaman operator Admin `/roles` dengan workspace `/organisasi` dan `/personel`, tanpa mengubah backend, authentication, authorization, atau model Permission + Scope.

## Scope

- Table-first role workspace with role and permission catalog views.
- Search, status/category filters where contracts expose them, pagination, loading, empty, and friendly error states.
- Clear role detail showing identity, description, status, system marker, and attached permissions.
- Honest row actions: detail works through the available read contract; edit and permission/status mutations are enabled only when their existing API contracts are wired, otherwise visibly disabled.
- Responsive desktop table and mobile card presentation.
- Reuse Admin design patterns and preserve existing API contracts.

## Acceptance Criteria

- [x] `/roles` is a readable enterprise/operator-first workspace.
- [x] Role and permission data are shown clearly with search, status/category filters where available, and pagination-ready layout.
- [x] Role detail exposes name, code, description, status, and attached permissions.
- [x] Loading, empty, and friendly error states are present.
- [x] Unavailable mutations are visibly disabled with an honest explanation; no fake mutation is introduced.
- [x] Responsive presentation does not break on smaller screens.
- [x] API, auth, and Permission + Scope behavior are unchanged.
- [x] Required checks pass.

## Verification

Implemented `apps/admin/src/features/foundation/role-permission-management.tsx` and rewired `/roles` to a table-first role workspace. The page now supports independent role and permission search, role status filters, pagination-ready query state, responsive desktop/mobile presentations, status/system/category badges, role permission counts from the existing read endpoint, a detail drawer with attached permissions, route loading skeleton, empty states, and friendly API errors. Edit, permission management, and status mutation actions remain visibly disabled with an honest explanation because this Admin screen does not yet have mutation wiring and must not fake state changes.

Extended `packages/api-client` only with the existing role status query and role-permission read endpoint. No backend, authentication, authorization, or Permission + Scope behavior changed.

Verification PASS:

- `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- Prettier on changed source/task files
- `git diff --check`

Live authenticated browser review of `/roles` remains pending if an API session is unavailable. Task is ready for human review and must remain `REVIEW`, not `DONE`.
