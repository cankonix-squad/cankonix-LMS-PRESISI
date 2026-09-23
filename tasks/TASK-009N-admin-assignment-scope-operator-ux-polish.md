# TASK-009N — Admin Assignment & Scope Operator UX Polish

**Status:** REVIEW

## Dependency

TASK-009M = REVIEW.

## Mandatory References

- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`

## Objective

Menyetarakan pengalaman operator Admin `/assignments` dengan workspace `/organisasi`, `/personel`, dan `/roles`, tanpa mengubah backend, authentication, authorization, atau model Permission + Scope.

## Scope

- Table-first assignment workspace with user/account, role, scope summary, status, updated date, and actions.
- Search and status, role, and scope-type filters where existing contracts support them.
- Pagination, rows per page, loading, empty, and friendly error states.
- Drawer-based create, detail, scope management, and status controls using existing mutation contracts.
- Human-readable account/role selectors and honest UUID fallback when scope target lookup data is unavailable.
- Responsive desktop table and mobile card presentation.

## Acceptance Criteria

- [x] `/assignments` is a readable enterprise/operator-first workspace.
- [x] Search, filters, pagination, rows per page, loading, empty, and friendly error states work.
- [x] Assignment and scope data are shown clearly from available API contracts.
- [x] Create/detail/scope/status operations use drawers and existing API contracts.
- [x] Scope actions are honest and do not fake mutations.
- [x] Responsive presentation does not break on smaller screens.
- [x] API, auth, and Permission + Scope behavior are unchanged.
- [x] Required checks pass.

## Verification

Implemented `apps/admin/src/features/foundation/assignment-scope-management.tsx` and rewired `/assignments` to a table-first operator workspace. The page now shows person/account, role, scope badges, status, updated date, search, status/role/scope filters, local pagination and rows-per-page controls, responsive mobile cards, loading, empty, and friendly error states.

Create, detail, scope management, and status changes use drawers. Existing server actions and API contracts are reused for create assignment, add/remove scope, and status changes. Edit assignment remains visibly disabled because no update-assignment endpoint is available. Scope targets use an explicit UUID fallback with an honest explanation because target-list contracts are not available; no mutation is faked.

Extended `packages/api-client` only with the existing assignment status query field. No backend, authentication, authorization, or Permission + Scope behavior changed.

Verification PASS:

- `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- Prettier on changed source/task files
- `git diff --check`

Local visual smoke check reached `/assignments` and correctly redirected to the public Admin `/login` page without an authenticated session. Authenticated browser review remains pending. Task is ready for human review and must remain `REVIEW`, not `DONE`.
