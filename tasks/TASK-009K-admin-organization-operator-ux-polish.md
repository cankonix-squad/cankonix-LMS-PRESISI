# TASK-009K — Admin Organization Operator UX Polish

**Status:** DONE

## Dependency

TASK-009J = REVIEW. Admin local Keycloak login callback is available.

## Objective

Memoles halaman Admin `/organisasi` agar nyaman dipakai operator awam dan tetap siap menangani data organisasi dalam jumlah besar tanpa mengubah API, authorization, atau permission model.

## Scope

- Table-first organization workspace with search, status filter, pagination, page size, empty and error states.
- Create/edit organization in a side drawer rather than inline page content.
- Clear operator actions and non-fake disabled detail placeholder when no detail route exists.
- Responsive table with compact mobile cards.
- Clear form validation hints and save/cancel actions.
- Preserve existing server actions and organization API contracts.

## Acceptance Criteria

[x] Desktop organization page is table-first and readable for large datasets.
[x] Search, status filter, pagination, page size, empty state, error state, and loading state are clear.
[x] Create/edit form uses a drawer with explicit save and cancel actions.
[x] Row actions distinguish Detail, Edit, and status action; unavailable detail does not fake navigation or mutation.
[x] Mobile/tablet presentation does not break and supports compact organization cards.
[x] Existing API and Permission + Scope behavior is unchanged.
[x] Checks green.

## Verification

- PASS: `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- PENDING: local browser review of `/organisasi` against a production API session.

## Implementation Notes — 2026-09-23

- Added a dedicated `/organisasi/loading.tsx` skeleton for navigation and API loading transitions.
- Preserved server-side search, status, pagination, and page-size query behavior.
- Improved operator hierarchy with a Foundation breadcrumb, clearer count copy, and filter labeling.
- Added a compact mobile organization card layout while retaining the desktop horizontal table.
- Added an explicit disabled `Detail` action with an explanation because no detail route is available; no fake navigation or mutation was introduced.
- Added native browser validation hints for organization code and name.
- Added explicit `Batal` action in the drawer and kept existing create/update/status server actions and API contracts unchanged.

Approved by the user on 2026-09-23. Task is complete.

## Review Notes

Task must remain `REVIEW` after implementation. Runtime review requiring a live Admin session may be deferred if unavailable; no Docker installation is required.

## Reopened operator feedback — 2026-10-05

Explicit user feedback reopens this approved implementation for Esc, retained form drafts, successful-save return to list, and visible status filters. Existing organization API dependencies remain available; TASK-009J browser login verification is not a technical dependency of this UI correction. No new task is started.

## Correction implementation — 2026-10-05

Plan: retain separate create/edit drafts in the organization workspace; handle Esc locally and block close while saving; close only after a successful server action with a success notice on the list; expose status selection alongside search while preserving server-side pagination and API contracts.

Implemented in `organization-management.tsx`. Esc, backdrop, X, and Batal close the panel without deleting the current draft. Reopening the same form restores it; different organization ids have separate drafts. Controlled fields preserve values when React resets the form after an action. Saving disables fields and closing; success clears only the saved draft and returns to the revalidated list. Failure leaves the panel and draft available. Status filter offers Semua status/Aktif/Nonaktif, combines with name/code search, resets page on submit, and retains page size. Existing status tabs remain available.

Draft lifetime is the mounted organization workspace, not durable storage: refresh or leaving the page may discard drafts. No API/schema/migration/dependency change; unrelated pre-existing working-tree edits were preserved.

Verification: Admin test suite 35/35 PASS (5 workflow regressions), Admin ESLint PASS, Admin typecheck PASS, Admin production webpack build PASS (36 routes), targeted Prettier PASS, git diff --check PASS. An initial typecheck/build overlap removed generated .next types during tsc; rerunning sequentially passed.

DEFERRED: actual browser keyboard/form/real API end-to-end review. CUA inventory reports apps=[] and browsers=[]; test harness exercises real component handlers/server-action success and failure with API doubles, not browser DOM behavior. No Docker installed and no deployment performed. Reopened task returns to REVIEW for human review; the prior approval is historical, not approval of this correction.

## Reviewer approval — 2026-10-05

User approved this correction: "sudah oke, sekarang terapkan disemua". TASK-009K is DONE by explicit human approval; remaining browser verification is documented above.
