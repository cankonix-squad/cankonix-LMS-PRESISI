# TASK-009AG — Admin Audit System Pages Pattern Standardization

**Status:** REVIEW

## Dependency
TASK-009AF = REVIEW (does not block — it's the previous pattern standardization task in the sequence).

## Objective
Menerapkan enterprise Admin pattern ke halaman Audit & System untuk Admin portal. Halaman ini read-heavy: menampilkan audit trail dengan filter actor/resource/action/date, system health status, dan placeholder untuk status infrastruktur yang belum tersedia kontrak baca API-nya.

## Scope Halaman

### Route yang dibuat
| Route | Halaman | API Backend |
|---|---|---|
| `/audit` | Riwayat Audit Trail — tabel audit dengan filter actor, resource, periode, keyword | `GET /audit-logs`, `GET /audit-logs/:id` |
| `/system-health` | Status Sistem — health cards + status ketersediaan layanan | `GET /api/v1/health` |

### Tidak dibuat (belum ada route/API)
- **System Config/Settings** — tidak ada endpoint `GET/PATCH /settings` atau `GET/PATCH /config` di backend. Membuat halaman palsu tanpa API adalah anti-pattern.
- **User Session Management** — tidak ada endpoint `GET /sessions` atau `DELETE /sessions/:id`. Session dikelola oleh Keycloak (SSO), bukan oleh backend LMS.
- **Detailed Infrastructure Health** — backend hanya menyediakan liveness probe (`{ status: 'ok' }`); tidak ada endpoint untuk status Redis, PostgreSQL, MinIO, queue depth, atau Keycloak.

## Backend API yang tersedia (audit 2026-09-26)

```
GET  /api/v1/audit-logs                          (search audit trail, paginated)
GET  /api/v1/audit-logs/:id                      (single audit entry detail)
GET  /api/v1/health                              (public liveness probe)
```

Permissions: `audit.log.read` (untuk `/audit-logs`).

## API Client Addition

Menambahkan `audit` section ke `packages/api-client/src/index.ts` dengan:
- `audit.list(params)` — search/list audit logs
- `audit.get(id)` — single audit entry detail

DTO types baru: `AuditLogEntry`, `AuditLogList`, `AuditLogQuery`.

## Target UX

- Komponen Admin enterprise standard: `AdminPage`, `PageHeader`, `StatCard`, `FilterToolbar`, `EnterpriseTable`, `StatusBadge`, `PaginationBar`, `StickyActionCell`, `EmptyState`, `ErrorState`.
- Audit read-heavy:
  - Tabel audit dengan kolom: Waktu, Actor, Action, Resource, Detail, IP
  - Filter: search keyword, resource type dropdown, actor UUID, date range from/to
  - Action ditampilkan sebagai `StatusBadge` dengan warna berdasarkan resource family
  - IP address di sticky action cell kanan
  - Mobile compact card: action label + resource badge + datetime + actor + detail
- System Health:
  - StatCards: API Process, Health Check, Audit Trail
  - Status ketersediaan layanan dengan `StatusBadge`
  - Placeholder jujur untuk infrastruktur detail yang belum tersedia
- Desktop table-first, mobile compact card.
- Label Bahasa Indonesia natural: Cari, Reset, Periode, Actor, Resource, Action, Detail, Status Sistem, Health Check, Riwayat Audit.
- Tidak ada secret/raw token/password di UI. Payload `before`/`after` sudah redacted server-side.
- Tidak ada mutation berbahaya (read-only).

## Batasan
- Tidak ubah backend kecuali penambahan API client types/methods yang diperlukan untuk kompilasi.
- Tidak ubah auth/session.
- Tidak ubah Permission + Scope model.
- Tidak hardcode role sebagai authorization model.
- Tidak simpan password/secret/token di UI.
- Tidak tampilkan secret raw di audit/system UI.
- Tidak sentuh portal educator/student/executive.
- Status akhir: REVIEW.

## Files Changed

### API Client
- `packages/api-client/src/index.ts` — tambah `audit` section + `AuditLogEntry`/`AuditLogList`/`AuditLogQuery` types

### Admin Features
- `apps/admin/src/features/system/audit-labels.ts` — label, tone, datetime, snapshot helpers
- `apps/admin/src/features/system/audit-workspace.tsx` — audit trail table workspace
- `apps/admin/src/features/system/system-health-workspace.tsx` — system health workspace

### Admin Routes
- `apps/admin/src/app/audit/page.tsx` — audit trail server page
- `apps/admin/src/app/audit/loading.tsx` — loading skeleton
- `apps/admin/src/app/system-health/page.tsx` — system health server page
- `apps/admin/src/app/system-health/loading.tsx` — loading skeleton

### Sidebar
- `apps/admin/src/components/admin-shell.tsx` — wire `Audit & System` nav items with real hrefs

### Task & Checklist
- `tasks/TASK-009AG-admin-audit-system-pages-pattern-standardization.md`
- `tasks/MASTER-CHECKLIST.md` — add TASK-009AG entry

## Limitations / Deferred
- **System Config/Settings page** — not created. No backend `GET/PATCH /settings` endpoint exists. Documented as limitation; will be created when backend exposes the contract.
- **User Session page** — not created. Sessions are managed by Keycloak. No LMS-internal session list endpoint.
- **Infrastructure health details** — not created. Backend only exports a liveness probe. Separate health endpoints for Redis/PostgreSQL/MinIO/Keycloak would be needed for a full infrastructure dashboard.
- **Audit detail view** — the API supports `GET /audit-logs/:id` but no dedicated detail page is created yet (the list table shows summary via `snapshotSummary`). A detail drawer can be added later if needed.
- **System config mutations** — no mutation endpoints exist, so no mutation UI was created.

## Verification
- [ ] `cd apps/admin && ../../node_modules/.bin/eslint src`
- [ ] `cd apps/admin && ./node_modules/.bin/tsc --noEmit`
- [ ] `cd apps/admin && ./node_modules/.bin/next build --webpack`
- [ ] `git diff --check`