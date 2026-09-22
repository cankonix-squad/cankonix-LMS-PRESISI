# TASK-009C — Admin Enterprise Shell & Dashboard

**Status:** REVIEW

## Dependency
TASK-009B = REVIEW. Admin foundation pages and Assignment & Scope UI are available.

## Objective
Mengubah Admin portal dari tampilan console teknis menjadi aplikasi operasional enterprise yang lebih mudah dipakai oleh operator pusat, dengan dashboard landing setelah login dan navigasi sidebar yang dikelompokkan.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/05-api-standards.md`, `docs/07-security-standards.md`

Prototype visual reference:
`/Users/harmanto/Documents/POLRI/Prototype/cankonix-LMS-PRESISI/pages/admin-central.html`

## Data Model / Persistence
Tidak menambah persistence baru. Dashboard memakai data API foundation yang sudah tersedia.

## API / Application Contract
Admin frontend tetap memakai `packages/api-client` dan session server-side yang sudah ada untuk membaca:
- organizations
- persons
- roles
- permissions
- role assignments

## Scope
- Adopsi style operasional dari prototype `admin-central`.
- Landing dashboard setelah login.
- Sidebar grouped enterprise menu.
- Quick actions.
- KPI cards berbasis data yang sudah tersedia.
- Error state yang ramah operator.
- Halaman foundation tetap dipertahankan.

## Acceptance Criteria
[x] Root `/` menjadi dashboard enterprise setelah login.
[x] Sidebar menampilkan menu enterprise yang dikelompokkan dan tetap mempertahankan route foundation.
[x] Dashboard menampilkan KPI dari data foundation yang sudah tersedia.
[x] Quick actions mengarah ke halaman foundation yang relevan.
[x] Error state tidak menampilkan pesan teknis mentah sebagai pengalaman utama operator.
[x] Foundation pages `/organisasi`, `/personel`, `/roles`, dan `/assignments` tetap tersedia.
[x] checks green.

## Laporan Akhir Codex
TASK-009C implemented and moved to `REVIEW`.

Perubahan:
- Admin shell diubah menjadi layout operasional enterprise dengan sidebar grouped menu.
- Root `/` setelah login menjadi dashboard nasional, bukan tumpukan form teknis.
- Dashboard menampilkan hero operasional, KPI foundation, snapshot data terbaru, dan quick actions.
- Halaman foundation existing tetap tersedia untuk kerja detail:
  `/organisasi`, `/personel`, `/roles`, `/assignments`.
- Error state permission/session dibuat lebih ramah operator dan tetap menampilkan permission yang perlu diberikan.
- `AGENTS.md` priority diperbarui agar autonomous continuation mengenali `TASK-009C`.

Files changed:
- `apps/admin/src/components/admin-shell.tsx`
- `apps/admin/src/components/data-state.tsx`
- `apps/admin/src/features/foundation/dashboard.tsx`
- `AGENTS.md`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-009C-admin-enterprise-shell-dashboard.md`

Verification PASS:
- `eslint . --max-warnings=0` from `apps/admin`
- `next typegen` from `apps/admin`
- `tsc --noEmit` from `apps/admin`
- `prettier --check` on changed files
- `next build --webpack` from `apps/admin`

Verification note:
- `pnpm --filter @lms/admin lint`, `pnpm --dir apps/admin typecheck`, and `pnpm --dir apps/admin build` were attempted but hung without output in this local shell.
- Direct tool commands were used instead. Default Turbopack build failed in the sandbox with `Operation not permitted` while binding an internal worker port, so production build was verified with `next build --webpack`.

Deferred:
- Live production browser check after CI/CD deploy.
- Production permission assignment for the bootstrap account remains a backend/Keycloak data operation; UI does not bypass Permission + Scope.
