# TASK-009AE — Admin Graduation Certificate Pages Pattern Standardization

Status: REVIEW

## Goal

Extend the enterprise Admin UI pattern to the Kelulusan & Sertifikat area:
`/kelulusan` (graduation rules), `/nilai-akhir` (final grade),
`/keputusan-kelulusan` (graduation decisions), `/sertifikat` (certificates),
and `/template-sertifikat` (certificate templates).

## Scope

- Create `/kelulusan` — read-only list + detail + lifecycle (publish/archive)
  workspace for TASK-052 `graduation/rules`.
- Create `/nilai-akhir` — honest placeholder for TASK-051 final grades, since
  the `final-grades` API exposes no list endpoint.
- Create `/keputusan-kelulusan` — list + detail + approve/revoke workspace for
  TASK-053 `graduation/decisions`.
- Create `/sertifikat` — list + detail + revoke workspace for TASK-054/TASK-055
  `certificates`.
- Create `/template-sertifikat` — read-only list + detail workspace for
  TASK-054 `certificate-templates`.
- Expand `@lms/api-client` with the graduation / decision / certificate /
  template contracts needed to render these pages.
- Wire the five routes into the Admin sidebar `Kelulusan & Sertifikat` group.
- Keep all existing API contracts, auth, session, and Permission + Scope model
  unchanged.

## Out of Scope

- Backend changes (no controller/service/schema edits).
- New domain behaviour (e.g. `GET /final-grades` list endpoint, `GET /exams`,
  certificate template create/edit drawer, graduation rule create/edit drawer —
  the rule-create drawer is intentionally omitted because UI-only rule authoring
  is out of this task's scope).
- Keycloak/login theme work.
- Reporting/executive features.
- Educator/student/executive portals.
- TASK-064/TASK-065.

## Implementation

### `@lms/api-client` additions
- Added types: `GraduationRule`, `GraduationRuleList`,
  `GraduationRuleComponentDto`, `GraduationRuleStatus`,
  `GraduationEvaluation`, `GraduationEvaluationOutcome`,
  `BatchEvaluationSummary`, `GraduationDecision`,
  `GraduationDecisionList`, `GraduationDecisionOutcome`,
  `GraduationDecisionStatus`, `GraduationDecisionEvaluation`,
  `CertificateTemplate`, `CertificateTemplateList`,
  `CertificateTemplateStatus`, `Certificate`, `CertificateList`,
  `CertificateStatus`, plus create/update input types.
- Added client methods: `graduation.{listRules,getRule,changeRuleStatus,evaluateBatch,listEvaluations}`,
  `graduationDecisions.{list,get,create,approve,revoke}`,
  `certificateTemplates.{list,get,create,update,changeStatus}`,
  `certificates.{list,get,issue,revoke}`.
- Added server-action helpers in `apps/admin/src/features/graduation/graduation-actions.ts`
  for the mutations that actually have backend routes: rule status change,
  decision approve/revoke, certificate issue/revoke.

### `/kelulusan` (`features/graduation/graduation-workspace.tsx`)
- Uses `AdminPage`, `PageHeader`, `FilterToolbar`, `FilterTabs`,
  `EnterpriseTable`, `StickyActionCell`, `EnterpriseDrawer`, `StatusBadge`,
  `PaginationBar`, `ActionButton`, `ActionGroup`.
- Status filter tabs: "Semua"/"Draft"/"Diterbitkan"/"Arsip"; code search field.
- Lifecycle actions: `Terbitkan` (DRAFT → PUBLISHED) and `Arsipkan`
  (PUBLISHED → ARCHIVED) via `changeGraduationRuleStatusAction`, each with
  explicit confirmation.
- Detail drawer lists rule metadata + components (labels, types, thresholds,
  required flag).

### `/nilai-akhir` (`features/graduation/final-grade-workspace.tsx`)
- The backend `final-grades` (TASK-051) only exposes by-id routes and
  `calculate`/`recalculate`/`approve`/`reopen`; there is **no `GET
  /final-grades` list endpoint**. The page renders a branded `EmptyState`
  explaining "Nilai akhir dihitung otomatis … melalui halaman Grading" with a
  link to `/grading`. No fake list or fake mutation is presented.

### `/keputusan-kelulusan` (`features/graduation/decision-workspace.tsx`)
- Uses the same reusable component set. Status filter tabs
  "Semua"/"Draft"/"Disetujui"/"Dicabut"; verdict (`decision`) select in the
  toolbar.
- Lifecycle actions: `Approve` (DRAFT → APPROVED) and `Revoke`
  (APPROVED → REVOKED) via server actions, each with explicit confirmation.
- Detail drawer shows verdict, status, note, timestamps, revocation reason (if
  revoked), and the frozen evaluation evidence (outcome + snapshot JSON).

### `/sertifikat` (`features/graduation/certificate-workspace.tsx`)
- Uses the same reusable component set. Status filter tabs
  "Semua"/"Diterbitkan"/"Dicabut".
- `Revoke` action (ISSUED → REVOKED) via `revokeCertificateAction`, with
  explicit confirmation. The verdict and the verification code are never shown
  in the table (matching the authenticated projection which omits
  `verificationCode`).
- Detail drawer shows holder, program, batch, template name/version, issue date.

### `/template-sertifikat` (`features/graduation/certificate-template-workspace.tsx`)
- Read-only list + detail. Status filter tabs
  "Semua"/"Draft"/"Aktif"/"Arsip"; code search field.
- Detail drawer shows status, description, timestamps, object-storage artefact
  key, and presentation `config` JSON (non-secret).

### Sidebar
- `apps/admin/src/components/admin-shell.tsx`: the `Kelulusan & Sertifikat`
  group items now point to `/kelulusan`, `/keputusan-kelulusan`, `/nilai-akhir`,
  `/sertifikat`, `/template-sertifikat`.

## Verification

- `cd apps/admin && ../../node_modules/.bin/eslint src` — PASS
- `cd apps/admin && ./node_modules/.bin/tsc --noEmit` — PASS
- `cd apps/admin && ./node_modules/.bin/next build --webpack` — PASS
  (routes `/kelulusan`, `/nilai-akhir`, `/keputusan-kelulusan`, `/sertifikat`,
  `/template-sertifikat`)
- `git diff --check` (repo root) — PASS

## Limitations / Deferred

- `/nilai-akhir` is a placeholder: the `final-grades` API has no list route; a
  final grade is produced on demand by `calculate`/`recalculate` and read by id.
- Graduation rule create/edit and certificate template create/edit are
  intentionally not surfaced (rule/template authoring requires UUID inputs from
  related domains and the task scope is read + lifecycle actions only).
- Certificate issue and graduation decision record are exposed as server
  actions but not wired into a full drawer form (would need enrollment/evaluation
  pickers), so they are available for future wiring without a fake UI.
- The certificate list endpoint has no free-text search parameter, so the
  `/sertifikat` toolbar filters by status only.

## Notes

- Backend, auth, session, and Permission + Scope model were not changed.
- Other developers' changes in other task files were preserved.
- No new dependencies were added.