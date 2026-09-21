# TASK-047 — Educator Exam UI

**Status:** DONE

## Dependency
TASK-042, TASK-043, TASK-046 = DONE.

## Implementation Report (2026-09-18)

### Files created / modified
- `apps/educator/src/app/exam/page.tsx` — Next.js 16.3.5 server component page (`/exam`, query params `?exam=`, `?session=`, `?bank=`)
- `apps/educator/src/features/exam/question-bank-panel.tsx` — question bank creation, question versioning, draft authoring and publishing
- `apps/educator/src/features/exam/blueprint-editor.tsx` — blueprint rule management (count, points, bank, topic, difficulty)
- `apps/educator/src/features/exam/session-panel.tsx` — session lifecycle state transitions and participant roster management
- `apps/educator/src/features/exam/grading-panel.tsx` — objective auto-grading and manual essay scoring actions
- `apps/educator/src/features/exam/exam-authoring-panel.tsx` — exam creation, configuration, and status transitions
- `apps/educator/src/features/exam/exam-tabs.tsx` — tab shell for modular panel switching
- `apps/educator/src/features/exam-actions.ts` — server actions for exam, session, question bank, version publishing, auto-grade, and manual-grade
- `packages/api-client/src/index.ts` — expanded API client with question bank, question types, questions, blueprint rule input, and grading types
- `packages/api-client/test/client.test.cjs` — tests for question bank API client contracts and blueprint payloads

### Verification (PASS)
- `pnpm lint` — 11/11 packages, Prettier clean
- `pnpm typecheck` — 14/14 packages
- `pnpm build` — 11/11 packages (including `@lms/educator` routes `/`, `/aktivitas`, `/exam`, `/kehadiran`, `/kelas`, `/pemantauan`, `/pertemuan`, `/tugas`)
- `pnpm test` — **217 API + 5 api-client = 222, 0 fail**

### Deferred
- Educator runtime browser interaction against a live Keycloak + API (no Docker/container runtime available).

## Objective
Educator UI exam authoring/session/grading.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak ada persistence baru.

## API / Application Contract
Question bank, exam blueprint, sessions/participants, grading queue.

## Business Rules
Never render student secrets unnecessarily; permissions via API.

## Acceptance Criteria
[x] educator build; [x] workflows usable; [x] errors handled.

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
