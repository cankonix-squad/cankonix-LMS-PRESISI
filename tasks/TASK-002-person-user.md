# TASK-002 — Person & User Account

**Status:** DONE

## Review Decision
Approved as `DONE` by human/reviewer on 2026-09-16.

- Re-verification on approval date by agent: `pnpm lint`, `pnpm typecheck`, `pnpm test` (17/17 API + 2/2 api-client), `pnpm build`, `db:validate` — all PASS.
- Accepted with the documented open risk that the "one primary active placement per person" constraint is enforced in the service layer only (no partial unique index yet). Hardening is tracked for pre-UAT; it is not a blocker for TASK-003.
- Deferred runtime migration execution against PostgreSQL remains outstanding and must be completed before integration testing, UAT, or production readiness.

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
[x] schema+migration; [x] person CRUD; [x] account-person uniqueness; [x] organization history; [x] primary active constraint ditegakkan di service/test; [x] tidak ada password LMS DB; [x] tests + checks green.

## Verification Evidence
- PASS: `pnpm lint`
- PASS: `pnpm typecheck`
- PASS: `pnpm test` (17/17 API test; 10 di antaranya pada `apps/api/test/persons.test.cjs`)
- PASS: `pnpm build`
- PASS: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lemdiklat_lms?schema=public" pnpm --filter @lms/api db:validate`
- PASS: `pnpm --filter @lms/api db:generate`
- PASS: migration SQL diverifikasi identik dengan output `prisma migrate diff` dari schema sebelum/sesudah perubahan.
- DEFERRED: executing migration against PostgreSQL runtime. Warisan TASK-000/TASK-001; wajib diselesaikan sebelum integration testing, UAT, atau production readiness.

## Implementation Notes
- Prisma: model `Person`, `UserAccount`, `PersonOrganization`; enum `PersonStatus` dan `UserAccountStatus`.
- Migration `20260916000200_task_002_person_user` (plus `migration_lock.toml` yang belum ada dari TASK-001 dan dibutuhkan Prisma untuk `migrate deploy`).
- Modul baru: `persons` (Person CRUD + penempatan organisasi + riwayat) dan `user-accounts` (siklus hidup akun). Keduanya memakai repository interface + provider token, Controller → Service → Repository → Prisma.
- `PrismaModule` ditambahkan sebagai module `@Global` agar `PrismaService` tidak terduplikasi di setiap module; `OrganizationsModule` disesuaikan untuk memakainya. Ini perubahan integrasi yang diperlukan karena TASK-002 menambah dua module baru yang butuh akses database.
- Tidak ada kolom maupun endpoint password. `Person` dan `UserAccount` dipisahkan; `externalAuthId` disiapkan sebagai penghubung Keycloak untuk TASK-003 tanpa mengimplementasikan autentikasi atau RBAC di task ini.
- Riwayat penempatan tidak ditimpa: penempatan primary baru meng-end-date penempatan primary aktif sebelumnya (dengan `endDate` = `startDate` penempatan baru) di dalam satu transaksi database.
- Satu primary aktif per person ditegakkan di service dan diuji. Belum ada partial unique index di database; lihat Risks.
- `DELETE /api/v1/persons/:id` adalah soft deactivation (`status` → `INACTIVE`), bukan hard delete, agar riwayat pendidikan/penempatan tetap utuh.
- Satu UserAccount per Person ditegakkan oleh unique constraint `user_accounts.person_id` dan dicek di service.

## Risks / Follow-ups
- Race condition: dua permintaan `assignPlacement` primary yang benar-benar bersamaan masih dapat menghasilkan dua primary aktif, karena penegakan berada di service dan belum ada partial unique index. Perlu ditutup saat hardening database sebelum UAT.
- `withTransaction` di repository memakai Prisma interactive transaction; `endDate` primary sebelumnya memakai `startDate` penempatan baru sehingga tidak ada celah tanggal.
- Belum ada authorization/scope; endpoint masih terbuka sampai TASK-004/TASK-005. Ini konsisten dengan urutan task.

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
