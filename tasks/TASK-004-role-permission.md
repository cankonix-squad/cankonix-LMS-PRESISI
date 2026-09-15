# TASK-004 — Role & Permission

**Status:** NOT STARTED

## Dependency
TASK-003 = DONE.

## Objective
Membangun RBAC dinamis berbasis data.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`Role`: id, unique code, name, description, `isSystem`, status, timestamps. `Permission`: id, unique code, name, description, timestamps. `RolePermission`: roleId+permissionId composite unique. Seed permission minimum per domain hanya yang sudah dibutuhkan; jangan seed semua masa depan secara spekulatif.

## API / Application Contract
CRUD role (dengan proteksi system role), list permissions, assign/remove permission ke role, read role permissions.

## Business Rules
Tidak boleh branching business logic berdasarkan string role. `isSystem` mencegah delete/perubahan berbahaya tetapi authorization tetap permission. Permission naming `<domain>.<resource>.<action>` konsisten.

## Acceptance Criteria
[ ] unique role/permission; [ ] role-permission idempotent; [ ] system role protected; [ ] tests authorization service; [ ] no hardcoded admin bypass; [ ] checks green.

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
