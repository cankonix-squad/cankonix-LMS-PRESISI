# TASK-009T — Admin Enrollment Operator UX

**Status:** REVIEW

## Scope
Admin `/enrollment` table-first enrollment workspace with participant, batch, class, and status filters, pagination, rows per page, loading/empty/error states, responsive table/card layout, drawer create, class transfer/edit path, and API-backed mutations via `/enrollments`.

## Verification
PASS: `pnpm turbo run lint typecheck build --filter=@lms/admin...`, Prettier, and `git diff --check`. Runtime authenticated browser review remains pending.
