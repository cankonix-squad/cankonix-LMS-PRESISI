# TASK-002 — Person & User Account

**Status:** NOT STARTED

## Dependency
TASK-001 = DONE.

## Objective
Memisahkan identitas anggota/person dari akun aplikasi dan menyimpan riwayat penempatan organisasi.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Model `Person`: id, `personnelNumber`/NRP unique, fullName, optional rank/title/contact fields, status, timestamps. `UserAccount`: id, personId unique, `externalAuthId` unique nullable, username/email nullable, status, timestamps; tanpa password. `PersonOrganization`: id, personId, organizationId, positionName nullable, startDate, endDate nullable, isPrimary, timestamps; indexes person/org/date.

## API / Application Contract
CRUD/read Person; read/update UserAccount lifecycle; assign/end organization placement; endpoint riwayat organisasi per person. Jangan membuat password endpoint.

## Business Rules
Satu Person maksimal satu UserAccount pada baseline. NRP/personnelNumber unik. Placement historis tidak ditimpa: assignment baru/end-date assignment lama. Hanya satu primary active placement per person. UserAccount tidak menentukan role.

## Acceptance Criteria
[ ] schema+migration; [ ] person CRUD; [ ] account-person uniqueness; [ ] organization history; [ ] primary active constraint ditegakkan di service/test; [ ] tidak ada password LMS DB; [ ] tests + checks green.

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
