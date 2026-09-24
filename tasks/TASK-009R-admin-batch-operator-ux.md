# TASK-009R — Admin Batch Operator UX

**Status:** REVIEW

## Scope
Admin `/angkatan` table-first batch workspace with program/curriculum filters, pagination, rows per page, loading/empty/error states, responsive table/card layout, drawer create/edit, and API-backed mutations via `/education-batches`.

## Verification
PASS: `pnpm turbo run lint typecheck build --filter=@lms/admin...`, Prettier, and `git diff --check`. Runtime authenticated browser review remains pending.
