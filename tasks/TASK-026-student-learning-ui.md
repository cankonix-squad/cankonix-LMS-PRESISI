# TASK-026 — Student Learning UI

**Status:** REVIEW

## Dependency
TASK-023, TASK-024 = DONE.

## Objective
Mobile-first student learning experience.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak ada persistence baru.

## API / Application Contract
Student dashboard enrolled classes, meeting/activity/content, progress, assignment submit/status.

## Business Rules
Mobile-first, own enrollment only, signed file access, clear offline/error states.

## Acceptance Criteria
[x] student independent build; [x] mobile responsive; [x] authorization via API; [x] checks green.

## Evidence & Implementation Summary
- `apps/student`: Next.js 16.3.5 App Router app with mobile-first layout (`src/components/student-shell.tsx`) featuring desktop tabs and sticky mobile bottom navigation.
- Pages implemented:
  - `/` (`src/app/page.tsx`): Student Dashboard (active enrollments, urgent deadlines, learning meeting highlights, stats).
  - `/materi` (`src/app/materi/page.tsx`): Meeting & Activity explorer, content viewer (text body, external links, attached files), and interactive completion toggle.
  - `/tugas` (`src/app/tugas/page.tsx`): Assignment & Submission board (due date countdown, attempt counters, late detection, submission history with feedback/grade, submission form, and file attachment).
  - `/kemajuan` (`src/app/kemajuan/page.tsx`): Progress overview per class-subject and overall completion metrics.
- Server Actions & API client:
  - Server actions in `apps/student/src/features/learning/actions.ts` delegate to `@lms/api-client`.
  - Expanded `@lms/api-client` (`packages/api-client/src/index.ts`) with typed methods for enrollments, files, learningProgress mutations, and submissions.
- Verification:
  - `pnpm lint`: 11/11 tasks passed (0 errors, 0 warnings; Prettier verified).
  - `pnpm typecheck`: 14/14 packages passed.
  - `pnpm test`: 161 tests passed (159 API + 2 api-client, 0 failed).
  - `pnpm --filter @lms/student build` and `pnpm build`: passed; generated static and dynamic routes.
  - `db:validate` & `db:generate`: Prisma schema valid.
- Deferred verification:
  - Live Keycloak & API runtime integration deferred due to unavailable container infrastructure in this environment (not installed automatically per AGENTS.md).

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
