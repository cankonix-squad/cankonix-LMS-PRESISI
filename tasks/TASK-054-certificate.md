# TASK-054 — Certificate Template / Issue / Verification

**Status:** NOT STARTED

## Dependency
TASK-053 dan TASK-022 = DONE.

## Objective
Issue certificate versioned dan public verification minimal.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`CertificateTemplate`: id, name, version, templateObjectKey/config, status. `Certificate`: decisionId, templateId, certificateNumber unique, verificationCode unique, issuedAt, fileId nullable, status. `CertificateRevocation` task berikutnya.

## API / Application Contract
Template CRUD/version; issue certificate; authenticated read; public verify by code with minimal approved fields.

## Business Rules
Hanya eligible PASS decision. Number/code unpredictable enough. Public endpoint tidak expose PII berlebih. Issued certificate references template version.

## Acceptance Criteria
[ ] eligibility; [ ] unique number/code; [ ] minimal public projection; [ ] file storage abstraction; [ ] checks green.

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
