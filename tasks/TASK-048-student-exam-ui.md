# TASK-048 — Student Exam UI

**Status:** DONE

## Dependency
TASK-044, TASK-045 = DONE.

## Implementation Report (2026-09-18)

### Files created / modified
- `apps/student/src/app/ujian/page.tsx` — server component page (`/ujian`, query
  params `?attempt=`, `?participant=`; env fallback `STUDENT_ATTEMPT_ID` /
  `STUDENT_PARTICIPANT_ID`)
- `apps/student/src/features/exam/exam-runtime.tsx` — client runtime: sticky
  server-derived countdown, question navigator, autosave status, submit
  confirmation with unanswered count
- `apps/student/src/features/exam/exam-start-form.tsx` — eligibility/start form
  that calls the start action and routes to `?attempt=<id>`
- `apps/student/src/features/exam/exam-view.ts` — framework-free helpers
  (`remainingMs`, `formatDuration`, `isUrgent`, `buildAnswerPayload`,
  `readSavedKeys`, `readSavedText`, `answeredCount`, `revisionOf`,
  `applySavedAnswer`)
- `apps/student/src/features/exam/actions.ts` — server actions for start, save
  answer and submit (participant token stays server-side)
- `apps/student/src/components/student-shell.tsx` — added `/ujian` to the shared
  navigation (desktop + mobile bottom bar)
- `packages/api-client/src/index.ts` — attempt runtime types (`AttemptQuestion`
  with data-driven `questionType`) and `attempts` client namespace
- `apps/api/src/attempts/attempt-response.ts` — **security fix**, see below
- `apps/api/src/attempts/attempts.service.ts` — repository contract returns the
  participant-safe projection; `expiresAt`/`statusOf` reads; idempotent submit
- `apps/api/test/attempts.test.cjs` — answer-key leak regression tests
- `packages/api-client/test/client.test.cjs` — attempt endpoint contract test

### Security defect remediated (TASK-044/045)
The attempt read path used a Prisma `include` that returned the entire
`QuestionVersion` row, so `scoringRule` (the answer key) and `explanation`
travelled to the examinee on start/get/submit. TASK-044 claimed "no answer leak"
but had no test asserting it.

Fixed with two independent defences:
1. `ATTEMPT_SELECT` — an explicit Prisma `select` that never fetches
   `scoringRule`, `explanation` or `maxScore`.
2. `toStudentAttempt()` — an allow-list builder that constructs the response
   field by field (never spreads, never deletes).

Regression tests walk the full serialized payload recursively for
`scoringRule`/`explanation`/`isCorrect`/`correctKeys`/`maxScore` and assert the
select never requests them. This is not new persistence; it corrects the read
contract the UI depends on for the "Do not cache answer key" business rule.

### Expiry handling gap closed in review
The countdown originally only *displayed* expiry: `expired` greyed out the form
and disabled the submit button, but nothing ever called the API. Because the
server moves an attempt out of `IN_PROGRESS` only on submit, an abandoned-but-open
tab would have left the attempt open indefinitely and the `EXPIRED` message
branch in `submit()` was unreachable dead code.

The one-second tick now finalizes the attempt when the server deadline passes
(`remainingMs(expiresAt, tick) <= 0`), so the server records `EXPIRED` and the
participant sees the "Waktu habis" message. That path deliberately skips the
pending-edit flush, since the deadline has passed and the API would reject those
writes anyway; answers already persisted remain intact. `submit` was converted to
`useCallback` with an `inFlight` ref so a manual submit and the automatic expiry
submit cannot both fire.

### Verification (PASS)
- `pnpm lint` — 11/11 packages, Prettier clean
- `pnpm typecheck` — 14/14 packages
- `pnpm build` — 11/11 packages (including `@lms/student` route `/ujian`)
- `pnpm test` — **219 API + 6 api-client = 225, 0 fail**

### Deferred
- Student runtime browser interaction against a live Keycloak + API, including a
  real refresh mid-attempt and timer expiry (no Docker/container runtime
  available).
- `apps/student` has no test runner, so the runtime is covered by the shared
  `@lms/api` / `@lms/api-client` suites and by the pure helpers in `exam-view.ts`;
  adding a frontend test harness is out of scope for this task and would require
  new dependencies.

## Objective
Student exam UI mobile-first yang aman terhadap refresh.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak ada persistence baru.

## API / Application Contract
Eligibility/start, timer based on server expiresAt, question navigation, autosave state, submit confirmation.

## Business Rules
Timer display derived from server timestamps. Resume reload saved answers. Do not cache answer key. Clear autosave/error status.

## Acceptance Criteria
[x] refresh/resume; [x] autosave UI; [x] expiry handling; [x] student build green.

## Aturan Implementasi Wajib
- Baca `AGENTS.md`, `tasks/MASTER-CHECKLIST.md`, dan dokumen pada `docs/` yang relevan sebelum coding.
- Backend tetap **NestJS Modular Monolith**. Jangan membuat microservice.
- Alur backend: Controller → Application Service → Domain/Business Logic → Repository → Prisma → PostgreSQL. Controller tidak boleh mengakses Prisma langsung.
- Semua input API divalidasi; perubahan database memakai Prisma migration; business logic baru wajib memiliki test.
- Gunakan `/api/v1`; jangan hardcode role untuk authorization. Permission + scope tetap menjadi security boundary.
- Jangan mengerjakan task berikutnya secara oportunistik.
- Jika Docker/database runtime tidak tersedia, verification runtime boleh dicatat `DEFERRED` hanya bila bukan blocker teknis task. Jangan menginstal runtime container otomatis.
- Setelah implementasi dan verification yang tersedia berhasil, ubah status task menjadi `REVIEW`, update `MASTER-CHECKLIST`, lalu STOP. Codex tidak boleh menandai `DONE`.

## Laporan Akhir Codex
Laporkan file dibuat/diubah, migration/schema, endpoint, test, hasil lint/typecheck/test/build, verification yang DEFERRED, issue/risiko, dan konfirmasi bahwa task berikutnya tidak dikerjakan.
