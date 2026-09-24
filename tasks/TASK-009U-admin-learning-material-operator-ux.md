# TASK-009U — Admin Learning Material Operator UX

**Status:** REVIEW

## Scope
Polish Admin `/materi` as an enterprise operator workspace over the existing nested learning-content API. Materials are displayed from activities because the API has no standalone material collection endpoint.

## Acceptance criteria
- Table-first responsive material list with search, status filter, pagination, page size, loading, empty, and friendly error states.
- Create/edit panel uses the existing activity context and records content metadata only; it never invents object-storage keys.
- Detail and unsupported actions are honest; status transitions use the existing content lifecycle endpoint.
- No backend or database changes.

## Verification
- `pnpm turbo run lint typecheck build --filter=@lms/admin...` — PASS
- `git diff --check` — PASS
- Live authenticated API/browser review remains pending.
