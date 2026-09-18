# TASK-016 — Educator & Class Staff Assignment

**Status:** REVIEW

## Dependency
TASK-014 = DONE.

## Verification Result
- `pnpm lint` → PASS (11 tasks, Prettier clean)
- `pnpm typecheck` → PASS (14 tasks)
- `pnpm test` → PASS (102 tests: 100 API + 2 api-client; 14 new tests across `apps/api/test/educator-assignments.test.cjs` and `apps/api/test/class-staff-assignments.test.cjs`, incl. OpenAPI contract)
- `pnpm build` → PASS (11 tasks)
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS
- Runtime PostgreSQL migration remains DEFERRED (consistent with TASK-000 foundation).

## Objective
Mendukung pengajar lintas lembaga dan staf kelas dinamis.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
- `EducatorType`: id (UUID), code unique, name, description nullable, status (`MasterStatus`: ACTIVE, INACTIVE), timestamps. Migration adds the `MasterStatus` enum.
- `EducatorAssignment`: id (UUID), personId (FK persons, Restrict), classSubjectId (FK class_subjects, Restrict), educatorTypeId (FK educator_types, Restrict), validFrom (DATE), validUntil nullable (DATE), status (`AssignmentStatus`: ACTIVE, ENDED, CANCELLED), timestamps.
- `ClassStaffAssignment`: id (UUID), personId (FK persons, Restrict), academicClassId (FK academic_classes, Restrict), staffType (VarChar, data-driven code), validFrom (DATE), validUntil nullable (DATE), status (`AssignmentStatus`), timestamps.
- Indexes: `educator_assignments` on `[personId, status]`, `[classSubjectId, educatorTypeId, status]`, `[educatorTypeId]`; `class_staff_assignments` on `[personId, status]`, `[academicClassId, staffType, status]`.
- Migration: `apps/api/prisma/migrations/20260922000000_task_016_educator_assignment/`.
- Audit actions (append-only): `educator_type.created|updated`, `educator_assignment.created|updated|ended`, `class_staff_assignment.created|updated|ended`.

## API / Application Contract
- `POST|GET /api/v1/educator-types`, `GET|PATCH /api/v1/educator-types/:id` (filter `search`, `status` + pagination).
- `POST|GET /api/v1/educator-assignments` (filter personId, classSubjectId, educatorTypeId, academicClassId, educationBatchId, status + pagination — inilah teaching load).
- `GET|PATCH /api/v1/educator-assignments/:id`, `PATCH /api/v1/educator-assignments/:id/end`.
- `POST|GET /api/v1/class-staff-assignments` (filter personId, academicClassId, staffType, educationBatchId, status + pagination).
- `GET|PATCH /api/v1/class-staff-assignments/:id`, `PATCH /api/v1/class-staff-assignments/:id/end`.

## Business Rules
- **EducatorType data-driven, bukan enum hardcode**: katalog jenis pengajar (Gadik/instruktur/penguji dst) dibuat lewat API tanpa perubahan schema. `staffType` juga disimpan sebagai string bebas yang dinormalisasi (uppercase, spasi → `_`) sehingga peran seperti `WALI_KELAS` atau `KOORDINATOR_ASRAMA` dapat ditambah tanpa rilis.
- **Person**, **classSubject**, **academicClass**, dan **educatorType** yang tidak dikenal ditolak `404`; person non-`ACTIVE` dan educatorType non-`ACTIVE` ditolak `422`.
- Rentang tanggal divalidasi: `validUntil >= validFrom` (`400`); `end` tanpa `validUntil` memakai tanggal hari ini.
- **Duplikat assignment aktif dikendalikan**: assignment aktif yang sama untuk orang+classSubject+educatorType ditolak `409`, dan double-booking pada periode tumpang tindih untuk classSubject+educatorType yang sama juga ditolak `409` (scope slot, bukan orang — satu educator type per class subject bersifat single-holder). Untuk class staff, cakupan overlap adalah orang+class+staffType karena kode peran bebas milik institusi dapat sah dipegang beberapa orang sekaligus (mis. PENGASUH).
- **Satu person boleh lintas institution/program**: kombinasi person+classSubject+educatorType yang berbeda, atau person+class+staffType yang berbeda, selalu diperbolehkan — tidak ada constraint yang membatasi satu institusi.
- **Wali kelas tidak dipaksa menjadi subject educator**: `ClassStaffAssignment` berdiri sendiri dari `EducatorAssignment`; wali kelas dapat ditetapkan tanpa assignment mengajar sama sekali.
- Deaktivasi `EducatorType` diblokir `422` selama masih ada assignment `ACTIVE`; histori yang sudah `ENDED` tidak pernah memblokir.
- `end` hanya berlaku untuk assignment `ACTIVE` (`422` bila tidak) dan mengisi `validUntil` — baris tidak pernah dihapus sehingga histori teaching load tetap utuh. `PATCH` juga terbatas pada assignment `ACTIVE` dan tidak boleh memindahkan person/kelas/jenis (hanya `validFrom`, `validUntil`, `status`).

## Acceptance Criteria
[x] cross-institution supported; [x] date validity; [x] duplicate active assignment controlled; [x] checks green.

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
