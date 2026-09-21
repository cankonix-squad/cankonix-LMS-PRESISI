# TASK-060 — Reporting Aggregates

**Status:** DONE

**Approved:** 2026-09-19 (reviewer) — implementation accepted; `prisma migrate deploy` remains DEFERRED (no container runtime in this environment) and must be run before integration testing or UAT.

## Dependency
Core source domains minimal: enrollment, learning progress, attendance, final grade/graduation = DONE.

## Objective
Membangun reporting boundary dan aggregate/read model.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Reporting tables/materialized views untuk org/program/batch/class/classSubject metrics dan optional `ReportingSnapshot` period+scope+metrics JSON/columns. Raw transactional tables tetap source.

## API / Application Contract
Internal refresh jobs/services; reporting query repository. Tidak expose semua API di task ini.

## Business Rules
Near-real-time acceptable. Aggregate definitions documented. Redis may cache but not source. Refresh idempotent.

## Acceptance Criteria
[x] fixture totals match transactional data; [x] refresh idempotent; [x] indexes/query plan documented where possible; [x] checks green.

## Status Note (Codex — menunggu review manusia)

### Ringkasan

Reporting boundary dan read model dibuat sebagai tabel `reporting_metrics` yang di-*refresh* dari tabel transaksional. Tabel transaksional tetap menjadi source of truth; `reporting_metrics` adalah derived data yang dapat dibuang dan dibangun ulang kapan saja. Tidak ada Redis pada task ini (lihat Keputusan Desain).

### Endpoint

