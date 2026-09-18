# TASK-032 — Attendance UI

**Status:** DONE-WITH-DEFERRED

## Implementation Report (2026-09-17)

### Files created
- `apps/educator/src/app/kehadiran/page.tsx` — Next.js 16.3.5 server component page (`/kehadiran`, addressable by `?session=<id>`)
- `apps/educator/src/features/attendance/actions.ts` — server actions (`saveRosterAction`, `changeSessionStatusAction`, `applyCorrectionAction`)
- `apps/educator/src/features/attendance/form-state.ts` — pure helpers/constants (`parseRosterEntries`, `parseCurrentStatuses`, `readString`, `STATUS_PREFIX`, `CURRENT_PREFIX`)
- `apps/educator/src/features/attendance/attendance-view.ts` — presentation helpers, tone mappings, label dictionaries, `buildRosterRows`, `groupCorrections`
- `apps/educator/src/features/attendance/attendance-session-panel.tsx` — client components for roster form (`useActionState`), session lifecycle (`OPEN`/`CLOSED`), `CorrectionForm` (mandatory reason), and `CorrectionHistory` (oldest-last)
- `apps/educator/src/features/attendance/attendance-board.tsx` — sidebar of sessions + selected session detail + correction panel

### Files modified
- `apps/educator/src/components/educator-shell.tsx` (added `/kehadiran` to the educator navigation)
- `packages/api-client/src/index.ts` (added `attendance` and `attendanceCorrections` sub-clients with typed DTOs)

### UI states & business rules
- **Roster marking**: shows all enrolled participants (including those without an existing record); only changed rows (`status:<enrollmentId>` different from `current:<enrollmentId>`) are sent on submit to avoid spurious audit log noise.
- **Session lifecycle**: `OPEN` allows roster mark; `CLOSED` disables direct edits and guides the educator to use corrections; session status toggle calls the API and shows the API's confirmation.
- **Correction & audit history**: each participant row has a correction form with mandatory reason (min 5 chars) and an immutable history view displaying `previousStatus → newStatus`, timestamp, and reason directly from the API.
- **Graceful degradation**: each read in `Page` uses `getOrEmpty(loader)` and renders independent alert blocks if any endpoint is unreachable, keeping the rest of the board functional.

### Verification (PASS)
- `pnpm lint` — 11/11 packages, Prettier clean
- `pnpm typecheck` — 14/14 packages
- `pnpm build` — 11/11 packages (including `pnpm --filter @lms/educator build`, routes `/`, `/_not-found`, `/aktivitas`, `/kehadiran`, `/kelas`, `/pemantauan`, `/pertemuan`, `/tugas`)
- `pnpm test` — **165 API + 2 api-client = 167, 0 fail**
- `pnpm --filter @lms/api db:validate` — valid
- `pnpm --filter @lms/api db:generate` — generated

### Deferred
- Runtime educator browser interaction against a live Keycloak + API (no Docker/container runtime available; not installed automatically).

## Dependency
TASK-031 = DONE.

## Objective
UI educator/admin untuk attendance dan correction.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak ada persistence baru.

## API / Application Contract
Session roster, mark/bulk attendance, correction history; student own attendance read view bila scope task memungkinkan.

## Business Rules
API authoritative; optimistic UI tidak boleh kehilangan error.

## Acceptance Criteria
[x] UI states; [x] independent builds affected green.

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
