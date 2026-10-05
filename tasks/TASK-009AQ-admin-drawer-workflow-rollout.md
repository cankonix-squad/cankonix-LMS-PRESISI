# TASK-009AQ — Admin drawer workflow rollout

**Status:** REVIEW

## Authorization and dependencies

User explicitly approved TASK-009K and requested "terapkan disemua" on 2026-10-05. This is one cross-page Admin UI correction task. TASK-009K = DONE. Existing Admin workspaces, actions, and typed API contracts are present; their previously deferred infrastructure checks do not technically block this frontend correction. No FIX REQUIRED task is declared in MASTER-CHECKLIST.

## Mandatory references

- `docs/02-domain-architecture.md`
- `docs/05-api-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`
- `apps/admin/AGENTS.md`

## Scope

All existing Admin drawers and list filters: Organization, Data Individu, Akun Pengguna, Peran & Hak Akses, Penugasan & Cakupan, Program, Kurikulum, Mata Pelajaran, Angkatan, Kelas, Enrollment, Materi, Aktivitas, Tugas, Assessment, Bank Soal, Skema Penilaian, and existing read-only graduation/certificate detail drawers. Existing reporting/audit filters are inspected for consistent usable controls. Admin only; no new backend operations, API contracts, schema, migration, auth/permission changes, or dependencies.

## Plan

1. Add shared per-workspace drawer retention and action handling, retaining live form/component state per operation and record while panels are closed.
2. Handle Esc/close/cancel consistently, block dismiss/edit during save, preserve failed submissions, and return successful mutations to the existing revalidated list with feedback.
3. Integrate every existing Admin drawer and make supported status filters explicit alongside search, preserving URL filters and pagination.
4. Add workflow regression coverage, run lint/typecheck/tests/production build/format checks, document runtime limitations, and stop at REVIEW.

## Acceptance criteria

- [x] Esc closes any active panel without losing unfinished input.
- [x] Drafts remain separate per create/edit/record; closing and reopening retains input and dependent selection state.
- [x] Successful mutations close the panel, clear only that panel draft, and report success on the list; failed saves retain inputs and error feedback.
- [x] All close routes and editable fields are guarded while any hosted form mutation is pending.
- [x] Existing supported list filters remain functional, explicit and consistent; submitting a filter resets pagination while retaining related filters/page size.
- [x] Read-only panels support Esc; API/auth/Permission + Scope and other apps unchanged.
- [x] Verification evidence recorded; task moved to REVIEW, not automatically DONE.

Drafts live only in the mounted workspace (no disk/localStorage); reload/navigation is outside draft lifetime. Browser/runtime verification may be DEFERRED if the connected browser/API session is unavailable.

## Implementation evidence — 2026-10-05

- Shared `components/admin/drawer-workflow.tsx`: `DrawerHost` retains live subtrees per operation/record key while hidden/inert, preserving text/select/file inputs and dependent React selections. `useDrawerActionState` guards double submits and closes/clears only after an actual successful mutation, with list feedback. Expected API failures retain state; thrown transport/application failures become an honest "hasil penyimpanan belum dapat dipastikan" message; Next.js navigation exceptions are rethrown through the installed `unstable_rethrow` API. Cleanup always releases the busy guard.
- Shared `EnterpriseDrawer`: Esc, labelled dialog, initial/final focus, keyboard Tab containment, pending close buttons, and a disabled fieldset around hosted forms. Its reset handler cancels React's automatic form reset so a resolved failure cannot erase uncontrolled inputs. `FormActions` uses the same guarded close path. Only the active cached panel registers keyboard handlers.
- Integrated every other existing Admin drawer: Data Individu, Akun Pengguna (including sibling Keycloak forms), Peran & Hak Akses, Penugasan & Cakupan, Program, Kurikulum, generic Mata Pelajaran/Angkatan/Kelas/Enrollment, Materi, Aktivitas, Tugas, Assessment, Bank Soal, Grading, and read-only Kelulusan/Keputusan Kelulusan/Sertifikat/Template Sertifikat. Organization keeps the already approved controlled-draft implementation and receives shared keyboard/focus behavior. No new forms or unsupported CRUD endpoints were invented.
- Shared `StatusFilter` makes supported status options visible in GET forms; filter-derived form keys reflect URL/tab changes. Related filters/page size stay intact and only the filtered list's page resets. Role and permission searches now preserve each other's filters/pages/page sizes. Generic academic status options match each entity; Angkatan/Enrollment expose supported program/batch/class selectors instead of a search ignored by their API. Current selected related ids absent from the bounded option list remain selectable rather than silently resetting.
- Grading already has working local search/status/reset. Reporting and Audit already expose their supported dimension/date/resource filters and have no editable drawers; their existing controls remain available. Nilai Akhir and Ujian placeholder pages have no implemented list/form contract, so this correction does not add fake filter or save operations there.
- Drafts are workspace-memory only. Refresh/navigation ends their lifetime. Existing lookup limits (often 100 active options) and existing list source/pagination limits remain; this task is not backend directory/pagination redesign. Cached hidden forms remain mounted until workspace unmount or successful save.
- No dependency, backend, schema/migration, authentication/authorization, Permission + Scope, or other application change. Pre-existing unrelated working-tree edits were retained. No commit, push or deployment.