| Method | Path | Permission | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/v1/reporting/metrics` | `reporting.metric.read` | Baca read model (paginated, maks 200/limit) |
| GET | `/api/v1/reporting/metrics/:scopeType/:scopeId` | `reporting.metric.read` | Baca satu scope; 404 bila belum pernah di-refresh |
| POST | `/api/v1/reporting/refresh` | `reporting.metric.refresh` | Recompute read model dari data transaksional |

`reporting.metric.refresh` dipisah dari `reporting.metric.read` karena membaca laporan adalah aktivitas rutin, sedangkan membangun ulang read model adalah tindakan maintenance yang menulis derived row untuk banyak scope sekaligus.

### Definisi agregat (didokumentasikan)

- **participants** — jumlah enrollment pada scope, termasuk yang sudah tidak aktif. Denominator "berapa orang yang dilaporkan".
- **activeParticipants** — enrollment berstatus `ACTIVE`, dilaporkan berdampingan dengan `participants`.
- **averageProgressPercent** — mean per peserta, bukan mean per aktivitas. Satu orang = satu bobot.
- **attendancePercentage** — `(present + late) / totalSessions`, dihitung dari hasil penjumlahan counter, bukan rata-rata persentase. `excused`, `sick`, `absent` tidak dihitung hadir. Sumber: `attendance_summaries` (TASK-033) yang sudah pre-aggregated.
- **averageFinalScore** — mean dari `final_grades.numeric_score`, yaitu mean per nilai mata pelajaran, bukan per peserta.
- **gradedCount** / **unapprovedGradeCount** — jumlah nilai, dan berapa yang masih `CALCULATED` (belum `APPROVED`). Dilaporkan berpasangan karena rata-rata di atas nilai belum-approved bersifat sementara.
- **totalSessions** — jumlah sesi yang sudah closed pada scope.

Progres dibaca dari `class_subject_progress_aggregates` (TASK-023) dan absensi dari `attendance_summaries` (TASK-033), bukan dari `learning_progress` / `attendance_records`. Keduanya adalah tabel bervolume tertinggi, sehingga membaca pre-aggregate menghindari full scan pada jalur refresh — inilah yang membuat laporan tidak makin lambat setiap semester.

Karena `attendance_summaries` berhenti di scope PROGRAM, angka absensi ORGANIZATION adalah penjumlahan baris PROGRAM di bawahnya (`fillAttendanceAcrossPrograms`), bukan angka independen yang bisa berbeda dari komponennya.

### Keputusan desain

1. **Idempoten lewat recompute + upsert.** Setiap scope dihitung ulang dari source lalu di-`upsert` pada unique key `(scopeType, scopeId)`. Counter tidak pernah diakumulasikan ke nilai yang sudah tersimpan, sehingga refresh dua kali menghasilkan baris yang sama, bukan angka berlipat. Sifat ini diuji langsung (`repo.rows.size === 1`, `participants` tetap 40).
2. **`GET` satu scope mengembalikan 404, bukan menghitung on-demand.** Baris yang tidak ada berarti scope tersebut belum di-refresh — itu informasi operasional yang dibutuhkan pemanggil. Menghitung saat baca akan mengembalikan cold scan tepat pada jalur baca yang justru ingin dibersihkan task ini.
3. **Refresh tidak berhenti saat satu scope gagal.** Scope yang gagal di-log lalu dilewati. Refresh parsial meninggalkan read model *stale* (mudah dipahami dan diulang), sedangkan refresh yang abort meninggalkan kondisi *setengah ter-update* tanpa catatan sampai mana ia berjalan. Audit mencatat `refreshed` dan `attempted` sekaligus, sehingga refresh parsial tidak tampak sama dengan refresh bersih.
4. **Scope yang tidak menyebut parent-nya ditolak** (`scopeNamesItsParent`) sebelum baris ditulis. Parent id inilah yang nanti dipakai drill-down TASK-062, jadi parent yang salah akan menaruh scope di cabang hierarki yang salah.
5. **Tidak ada Redis.** `docs/03-data-architecture.md` mengizinkan Redis sebagai cache, bukan sebagai source. Read model PostgreSQL sudah menjadi mekanisme baca-murah; menambah Redis di depannya hanya membuat tempat kedua di mana angka basi bisa hidup.
6. **Tidak ada operasi `delete` pada repository.** Baris metrik adalah derived cache; scope yang hilang cukup berhenti di-refresh. Dengan tidak adanya operasi hapus, tidak ada yang bisa menghapus laporan secara tidak sengaja.
7. **Semua pembagian ada di fungsi murni** (`deriveMetrics`/`safeAverage`/`safePercentage`), sehingga kebijakan rata-rata (denominator mana, apa yang terjadi saat kosong) dapat diuji tanpa database. Scope kosong melaporkan `0`, bukan `null`/`NaN`.

### File

**Dibuat:**
- `apps/api/src/reporting/dto/reporting-query.dto.ts`
- `apps/api/src/reporting/dto/reporting-response.dto.ts`
- `apps/api/src/reporting/reporting-permissions.ts`
- `apps/api/src/reporting/reporting.types.ts`
- `apps/api/src/reporting/reporting-rules.ts`
- `apps/api/src/reporting/reporting.repository.ts`
- `apps/api/src/reporting/reporting.service.ts`
- `apps/api/src/reporting/reporting.controller.ts`
- `apps/api/src/reporting/reporting.module.ts`
- `apps/api/test/reporting.test.cjs` (22 test)
- `apps/api/prisma/migrations/20261009000600_task_060_reporting/migration.sql`

**Diubah:**
- `apps/api/prisma/schema.prisma` — model `ReportingMetric` + enum `ReportingScopeType`
- `apps/api/src/app.module.ts` — registrasi `ReportingModule`
- `apps/api/src/audit/audit-actions.ts` — action `reporting.refreshed`, resource type `reporting_metric`

### Verifikasi

| Perintah | Hasil |
| --- | --- |
| `pnpm lint` | PASS — 11/11 task, Prettier bersih |
| `pnpm typecheck` | PASS — 14/14 |
| `pnpm build` | PASS — 11/11 |
| `pnpm test` | PASS — `@lms/api` 334/334 (312 sebelum task + 22 baru), `@lms/api-client` 6/6 |
| `pnpm db:validate` | PASS — schema valid |
| `node /tmp/verify-migration.cjs` | `OK: 10 statements verbatim` (1 CreateEnum + 1 CreateTable + 8 CreateIndex) |

**DEFERRED:** `prisma migrate deploy` belum dijalankan karena Docker/database runtime tidak tersedia di environment ini. Ini bukan blocker teknis task: migrasi sudah diverifikasi verbatim terhadap output kanonik `prisma migrate diff`, dan `db:validate` lulus. Migrasi siap dijalankan saat database tersedia.

### Catatan

TASK-061 s/d TASK-065 (executive overview, drill-down, KPI detail, trend, portal) **tidak** dikerjakan pada task ini. Hanya boundary-nya yang diekspos: baca metrik tersimpan dan refresh yang membangunnya.

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
