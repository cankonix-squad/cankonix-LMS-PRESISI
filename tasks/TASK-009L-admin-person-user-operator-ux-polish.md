# TASK-009L — Admin Person & User Account Operator UX Polish

**Status:** REVIEW

## Dependency

TASK-009K = DONE.

## Mandatory References

- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`

## Objective

Menyetarakan pengalaman operator Admin `/personel` dengan workspace `/organisasi` tanpa mengubah API, authentication, authorization, atau model Permission + Scope.

## Scope

- Table-first personel workspace with search, person/account status filters, pagination, page-size controls, loading, empty, and friendly error states.
- Personel table showing identity, NIP/NRP, email, organization when available, account information, status, updated date, and actions.
- Drawer-based create/edit and account-management panels with clear `Data Personel` and `Akun Login` sections.
- Honest disabled actions when an API contract is not available; no fake mutations.
- Responsive table/card presentation for desktop, tablet, and mobile.
- Reuse existing Admin design patterns and preserve existing API contracts.

## Acceptance Criteria

- [x] `/personel` is a readable enterprise/operator-first workspace.
- [x] Search, filters, pagination, rows per page, loading, empty, and friendly error states work.
- [x] Person and account data are shown from available API contracts.
- [x] Create/edit and account management use a drawer rather than a permanently expanded form.
- [x] Unavailable actions are visibly disabled with an honest explanation.
- [x] Responsive presentation does not break on smaller screens.
- [x] API, auth, session, and Permission + Scope behavior are unchanged.
- [x] Required checks pass.

## Verification

PASS: `pnpm turbo run lint typecheck build --filter=@lms/admin...`, Prettier, and `git diff --check`.

Implemented `apps/admin/src/features/foundation/person-management.tsx` and replaced the old compact `/personel` summary with search/status filtering, pagination, page-size controls, responsive table/cards, account and placement data, drawer forms, friendly states, and honest disabled actions. Extended `packages/api-client` only with already-available person update, account update, and placement contracts. No backend or auth changes.

Live authenticated browser review is pending/deferred if a production API session is unavailable.

Task is ready for human review. It must remain `REVIEW`, not `DONE`.
