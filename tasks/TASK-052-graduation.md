# TASK-052 — Graduation Rules & Evaluation

**Status:** DONE

## Dependency
TASK-051 dan TASK-033 = DONE.

## Objective
Rules configurable dan evaluation snapshot.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`GraduationRule`; `GraduationRuleComponent` (attendance/final score/required subject/final exam etc); `GraduationEvaluation`; `GraduationEvaluationDetail` snapshot results.

## API / Application Contract
CRUD/publish rules; evaluate enrollment/batch; read details.

## Business Rules
Evaluation terpisah dari formal decision. Rule version/snapshot preserved. Tidak sekadar enrollment.isPassed.

## Acceptance Criteria
[x] rule components; [x] snapshot reproducible; [x] threshold tests; [x] checks green.

## Status Note — implemented, moved to REVIEW (2026-09-19)

### Files created
- `apps/api/prisma/migrations/20261009000200_task_052_graduation/migration.sql` (4 tabel, 3 enum, 8 FK, 4 unique/index)
- `apps/api/src/graduation/graduation-rules.ts` — evaluator murni (`validateRuleComponents`, `evaluateEnrollment`, `evaluateComponent`, `toNumber`)
- `apps/api/src/graduation/graduation.service.ts`, `graduation.repository.ts`, `graduation.controller.ts`, `graduation.module.ts`, `graduation.types.ts`, `graduation-permissions.ts`
- `apps/api/src/graduation/dto/graduation.dto.ts`, `dto/graduation-response.dto.ts`
- `apps/api/test/graduation.test.cjs` (14 test)

### Files modified
- `apps/api/prisma/schema.prisma` — `GraduationRule`, `GraduationRuleComponent`, `GraduationEvaluation`, `GraduationEvaluationDetail` + enum `GraduationRuleStatus`, `GraduationComponentType`, `GraduationEvaluationOutcome` + relasi balik pada `EducationBatch`, `Enrollment`, `Subject`, `Assessment`, `UserAccount`
- `apps/api/src/app.module.ts` — `GraduationModule` terdaftar
- `apps/api/src/audit/audit-actions.ts` — action `graduation_rule.*`, `graduation_rule_component.created`, `graduation_evaluation.run` + resource type terkait
- `apps/api/eslint.config.mjs` — global Node untuk `test/*.cjs` (`setImmediate`, `__dirname`, dll.)

### Endpoint (`/api/v1`, Permission + Scope, tanpa role hardcode)
- `POST /graduation/rules` (`graduation.rule.manage`)
- `GET /graduation/rules`, `GET /graduation/rules/:id` (`graduation.rule.read`)
- `PATCH /graduation/rules/:id`, `PATCH /graduation/rules/:id/status` (`graduation.rule.manage`)
- `POST /graduation/evaluations/enrollment`, `POST /graduation/evaluations/batch` (`graduation.evaluation.run`)
- `GET /graduation/evaluations/:id`, `GET /graduation/enrollments/:enrollmentId/evaluations` (`graduation.evaluation.read`)

### Business rules implemented
- Evaluation terpisah dari formal decision (TASK-053).
- Rule version/snapshot preserved: snapshot menyimpan `ruleId`, `ruleCode`, `ruleVersion`, threshold dan observed value per komponen.
- Bukan `enrollment.isPassed`: outcome dihitung dari komponen rule; observasi yang tidak ada = gagal, bukan 0.
- Rule `PUBLISHED` dibekukan (tidak bisa diubah, tidak bisa kembali ke `DRAFT`).
- Re-evaluasi membuat baris baru dan menandai evaluasi lama `SUPERSEDED` (history tidak dihapus).

### Verification
- `pnpm lint` (root, 11 task + Prettier) → PASS
- `pnpm typecheck` (root, 14 task) → PASS
- `pnpm test` (root) → PASS: **262 API + 6 api-client, 0 fail** (14 test baru di `graduation.test.cjs`)
- `pnpm build` (root, 11 task) → PASS
- `db:validate` + `db:generate` → PASS
- Fidelity migration: setiap statement pada `20261009000000_task_050_grading`, `20261009000100_task_051_final_grade`, dan `20261009000200_task_052_graduation` diverifikasi **cocok verbatim** dengan SQL kanonik `prisma migrate diff`.

### DEFERRED
- Runtime `prisma migrate deploy` ke PostgreSQL nyata (Docker/container runtime tidak tersedia; tidak diinstal otomatis). Bukan blocker teknis: validitas migration dibuktikan lewat perbandingan SQL kanonik.

### Carry-forward risk
- `PrismaGraduationRepository.loadEvaluationContext` membaca `attendance_summaries` (TASK-033) untuk persentase kehadiran. Bila summary untuk enrollment belum pernah dihitung, komponen `ATTENDANCE_PERCENTAGE` akan gagal dengan catatan eksplisit — perilaku yang disengaja (fail-closed), namun operator perlu menjalankan refresh summary lebih dulu.

### Catatan perbaikan prasyarat (TASK-050/051)
Sebelum TASK-052, ditemukan bahwa TASK-050 dan TASK-051 ditandai `DONE` **tanpa Prisma migration**, tanpa endpoint scheme/component, dan tanpa entri katalog audit. Atas persetujuan reviewer, gap tersebut ditutup dalam sesi ini (lihat entri `MASTER-CHECKLIST`).


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
