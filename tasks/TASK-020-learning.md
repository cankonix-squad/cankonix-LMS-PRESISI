# TASK-020 — Learning Meeting

**Status:** REVIEW

## Dependency
TASK-014 = DONE.

## Verification Result
- `pnpm lint` → PASS (11 tasks, Prettier clean)
- `pnpm typecheck` → PASS (14 tasks)
- `pnpm test` → PASS (116 tests: 114 API + 2 api-client; 7 new tests in `apps/api/test/learning-meetings.test.cjs`, incl. OpenAPI contract)
- `pnpm build` → PASS (11 tasks)
- `pnpm --filter @lms/api db:validate` → PASS
- `pnpm --filter @lms/api db:generate` → PASS
- Runtime PostgreSQL migration remains DEFERRED (consistent with TASK-000 foundation).

## Objective
Membuat pertemuan sebagai container aktivitas pembelajaran.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
- `LearningMeeting`: id (UUID), classSubjectId (FK class_subjects, Restrict), sequence (Int), title, description nullable, plannedStartAt nullable (TIMESTAMP(3)), plannedEndAt nullable (TIMESTAMP(3)), status (`LearningMeetingStatus`: DRAFT, PUBLISHED, COMPLETED, ARCHIVED, default DRAFT), timestamps.
- `@@unique([classSubjectId, sequence])` — the deterministic ordering guarantee. Index `[classSubjectId]`, `[status]`. Back-relation `ClassSubject.meetings`.
- Migration: `apps/api/prisma/migrations/20260924000000_task_020_learning_meeting/`.
- Audit actions (append-only): `learning_meeting.created|updated|status_changed|reordered`; resource type `learning_meeting`.

## API / Application Contract
- `POST /api/v1/learning-meetings` (create; `sequence` optional — appended when omitted).
- `GET /api/v1/learning-meetings` (filter classSubjectId, academicClassId, educationBatchId, status, `search` on title + pagination; ordered by classSubjectId then sequence).
- `PATCH /api/v1/learning-meetings/reorder` (full ordered plan for one class subject) — declared before `:id` so the literal path wins.
- `GET /api/v1/learning-meetings/:id`.
- `PATCH /api/v1/learning-meetings/:id` (sequence, title, description, plannedStartAt, plannedEndAt, status; `classSubjectId` immutable).
- `PATCH /api/v1/learning-meetings/:id/status` (lifecycle move with optional `reason`).

## Business Rules
- **Meeting attach ke ClassSubject**: `classSubjectId` wajib ada (`404` bila tidak dikenal) dan tidak dapat dipindah pada update — memindahkan meeting akan melepaskan activity/progress yang menggantung padanya; arsipkan dan buat pengganti.
- **Sequence deterministic**: `@@unique([classSubjectId, sequence])` adalah jaminan sebenarnya; service mengubahnya menjadi `409` yang terbaca. Bila `sequence` tidak dikirim saat create, nilai `max + 1` dipakai sehingga tidak ada lubang di ujung. Sequence bersifat per class subject, bukan global.
- **Reorder memakai rencana penuh**: klien mengirim seluruh daftar meeting milik class subject dalam urutan akhir. Daftar parsial, id duplikat, id milik class subject lain, dan set yang tidak lengkap ditolak `400`. Penomoran ulang 1..N dijalankan dalam satu transaksi dua fase (park di sequence sementara lalu tulis nilai final) karena unique index `[classSubjectId, sequence]` membuat swap in-place gagal. Meeting `ARCHIVED` ikut serta dalam rencana karena masih memegang sequence.
- **Lifecycle**: `DRAFT → PUBLISHED → COMPLETED → ARCHIVED`, ditambah `PUBLISHED → DRAFT` (unpublish adalah koreksi normal dan non-destruktif) dan `DRAFT/PUBLISHED/COMPLETED → ARCHIVED`. `ARCHIVED` bersifat terminal — mengaktifkan kembali akan menghidupkan konten yang sudah dianggap pensiun oleh peserta dan laporan. Transisi ilegal ditolak `422`; status yang sama ditolak `400`.
- **Published meeting tidak boleh hilang secara destruktif**: tidak ada endpoint DELETE. Satu-satunya cara menyingkirkan meeting adalah `ARCHIVED`, yang mempertahankan baris, activity, dan progress. Meeting `ARCHIVED` juga tidak dapat diedit (`422`). Status transition di `PATCH :id` tunduk pada aturan transisi yang sama seperti endpoint status khusus.
- `plannedEndAt >= plannedStartAt` bila keduanya diisi (`400`).

## Acceptance Criteria
[x] sequence unique; [x] lifecycle; [x] checks green.

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
