# TASK-061 — Executive Overview API

**Status:** DONE
**Implemented:** 2026-09-19 (Codex)
**Approved:** 2026-09-19 (reviewer) — implementation accepted; `prisma migrate deploy` remains DEFERRED (no container runtime in this environment), to be completed before integration testing.

## Dependency
TASK-060 dan TASK-005 = DONE.

## Objective
API KPI overview sesuai executive scope.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak perlu model baru selain aggregate.

## API / Application Contract
`GET /api/v1/reporting/executive/overview` dengan filters period/scope dan KPIs participant/institution/program/batch/class/progress/attendance/score/graduation.

## Business Rules
Scope resolver wajib. National vs institution access melalui scope, bukan role string. Consistent KPI definitions.

## Acceptance Criteria
[x] scope tests; [x] KPI fixture; [x] pagination where lists; [x] checks green.

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

---

## Status Note (Codex — menunggu review manusia)

**Status:** `REVIEW`. Implementasi selesai dan seluruh verification yang tersedia lulus. Task **tidak** ditandai `DONE`; keputusan akhir ada pada reviewer manusia.

### Endpoint

| Method | Path | Permission | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/v1/reporting/executive/overview` | `reporting.executive.read` | KPI block + daftar breakdown terpaginasi pada grain yang diminta |
| `GET` | `/api/v1/reporting/executive/institutions/:organizationId` | `reporting.executive.read` | Metrik tersimpan untuk satu institusi |

Permission `reporting.executive.read` sengaja dipisah dari `reporting.metric.read` (TASK-060): membaca read model pada scope yang sudah dimiliki berbeda dengan membaca tampilan institusi-wide.

### Keputusan desain utama

- **Scope resolver, bukan role string.** Reach pemanggil dihitung dari *scope yang menempel pada permission grant* (`ExecutiveScopeResolver`), bukan dari nama role. Tidak ada satu pun cabang kode pada jalur ini yang memeriksa kode role.
- **Grant menentukan jangkauan, request hanya menentukan grain.** Pemanggil ter-scope yang meminta `scope=NATIONAL` tetap menerima data institusinya sendiri, dengan `accessLevel: 'SCOPED'` pada response. Parameter request tidak pernah memperluas laporan.
- **Denial ≠ laporan kosong.** Grant kosong atau grain di luar grant menghasilkan `403`, bukan dashboard berisi nol. Dashboard kosong dan dashboard ditolak adalah dua pernyataan berbeda tentang institusi, dan hanya satu yang benar.
- **`null` vs `[]` tidak pernah disatukan.** `null` = tidak ada batasan pada axis tersebut; `[]` = tidak ada apa pun pada axis tersebut (match nothing). Menyatukan keduanya akan mengubah pemanggil tanpa scope menjadi pemanggil nasional.
- **Averages tidak pernah dirata-ratakan.** Setiap KPI adalah `sum(total) / sum(denominator)`. Untuk itu refresh TASK-060 kini menyimpan `attendedCount`, `progressPercentTotal`, `progressSampleCount`, `finalScoreTotal` beserta `graduation*` counters dan `periodStart`/`periodEnd`. Test membuktikan mean-of-means memberi angka berbeda (55) dari angka yang benar (11.76) pada fixture yang sama.
- **Hanya level disjoint yang boleh di-roll-up.** `EXECUTIVE_AGGREGATE_LEVELS` = ORGANIZATION, PROGRAM, BATCH, CLASS. `CLASS_SUBJECT` dan `ENROLLMENT` dikecualikan karena roster-nya mengulang roster kelas (double counting).
- **Graduation dilaporkan sebagai tiga fakta terpisah** (dievaluasi / disetujui / tersertifikasi) plus `certificationRate`, sehingga kondisi "disetujui tetapi belum tersertifikasi" tetap terlihat. Hanya certificate berstatus `ISSUED` yang dihitung.
- **`periodTo` diperlebar ke akhir hari** (`T23:59:59.999Z`) agar hari terakhir inklusif.
- **`institutionDetail` sengaja sempit** (hanya organization id). Penelusuran lebar National → … → Peserta adalah TASK-062 dan tidak diantisipasi di sini.
- **Pembacaan tidak diaudit.** `AGENTS.md` mewajibkan audit untuk mutasi sensitif; endpoint ini tidak menulis apa pun. Menambah baris audit per pembukaan dashboard akan menaruh operasi tulis pada jalur baca yang justru dibuat murah, dan mengisi audit trail dengan page view. Kontrolnya adalah permission + scope, keduanya ditegakkan sebelum satu baris pun dibaca.

### File dibuat / diubah

**Dibuat:**
- `apps/api/src/reporting/executive-scope.ts` — aljabar scope murni (grant, wildcard match, perluasan descendant, narrowing, filter).
- `apps/api/src/reporting/executive-kpis.ts` — definisi KPI murni (sum-not-mean-of-means, level yang boleh di-roll-up).
- `apps/api/src/reporting/executive-scope.resolver.ts` — scope resolver + token `EXECUTIVE_PERMISSION_SOURCE` / `EXECUTIVE_SCOPE_GRANT_RESOLVER`.
- `apps/api/src/reporting/executive-reporting.service.ts` — `overview()` dan `institutionDetail()`.
- `apps/api/src/reporting/executive-reporting.controller.ts` — dua endpoint di atas.
- `apps/api/src/reporting/dto/executive-overview-query.dto.ts`, `apps/api/src/reporting/dto/executive-overview-response.dto.ts`.
- `apps/api/test/reporting-executive.test.cjs` — 40 test.
- `apps/api/prisma/migrations/20261009000700_task_061_executive_overview/migration.sql`.

**Diubah:**
- `apps/api/prisma/schema.prisma` — `ReportingMetric`: 10 kolom baru + index `(period_start, period_end)`.
- `apps/api/src/reporting/reporting.types.ts`, `reporting-rules.ts`, `reporting.repository.ts`, `reporting.service.ts`, `reporting-permissions.ts`, `reporting.module.ts`.
- `apps/api/src/app.module.ts`, `apps/api/src/app.ts`.

### Schema & migration
Migration menambah 10 kolom pada `reporting_metrics` (`attended_count`, `progress_percent_total`, `progress_sample_count`, `final_score_total`, `graduation_evaluation_count`, `graduation_eligible_count`, `graduation_approved_count`, `graduated_count`, `period_start`, `period_end`) dan satu index `reporting_metrics_period_start_period_end_idx`. Diff diverifikasi **2 statements verbatim** terhadap `prisma migrate diff`.

### Hasil verification
- `pnpm lint` — lulus (11/11 task, Prettier clean).
- `pnpm typecheck` — lulus (14/14 task).
- `pnpm build` — lulus (11/11 task).
- `pnpm test` — lulus: **@lms/api 374/374** (sebelumnya 334, +40 test baru), **@lms/api-client 6/6**.
- `pnpm db:validate` — lulus.
- Migration diff fidelity — **OK: 2 statements verbatim**.

### Verification DEFERRED
- `prisma migrate deploy` terhadap PostgreSQL sungguhan — **DEFERRED**: Docker/container runtime tidak tersedia di environment ini dan tidak boleh diinstal otomatis. Ini bukan blocker teknis untuk task ini (schema sudah divalidasi, migration sudah diverifikasi terhadap diff kanonik), tetapi **wajib** diselesaikan sebelum integration testing/UAT/production readiness.

### Risiko / catatan
- `countExecutiveScopes` menghitung entitas dari read model, bukan dari tabel transaksional. Konsekuensinya jujur tetapi perlu diketahui: scope yang belum pernah di-refresh tidak ikut terhitung, sehingga angka menggambarkan apa yang sudah dilaporkan, bukan apa yang ada.
- Roll-up bergantung pada baris `reporting_metrics` yang sudah menyimpan total. Baris yang di-refresh sebelum migration ini dijalankan akan memiliki total `0` sampai di-refresh ulang.

### Konfirmasi
TASK-062 **tidak** dikerjakan. Tidak ada perubahan arsitektur. Tidak ada microservice. Tidak ada role string yang di-hardcode.
