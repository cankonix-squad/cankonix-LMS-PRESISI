# TASK-015 — Enrollment

**Status:** NOT STARTED

## Dependency
TASK-013 = DONE.

## Objective
Menyimpan keikutsertaan peserta dan histori pendidikan.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`Enrollment`: id, personId, educationBatchId, academicClassId nullable, enrollmentNumber nullable, enrolledAt, status, completedAt nullable, metadata nullable; unique person+batch (baseline).

## API / Application Contract
Enroll/withdraw/transfer class within same batch/list participants/person education history.

## Business Rules
Enrollment adalah business context, bukan permanent PESERTA role. Person harus aktif. Class jika ada harus milik batch. Withdrawal/completion tidak menghapus record.

## Acceptance Criteria
[ ] duplicate enrollment ditolak; [ ] invalid class/batch ditolak; [ ] history preserved; [ ] checks green.

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
