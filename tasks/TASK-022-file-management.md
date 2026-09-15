# TASK-022 — File Management

**Status:** NOT STARTED

## Dependency
TASK-000 = DONE-WITH-DEFERRED atau DONE.

## Objective
Menyediakan abstraction object storage aman untuk seluruh domain.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`StoredFile`: id, objectKey unique, originalName, mimeType, size, checksum nullable, ownerUserId nullable, status, timestamps. Binary MinIO/S3, bukan PostgreSQL.

## API / Application Contract
Internal FileService + API upload initiation/completion/download signed URL sesuai kebutuhan; delete logical/retention-aware.

## Business Rules
Whitelist size/type configurable. Object key generated server. Jangan percaya filename client. Authorization dilakukan sebelum signed URL. Runtime MinIO boleh DEFERRED.

## Acceptance Criteria
[ ] metadata persistence; [ ] key sanitization; [ ] authorization boundary; [ ] mocked storage tests; [ ] no binary DB; [ ] checks green.

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
