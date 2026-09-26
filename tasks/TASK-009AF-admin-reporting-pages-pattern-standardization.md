# TASK-009AF — Admin Reporting Pages Pattern Standardization

**Status:** REVIEW

## Dependency
TASK-009AE = REVIEW (does not block — it's the previous pattern standardization task in the sequence).

## Objective
Menerapkan enterprise Admin pattern ke halaman Reporting untuk Admin portal. Halaman ini read-heavy: menampilkan KPI cards, metrics table, trend summary, filter period/scope, dan drilldown explorer. Semua data berasal dari Reporting API yang sudah tersedia di backend (TASK-060 through TASK-064).

## Scope Halaman

### Route yang dibuat
| Route | Halaman | API Backend |
|---|---|---|
| `/laporan` | Report Center — overview KPIs + drilldown explorer | `GET /reporting/executive/overview`, `GET /reporting/executive/drilldown` |
| `/laporan/metrics` | Tabel metrik per scope | `GET /reporting/metrics` |
| `/laporan/trend-kelulusan` | Tren kelulusan per cohort | `GET /reporting/executive/graduation-trends` |

### Tidak dibuat (belum ada atau scope beda)
- Halaman attendance/learning/performance reporting terpisah — data tersebut sudah tercakup dalam metrics (attendancePercentage, averageProgressPercent, averageFinalScore) yang ditampilkan di report center dan metrics table. Tidak ada endpoint terpisah untuk attendance-reporting-specific di admin.
- Executive portal preview terpisah — itu domain TASK-065.

## Backend API yang tersedia (audit 2026-09-26)

```
GET  /reporting/metrics                          (list metrics, paginated)
POST /reporting/metrics/refresh                  (rebuild read model)
GET  /reporting/metrics/:scopeType/:scopeId       (single scope metric)
GET  /reporting/executive/overview               (KPI roll-up + institution breakdown)
GET  /reporting/executive/institutions/:orgId     (single institution detail)
GET  /reporting/executive/kpis                    (detailed KPI with distributions)
GET  /reporting/executive/drilldown               (hierarchical drilldown walk)
GET  /reporting/executive/graduation-trends       (graduation trend analysis)
```

Permissions: `reporting.metric.read`, `reporting.metric.refresh`, `reporting.executive.read`.

## API Client Addition

Menambahkan `reporting` section ke `packages/api-client/src/index.ts` dengan:
- `reporting.listMetrics(params)`
- `reporting.getMetric(scopeType, scopeId)`
- `reporting.refreshMetrics(body)`
- `reporting.executiveOverview(query)`
- `reporting.executiveInstitution(orgId)`
- `reporting.executiveKpis(query)`
- `reporting.executiveDrilldown(query)`
- `reporting.graduationTrends(query)`

## Target UX

- Komponen Admin enterprise standard: `AdminPage`, `PageHeader`, `StatCard`, `FilterToolbar`, `FilterTabs`, `EnterpriseTable`, `StatusBadge`, `PaginationBar`, `EmptyState`, `ErrorState`, `enterpriseInputClass`.
- Reporting read-heavy:
  - KPI cards di halaman overview
  - Tabel metrics dengan kolom: scope, peserta, progress, kehadiran, nilai rata-rata
  - Filter period/scope
  - Empty/error state jelas
- Desktop table-first, mobile compact card.
- Label Bahasa Indonesia natural: Cari, Reset, Periode, Scope, Export, Refresh, Lihat Detail, Ringkasan, Tren.
- Tidak ada form mutation (read-only reporting).

## Batasan
- Tidak ubah backend.
- Tidak ubah auth/session.
- Tidak ubah Permission + Scope model.
- Tidak hardcode role.
- Tidak sentuh portal educator/student/executive.
- Tidak mengerjakan TASK-065 Executive UI.
- Status akhir: REVIEW.

## Files Changed

### API Client
- `packages/api-client/src/index.ts` — tambah `reporting` section + DTO types

### Admin Features
- `apps/admin/src/features/reporting/reporting-labels.ts` — label & tone helpers
- `apps/admin/src/features/reporting/reporting-workspace.tsx` — report center KPI overview
- `apps/admin/src/features/reporting/reporting-metrics-workspace.tsx` — metrics table
- `apps/admin/src/features/reporting/reporting-trend-workspace.tsx` — graduation trend

### Admin Routes
- `apps/admin/src/app/laporan/page.tsx` — report center server page
- `apps/admin/src/app/laporan/loading.tsx` — loading skeleton
- `apps/admin/src/app/laporan/metrics/page.tsx` — metrics server page
- `apps/admin/src/app/laporan/metrics/loading.tsx` — loading skeleton
- `apps/admin/src/app/laporan/trend-kelulusan/page.tsx` — trend server page
- `apps/admin/src/app/laporan/trend-kelulusan/loading.tsx` — loading skeleton

### Sidebar
- `apps/admin/src/components/admin-shell.tsx` — update Reporting nav items with hrefs

### Task & Checklist
- `tasks/TASK-009AF-admin-reporting-pages-pattern-standardization.md`
- `tasks/MASTER-CHECKLIST.md` — add TASK-009AF entry

## Limitations / Deferred
- No real attendance-specific, learning-specific, or performance-specific reporting pages because the backend aggregates those into the metrics model. The metrics table already displays attendancePercentage, averageProgressPercent, averageFinalScore.
- Refresh metrics button is present but requires `reporting.metric.refresh` permission.
- Executive drilldown is client-side rendered via the drilldown API.
- Export functionality not yet implemented (no backend export endpoint).

## Verification
- [ ] `pnpm --filter @lms/api-client exec tsc --noEmit`
- [ ] `cd apps/admin && ../../node_modules/.bin/eslint src`
- [ ] `cd apps/admin && ./node_modules/.bin/tsc --noEmit`
- [ ] `cd apps/admin && ./node_modules/.bin/next build --webpack`
- [ ] `git diff --check`