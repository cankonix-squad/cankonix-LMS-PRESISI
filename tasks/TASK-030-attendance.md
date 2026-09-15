# TASK-030 — Attendance Session & Record

**Status:** NOT STARTED

## Dependency
TASK-017 dan TASK-015 = DONE.

## Objective
Mencatat sesi dan kehadiran.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AttendanceSession`: id, classSubjectId, meetingId nullable, startAt/endAt, method, status. `AttendanceRecord`: id, sessionId, enrollmentId, status, checkInAt nullable, note nullable, recordedByUserId; unique session+enrollment.

## API / Application Contract
Create/open/close session; record/bulk record attendance; list by session/student.

## Business Rules
Status baseline PRESENT/LATE/EXCUSED/SICK/ABSENT. Method MANUAL/QR_CODE/ONLINE/INTEGRATION sebagai configurable enum/master sesuai implementation. Enrollment harus sesuai class. Closed session tidak diedit langsung.

## Acceptance Criteria
[ ] unique record; [ ] eligibility; [ ] session lifecycle; [ ] checks green.

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
