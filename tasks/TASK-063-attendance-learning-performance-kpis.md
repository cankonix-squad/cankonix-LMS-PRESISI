# TASK-063 — Attendance / Learning / Performance KPIs

**Status:** REVIEW

## Dependency
TASK-060 = DONE.

## Objective
Detail KPI attendance, progress, score/remedial.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Extend aggregate views/tables only if justified.

## API / Application Contract
Reporting endpoints trends/distributions/attention lists.

## Business Rules
KPI formulas documented; denominators consistent; no N+1/raw full scans in hot paths.

## Acceptance Criteria
[x] formula fixtures; [x] filters; [x] performance-conscious queries; [x] checks green.

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

## Laporan Implementasi Codex — 2026-09-21

TASK-063 diimplementasikan sebagai detail KPI eksekutif di modul `reporting`, tanpa schema change dan tanpa migration baru. Keputusan ini disengaja: KPI kehadiran, pembelajaran, skor, remedial, distribusi, attention list, dan trend cohort dapat dijawab dari `reporting_metrics` yang sudah menjadi read model TASK-060/TASK-061. Endpoint baru tidak membaca tabel transaksi seperti `attendance_records`, `learning_progress`, atau `final_grades` secara langsung pada hot path.

Endpoint:

- `GET /api/v1/reporting/executive/kpis`
- Permission: `reporting.executive.read`
- Scope boundary: controller hanya meneruskan `user.accountId`; `KpiService` memakai executive scope resolver yang sama dengan TASK-061, lalu menyempitkan grant sebelum membaca data.

File dibuat:

- `apps/api/src/reporting/dto/kpi-query.dto.ts`
- `apps/api/src/reporting/dto/kpi-response.dto.ts`
- `apps/api/src/reporting/kpi-rules.ts`
- `apps/api/src/reporting/kpi.service.ts`
- `apps/api/src/reporting/kpi.controller.ts`
- `apps/api/test/reporting-kpis.test.cjs`

File diubah:

- `apps/api/src/reporting/reporting.types.ts`
- `apps/api/src/reporting/reporting.repository.ts`
- `apps/api/src/reporting/reporting.module.ts`
- `tasks/MASTER-CHECKLIST.md`
- `tasks/TASK-063-attendance-learning-performance-kpis.md`

Kontrak API:

- Query mendukung `scope`, `scopeId`, `level`, `periodFrom`, `periodTo`, `page`, `limit`, `attentionLimit`, dan `trendLimit`, semuanya divalidasi DTO.
- Response berisi `summary`, `distributions`, `attention`, `trends`, paging, scope yang terselesaikan, dan `generatedAt`.
- `level` detail dibatasi ke `PROGRAM`, `BATCH`, `CLASS`, `CLASS_SUBJECT`, dan `ENROLLMENT`. Summary tetap memakai level disjoint TASK-061 agar headline KPI tidak menjadi mean-of-means.

Formula KPI:

- Attendance, progress, dan final score memakai bucket tetap `0-59.99`, `60-69.99`, `70-79.99`, `80-89.99`, `90-100`.
- Remedial risk memakai nilai terlemah dari attendance, progress, dan score; jika belum ada grade, score digantikan progress agar scope tanpa grade tidak terlihat sehat palsu.
- Attention list memberi alasan eksplisit: `attendance_below_75`, `progress_below_70`, `score_below_70`, `unapproved_grades`, lalu diurutkan berdasarkan severity.
- Trend dikelompokkan dari `periodStart`/`periodEnd` batch yang sudah tersimpan di read model, lalu memakai KPI rules TASK-061 agar denominator tetap konsisten.

Test:

- 5 test baru di `apps/api/test/reporting-kpis.test.cjs`.
- Test mencakup fixture distribusi attendance/progress/score/remedial, urutan dan alasan attention list, trend weighted per periode, filter scope/period, dan bukti service tidak memanggil `readSourceCounts`, `listScopes`, atau `upsertMetric` pada read path.

Verification:

- `pnpm --filter @lms/api typecheck` PASS.
- `pnpm --filter @lms/api build` PASS.
- `node --test apps/api/test/reporting-kpis.test.cjs` PASS (5/5).
- `pnpm --filter @lms/api lint` PASS.
- `pnpm exec prettier --check ...` PASS untuk file task/TASK-063.
- `pnpm typecheck` PASS (14/14).
- `DATABASE_URL='postgresql://validation:validation@127.0.0.1:5432/lms_validation' pnpm db:validate` PASS.
- `pnpm --filter @lms/api db:generate` PASS.
- `pnpm lint` PASS (11/11 + Prettier).
- `pnpm test` PASS (441 API + 6 api-client = 447, zero failures).
- `pnpm build` PASS (11/11).

Verification DEFERRED:

- Runtime PostgreSQL/Keycloak end-to-end untuk endpoint baru masih DEFERRED karena container/database runtime tidak tersedia di environment ini dan tidak diinstal otomatis. Ini bukan blocker teknis untuk TASK-063 karena kontrak, scope, formula, dan hot-path read model sudah diverifikasi dengan unit/service test serta build penuh.

Issue/risiko review:

- Trend TASK-063 adalah trend cohort dari periode batch yang tersimpan di `reporting_metrics`, bukan historical snapshot perubahan KPI dari waktu ke waktu. Snapshot historis tetap menjadi ruang TASK-064.
- Untuk `CLASS_SUBJECT`, distribusi row-level dapat menjumlahkan peserta per subject, sehingga angka `participants` pada bucket adalah "peserta-subject" dan bukan unique class roster. Summary headline tetap memakai level disjoint agar tidak menggandakan roster.
- Scope yang belum pernah di-refresh tidak muncul di KPI, mengikuti keputusan TASK-060/TASK-061 bahwa missing read-model row adalah informasi operasional, bukan alasan compute on read.

Konfirmasi: TASK-064 dan TASK-065 tidak dikerjakan.