## Verification evidence

- Admin tests: 62/62 PASS, including 27 new shared workflow/filter regression tests plus the prior 35. The stateful hook driver tests real handlers across dismiss/reopen/switch/success/failure/pending/duplicate submission/transport/navigation/read-only-refresh behavior; rendered feature tests cover supported statuses and related filter preservation. Existing Keycloak regression tests now verify actual API dispatch through wrappers rather than function names/references; sibling forms remain verified.
- `pnpm test`: PASS, 6/6 Turbo tasks, API 491/491 + api-client 12/12 + Admin 62/62 = 565 passing tests; 5 tasks served from valid Turbo cache.
- Admin ESLint: PASS. `pnpm lint`: 11/11 Turbo lint tasks PASS, root Prettier fails on 36 pre-existing files outside the changed task file set. Scoped Prettier PASS and git diff --check PASS.
- `pnpm turbo run typecheck --only`: PASS, 11/11 tasks (10 cached), including Admin `next typegen` and `tsc --noEmit` on final changes. Default `pnpm typecheck` is blocked by its mandatory build dependency: Admin Turbopack fails creating a process/binding a port with `Operation not permitted`. No escalation or package change attempted.
- Default `pnpm build`: fails at the same Admin Turbopack process/port restriction. Independent Admin production webpack build is used for required changed-app verification; final result recorded below.

## Runtime verification DEFERRED

CUA inventory on this turn reports `apps=[]`, `browsers=[]`. Browser DOM/keyboard/focus/form-reset behavior and authenticated real API end-to-end were not exercised. Tests use hook/event doubles and rendered element trees, not a browser, so do not claim live UI acceptance. No Docker installed. These deferrals do not technically block frontend implementation review.

## Final checkpoint

`pnpm --filter @lms/admin exec next build --webpack`: PASS, exit 0, TypeScript PASS and 36 routes generated. Required changed-app tests/lint/typecheck/build and scoped formatting are green. Task is REVIEW for human review; no subsequent task started and no automatic DONE approval inferred. Default monorepo script limitations and live-browser deferral remain as stated above.

## Publication preparation — 2026-10-05

User explicitly authorized commit and push to `cankonix-squad/cankonix-LMS-PRESISI` branch `main`. A separate worktree based on latest `origin/main` (`926a5e06`) isolates TASK-009K/009AQ from unrelated local TASK-009AP 404, TASK-009J runtime notes, and TASK-069 API/Educator work. The overlapping 404 account-label hunk is excluded from the published person workspace. Earlier full-workspace verification counts above include that unrelated 404 regression and API/Educator work; the isolated publish candidate has Admin 61/61 tests PASS, ESLint PASS, and `next typegen` + `tsc --noEmit` PASS. No credentials or node_modules symlinks are included. Task remains REVIEW; a push request is not automatic implementation DONE approval.

Isolated candidate production webpack build PASS (exit 0, TypeScript and all 36 routes); scoped Prettier and git diff --check PASS. This confirms the exact Admin publication scope independently of the unrelated local work.
