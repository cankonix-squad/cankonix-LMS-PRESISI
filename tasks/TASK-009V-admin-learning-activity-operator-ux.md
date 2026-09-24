# TASK-009V — Admin Learning Activity Operator UX

**Status:** REVIEW

## Scope
Polish Admin `/aktivitas` as an enterprise operator workspace using the existing learning activity, meeting, class-subject, and activity-type APIs.

## Acceptance criteria
- Table-first responsive list with search, relationship/status filters, pagination, page size, loading, empty, and friendly error states.
- Create/edit panel and explicit status transitions use the existing API contract.
- No backend or database changes.

## Verification
- `pnpm turbo run lint typecheck build --filter=@lms/admin...` — PASS
- `git diff --check` — PASS
- Live authenticated API/browser review remains pending.
