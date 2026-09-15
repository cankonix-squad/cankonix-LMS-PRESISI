# TASK-003 — Authentication / Keycloak Integration

**Status:** NOT STARTED

## Dependency
TASK-002 = DONE.

## Objective
Mengintegrasikan API dengan Keycloak/OIDC tanpa memindahkan authorization bisnis ke Keycloak.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Gunakan `UserAccount.externalAuthId` sebagai mapping `sub` Keycloak. Tidak ada tabel password/token rahasia. Config issuer/audience/client melalui environment.

## API / Application Contract
Tambahkan auth guard/strategy JWT untuk protected API, current-user context, dan endpoint diagnostik aman seperti `GET /api/v1/me` bila sesuai repository. Jangan membuat login password sendiri.

## Business Rules
Validasi signature, issuer, audience, expiry. Mapping subject harus ke UserAccount aktif. Keycloak menjawab identitas; permission/scope tetap NestJS. Secret tidak committed. Public health/docs mengikuti config keamanan.

## Acceptance Criteria
[ ] auth guard dapat dites dengan mocked JWT/JWKS boundary; [ ] inactive/unmapped user ditolak; [ ] current user context tersedia; [ ] no secrets/password storage; [ ] checks green; runtime Keycloak boleh DEFERRED.

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
