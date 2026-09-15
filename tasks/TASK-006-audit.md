# TASK-006 — Audit Foundation

**Status:** NOT STARTED

## Dependency
TASK-005 = DONE.

## Objective
Menyediakan immutable audit trail untuk mutation sensitif.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`AuditLog`: id, actorUserAccountId nullable, action, resourceType, resourceId nullable, organizationId nullable, before JSON nullable, after JSON nullable, metadata JSON nullable, ipAddress/userAgent nullable, createdAt. Index actor/resource/action/date.

## API / Application Contract
Internal AuditService untuk record event; read/search audit endpoint harus permission-protected. Tidak ada generic endpoint untuk edit/delete audit.

## Business Rules
Audit append-only. Sensitive mutation: role/scope, identity lifecycle, organization hierarchy dan domain kritis berikutnya wajib memanggil audit service. Redact secret/token/password.

## Acceptance Criteria
[ ] append-only API design; [ ] audit on representative sensitive mutation; [ ] redaction test; [ ] searchable by actor/resource/date; [ ] checks green.

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
