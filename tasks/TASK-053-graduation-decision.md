# TASK-053 — Graduation Decision

**Status:** DONE

## Dependency
TASK-052 = DONE.

## Objective
Menyimpan keputusan formal kelulusan.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`GraduationDecision`: evaluationId unique, decision (PASS/FAIL/REMEDIAL/etc configurable policy), decidedBy, decidedAt, note, status.

## API / Application Contract
Create/approve/revoke/correct decision sesuai minimal workflow; history/audit.

## Business Rules
Decision harus refer evaluation. Perubahan formal auditable, tidak delete history. Authorization sensitif.

## Acceptance Criteria
[x] no decision without evaluation; [x] audit; [x] history; [x] checks green.

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

## Status Note (Codex — menunggu review manusia)

**Keputusan desain.** `GraduationDecision` sengaja dipisah dari `GraduationEvaluation`. Evaluasi adalah *bukti* hasil rule engine (TASK-052); keputusan adalah *tindakan formal manusia* dengan pelaku, waktu, dan alasan. Pemisahan inilah yang membuat keputusan dapat dikoreksi atau dicabut tanpa menghapus bukti yang mendasarinya.

`graduationEvaluationId` bersifat **UNIQUE**: satu evaluasi memiliki paling banyak satu baris keputusan. Koreksi tidak menambah baris baru — koreksi memindahkan verdict pada baris yang sama, dan audit (TASK-006) mencatat nilai `before`/`after` sehingga verdict lama tetap terekonstruksi. Karena itu tidak ada `supersedesDecisionId` pada tabel ini; supersession sudah terjadi satu tingkat di atas, saat evaluasi ulang menandai evaluasi pendahulunya `SUPERSEDED`.

**Lifecycle.** `DRAFT → APPROVED → REVOKED`. `REVOKED` bersifat terminal — membuka kembali keputusan yang sudah dicabut akan menghapus fakta bahwa keputusan itu pernah dicabut, yang justru dilarang oleh aturan "preserve historical data". Koreksi bukan perpindahan status: verdict berubah sementara status tetap `APPROVED`.

**Tidak ada DELETE.** Tidak ada method `delete` pada repository maupun service. Pencabutan adalah status, bukan penghapusan.

**Migrasi.** `apps/api/prisma/migrations/20261009000300_task_053_graduation_decision/migration.sql` — diverifikasi verbatim: 12/12 statement cocok dengan SQL kanonik `prisma migrate diff --from-empty --to-schema-datamodel`.

**Endpoint** (prefix global `api/v1`, semua dilindungi Permission + Scope):

| Metode | Path | Permission |
| --- | --- | --- |
| POST | `/graduation/decisions` | `graduation.decision.record` |
| GET | `/graduation/decisions` | `graduation.decision.read` |
| GET | `/graduation/decisions/:id` | `graduation.decision.read` |
| PATCH | `/graduation/decisions/:id/approve` | `graduation.decision.approve` |
| PATCH | `/graduation/decisions/:id/correct` | `graduation.decision.approve` |
| PATCH | `/graduation/decisions/:id/revoke` | `graduation.decision.revoke` |

Empat permission dipisah, bukan satu `graduation.decision.manage`, karena spec menyebut workflow ini "authorization sensitif": tindakan yang mengubah status kelulusan seorang peserta didik harus dapat diberikan terpisah dari tindakan sekadar memasukkan verdict.

**Audit.** Action baru pada katalog append-only: `graduation_decision.created`, `.approved`, `.corrected`, `.revoked`; resource type `graduation_decision`.

**Test.** `apps/api/test/graduation-decision.test.cjs` — 16 test, semua lulus. Mencakup keempat acceptance criteria plus seluruh guard state machine.

**Verifikasi.** `pnpm lint` 11/11 · `pnpm typecheck` 14/14 · `pnpm build` 11/11 · `pnpm test` **@lms/api 278 pass / 0 fail**, `@lms/api-client` 6/6 · `prisma validate` valid.

**DEFERRED.** `prisma migrate deploy` tidak dijalankan karena Docker/database runtime tidak tersedia di environment ini (bukan blocker teknis task). Fidelity migrasi dibuktikan lewat perbandingan statement dengan SQL kanonik.

**Risiko.** Kolom pelaku (`decided_by_user_id`, `approved_by_user_id`, `revoked_by_user_id`) tidak divalidasi keberadaan user-nya oleh service — mengikuti pola TASK-052 yang hanya memvalidasi `graduationEvaluationId`. FK `RESTRICT` di level database tetap menjaga integritas. Jika reviewer menginginkan validasi eksplisit, ini titik perubahan yang jelas.
