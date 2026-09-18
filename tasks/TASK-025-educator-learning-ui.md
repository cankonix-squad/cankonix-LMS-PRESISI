# TASK-025 — Educator Learning UI

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-020, TASK-021, TASK-024 = DONE.

## Objective
UI educator untuk meeting, content, assignment dan monitoring.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak ada persistence baru.

## API / Application Contract
Pages/routes educator untuk assigned class subjects, meeting/activity editor, assignment/submission/grading.

## Business Rules
API remains security boundary; educator hanya melihat assignment yang scoped.

## Acceptance Criteria
[ ] independent educator build; [ ] loading/error/forms; [ ] no business logic duplication.

## Laporan Akhir Codex

### File dibuat/diubah
- `apps/educator/src/app/{page,kelas,pertemuan,aktivitas,tugas,pemantauan}/page.tsx` — route educator (dashboard, assigned class subjects, meeting/activity editor, content library, assignment/grading, progress monitoring).
- `apps/educator/src/components/educator-shell.tsx`, `apps/educator/src/components/data-state.tsx` — shell + `DataBlock`/`ErrorState`/`EmptyState`/`Pill`/`FieldLabel`/`SubmitButton` primitives.
- `apps/educator/src/features/learning/{dashboard,assigned-class-subjects,meeting-activity-editor,content-library,assignment-grading,assignment-grading-board,progress-monitor}.tsx` — surface per fitur.
- `apps/educator/src/features/learning/actions.ts` — server action `gradeSubmissionAction` / `returnSubmissionAction` (token tetap di server).
- `apps/educator/src/lib/api.ts`, `apps/educator/src/lib/utils.ts` — server-side API client + `getOrEmpty` error wrapper + `currentTimeMs` (purity).
- `apps/educator/next.config.mjs`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `Dockerfile`, `components.json`.

### Schema/persistence
Tidak ada persistence baru. Tidak ada migration.

### Endpoint yang dikonsumsi (semua `/api/v1`, authorization tetap di API)
- `GET /learning-meetings`, `GET/PATCH /learning-meetings/:id`.
- `GET /learning-activities`, `GET /learning-activities/:id`, `GET /learning-activities/:id/contents`.
- `GET /learning-progress`, `GET /learning-progress/summary/class-subjects/:classSubjectId`, `GET /learning-progress/summary/class-subjects/:classSubjectId/enrollments/:enrollmentId`.
- `GET /educator-assignments` (scope kelas yang diampu).
- `GET /assignments`, `GET /assignment-submissions`, `POST /assignment-submissions/:id/grade`, `POST /assignment-submissions/:id/return`.

### Tidak ada duplikasi business logic
UI hanya mengirimkan niat (intent) dan merender hasil. Batas skor, lifecycle submission (`SUBMITTED→GRADED→RETURNED`), kelayakan attempt, otorisasi educator, dan scope kelas seluruhnya ditegakkan API. Tidak ada perhitungan deadline/attempt/ceiling di klien.

### Hasil verifikasi (dijalankan 2026-09-17)
- Lint: `pnpm lint` — 11/11 tasks successful, Prettier clean.
- Typecheck: `pnpm typecheck` — 14/14 tasks successful.
- Test: `pnpm test` — API 159 pass/0 fail, api-client 2 pass/0 fail (161 total).
- Build: `pnpm --filter @lms/educator build` (`next build`, Next.js 16.3.5/Turbopack) — compiled successfully 7.1s; 6 route terbentuk: `/`, `/aktivitas`, `/kelas`, `/pemantauan`, `/pertemuan`, `/tugas`.

### Perbaikan yang dilakukan pada sesi ini
- `apps/educator/src/features/learning/actions.ts` baris terakhir `export type { AssignmentSubmission };` — re-export tanpa import, menyebabkan `TS2304` pada typecheck dan bukan dead code yang dipakai siapa pun (grep: 0 referensi). Dihapus.
- `apps/educator/src/features/learning/actions.ts` diformat ulang sesuai Prettier (sebelumnya gagal `prettier --check`).

### Verification DEFERRED
- Runtime end-to-end terhadap API hidup + Keycloak: **DEFERRED** (tidak ada Docker/container runtime; tidak diinstal otomatis). Tidak memblokir task ini karena educator build, typecheck, lint, dan konsumsi kontrak API terverifikasi statis.

### Issue/risiko
- Token educator dibaca dari `EDUCATOR_API_TOKEN` di server; alur login/SSO educator belum diimplementasikan (di luar scope task ini).
- Monitoring progress menampilkan status apa adanya dari API; belum ada agregasi tambahan di sisi UI (sesuai aturan non-duplikasi).

### Konfirmasi
TASK-026 dan task berikutnya **tidak** dikerjakan. Status diubah ke REVIEW dan pekerjaan dihentikan untuk checkpoint human review.

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
