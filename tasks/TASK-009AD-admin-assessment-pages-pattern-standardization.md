# TASK-009AD — Admin Assessment Pages Pattern Standardization

Status: REVIEW

## Goal

Extend the enterprise Admin UI pattern to the Ujian & Penilaian area:
`/assessment`, `/bank-soal`, `/exam`, and `/grading`.

## Scope

- Create `/assessment` — full CRUD workspace for TASK-040 `assessments`.
- Create `/bank-soal` — full CRUD workspace for TASK-041 `question-banks`.
- Create `/exam` — honest placeholder, since the `exams` API exposes no list endpoint.
- Create `/grading` — read + create workspace for TASK-050 `grading-schemes`.
- Expand `@lms/api-client` with the grading-scheme / final-grade contracts needed to render these pages.
- Wire the four routes into the Admin sidebar `Ujian & Penilaian` group.
- Keep all existing API contracts, auth, session, and Permission + Scope model unchanged.

## Out of Scope

- Backend changes (no controller/service/schema edits).
- New domain behaviour (e.g. a `GET /exams` list endpoint, grading-scheme component manager, final-grade UI).
- Keycloak/login theme work.
- Reporting/executive features.
- Educator/student/executive portals.
- TASK-064/TASK-065.

## Implementation

### `@lms/api-client` additions
- Added `GradingScheme`, `GradingComponent`, `GradingSchemeStatus`,
  `FinalGrade`, `FinalGradeStatus`, `CreateGradingSchemeInput`,
  `CreateGradingComponentInput`, `CalculateFinalGradeInput` types.
- Added `gradingSchemes.{list,get,create,addComponent}` and
  `finalGrades.{get,calculate,recalculate,approve,reopen}` client methods.
  `gradingSchemes.list()` returns the real plain array shape (`findMany`), not a
  paged wrapper — the backend has no paging there yet.
- Widened `ClassSubject` to the actual DTO (`curriculumSubjectId`, `code`,
  `displayName`, `startDate`, `endDate`, `status ACTIVE|INACTIVE|COMPLETED`)
  while keeping `subjectId`/`educatorPersonId` optional for
  educator/student consumers.

### `/assessment` (`features/assessment/`)
- `assessment-actions.ts` (server actions): `createAssessmentAction`,
  `updateAssessmentAction`, `changeAssessmentStatusAction`.
- `assessment-workspace.tsx`: `AdminPage`, `PageHeader`,
  `PrimaryActionButton`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`,
  `StickyActionCell`, `EnterpriseDrawer`, `FormField`, `FormActions`,
  `ActionButton`, `ActionGroup`, `ActionMessage`, `StatusBadge`,
  `PaginationBar`, `enterpriseInputClass`.
- Status filter: "Semua"/"Draft"/"Dipublikasikan"/"Ditutup"/"Diarsipkan".
- Lifecycle actions in the table: `Publikasikan` (DRAFT), `Tutup` +
  `Kembali Draft` (PUBLISHED), `Arsipkan` (CLOSED) via
  `changeAssessmentStatusAction`.
- Drawer create/edit with class-subject select, assessment-type select, title,
  description, max score, weight, availability window, status.
- `assessment-labels.ts` holds the pure `statusLabel` / `statusBadgeTone` /
  `gradingStatusLabel` / `gradingStatusTone` helpers (kept out of the
  `'use server'` action modules, which must only export async functions).

### `/bank-soal` (`features/assessment/`)
- `question-bank-actions.ts`: `createQuestionBankAction`,
  `updateQuestionBankAction`, `updateQuestionBankStatusAction`.
- `question-bank-workspace.tsx`: same reusable component set. Status filter
  "Semua"/"Aktif"/"Nonaktif"; curriculum select in the toolbar; activate/
  deactivate action; create/edit drawer.

### `/exam` (`features/assessment/exam-placeholder.tsx`)
- The backend `exams` (TASK-042) and `exam-sessions` (TASK-043) modules only
  expose by-id routes (`GET/PATCH /exams/:id`, `/exam-sessions/:id`, …). There
  is **no list endpoint** for an admin table, so building a full workspace
  would require a backend change. The page renders a branded `EmptyState`
  explaining "Pengelolaan ujian belum tersedia" and the missing contract.

### `/grading` (`features/assessment/`)
- `grading-actions.ts`: `createGradingSchemeAction`.
- `grading-workspace.tsx`: table listing grading schemes (client-side
  search/status/pagination because the list endpoint is not server-paged),
  create drawer. Component management (`addComponent`) is intentionally left
  disabled with a clear "Komponen" button explaining no admin contract yet.
- `/grading/page.tsx` builds a class-subject label map from `displayName` /
  `code` / `curriculumSubjectId`.

### Sidebar
- `apps/admin/src/components/admin-shell.tsx`: the `Ujian & Penilaian` group
  items now point to `/assessment`, `/bank-soal`, `/exam`, `/grading`.

## Verification

- `cd packages/api-client && ../../node_modules/.bin/tsc -p tsconfig.json` — PASS
- `cd apps/admin && ../../node_modules/.bin/eslint src` — PASS
- `cd apps/admin && ../../node_modules/.bin/tsc --noEmit` — PASS
- `cd apps/admin && ./node_modules/.bin/next build --webpack` — PASS
  (routes `/assessment`, `/bank-soal`, `/exam`, `/grading`)
- `git diff --check` (repo root) — PASS

## Limitations / Deferred

- `/exam` is a placeholder: the `exams` API has no `GET /exams` list route.
- `/grading` shows schemes but component add/edit and manual/auto answer
  grading are not surfaced (no list/read contracts wired for admin, and the
  answer-grading routes are keyed by attempt/answer id).
- `grading-schemes` list endpoint returns an unpaginated array; the `/grading`
  workspace paginates on the client until a server-paged contract exists.

## Notes

- Backend, auth, session, and Permission + Scope model were not changed.
- Other developers' changes in other task files were preserved.
- No new dependencies were added.