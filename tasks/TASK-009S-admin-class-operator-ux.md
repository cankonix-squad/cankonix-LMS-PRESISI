# TASK-009S — Admin Class Operator UX

**Status:** REVIEW

## Scope
Admin `/kelas` table-first class workspace with batch/program relation filter, search, status filter, pagination, rows per page, loading/empty/error states, responsive table/card layout, drawer create/edit, and API-backed mutations via `/academic-classes`.

## Verification
PASS: `pnpm turbo run lint typecheck build --filter=@lms/admin...`, Prettier, and `git diff --check`. Runtime authenticated browser review remains pending.
