# TASK-016 — Educator & Class Staff Assignment

**Status:** NOT STARTED

## Dependency
TASK-014 = DONE.

## Objective
Mendukung pengajar lintas lembaga dan staf kelas dinamis.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`EducatorType`: id, code unique, name, status. `EducatorAssignment`: id, personId, classSubjectId, educatorTypeId, validFrom, validUntil nullable, status. `ClassStaffAssignment`: id, personId, academicClassId, staffType/code, validFrom, validUntil nullable, status.

## API / Application Contract
CRUD educator type; assign/end educator to classSubject; assign/end class staff; list teaching load.

## Business Rules
EducatorType data-driven (Gadik/instruktur/penguji dst), bukan enum hardcode. Satu person boleh lintas institution/program. Wali kelas tidak dipaksa menjadi subject educator.

## Acceptance Criteria
[ ] cross-institution supported; [ ] date validity; [ ] duplicate active assignment controlled; [ ] checks green.

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
