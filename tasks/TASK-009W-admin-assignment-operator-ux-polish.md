# TASK-009W — Admin Assignment Operator UX

**Status:** REVIEW

## Scope
Polish Admin `/tugas` as an enterprise operator workspace over the existing assignment API and activity relationship.

## Acceptance criteria
- Table-first responsive list with search, status/class-subject filters, pagination, page size, loading, empty, and friendly error states.
- Create/edit panel covers title, instructions, activity, deadline, and supported assignment controls.
- Submission count is shown only when an available contract supplies it; unsupported actions remain honest.
- No backend or database changes.

## Verification
- `pnpm turbo run lint typecheck build --filter=@lms/admin...` — PASS
- `git diff --check` — PASS
- Submission count and attachment actions remain explicitly unavailable because the list contract does not provide them.
- Live authenticated API/browser review remains pending.
