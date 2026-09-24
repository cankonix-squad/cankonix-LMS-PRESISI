# TASK-009Q — Admin Subject Operator UX

**Status:** REVIEW

## Dependency
TASK-009P = REVIEW; TASK-011 = DONE-WITH-DEFERRED.

## Scope
Admin `/mata-pelajaran` table-first subject workspace with search, status filter, pagination, rows per page, loading/empty/error states, responsive table/card layout, drawer create/edit, and honest disabled Detail action. Mutations use the existing `/subjects` API contract; no backend/auth/authorization changes.

## Verification
PASS: `pnpm turbo run lint typecheck build --filter=@lms/admin...`, Prettier, and `git diff --check`. Runtime authenticated browser review remains pending.
