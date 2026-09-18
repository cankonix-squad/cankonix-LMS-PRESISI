# TASK-024 — Assignment & Submission

**Status:** REVIEW

## Dependency
TASK-015 (Enrollment), TASK-017 (Educator Assignment), TASK-021 (Learning Activity Content), TASK-022 (File Management) = tersedia.

## Objective
Mendukung tugas, submission, file, dan penilaian assignment.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence

| Model | Table | Kolom kunci |
| --- | --- | --- |
| `Assignment` | `assignments` | `id`, `activity_id` (FK `learning_activities`, `@@unique`), `assessment_id` (nullable UUID, tanpa FK — domain assessment belum dibangun), `title`, `instructions` nullable, `due_at` nullable, `max_score` default 100, `attempts_allowed` default 1, `status` (`AssignmentLifecycleStatus`) default `DRAFT`, timestamps |
| `AssignmentSubmission` | `assignment_submissions` | `id`, `assignment_id` (FK), `enrollment_id` (FK), `attempt_no`, `submitted_at` nullable, `text_answer` nullable, `is_late` default `false`, `status` (`AssignmentSubmissionStatus`) default `DRAFT`, timestamps, `@@unique([assignment_id, enrollment_id, attempt_no])` |
| `AssignmentSubmissionFile` | `assignment_submission_files` | `id`, `submission_id` (FK → `assignment_submissions`, **Cascade**), `stored_file_id` (FK → `stored_files`, Restrict), `label` nullable, `created_at`, `@@unique([submission_id, stored_file_id])` |
| `AssignmentGrade` | `assignment_grades` | `id`, `submission_id` (**`@unique`**, FK), `score` `Decimal(7,2)`, `grader_person_id` (FK `persons`), `feedback` nullable, `graded_at`, timestamps |

Enum:
- `AssignmentLifecycleStatus` = `DRAFT | PUBLISHED | CLOSED | ARCHIVED`.
- `AssignmentSubmissionStatus` = `DRAFT | SUBMITTED | GRADED | RETURNED`.

Back-relation yang ditambahkan: `LearningActivity.assignment`, `Enrollment.submissions`, `StoredFile.submissionFiles`, `Person.assignmentGrades`.

Asumsi desain yang dicatat:
- `Assignment.activityId` `@@unique` — satu learning activity memiliki tepat satu assignment, sehingga "assignment mana untuk activity ini" selalu terjawab tanpa tie-breaker.
- `AssignmentGrade.score` adalah `Decimal`, yang diserialisasi Prisma menjadi string; tipe domain `AssignmentGradeRecord.score` menerima `string | { toString(): string }` dan semua konsumen melewati `Number(score)`.
- `AssignmentSubmissionFile.submissionId` memakai `onDelete: Cascade` karena tautan file adalah bagian dari aggregate submission; file fisik (`stored_files`) tetap `Restrict` agar TASK-022 tidak kehilangan referensi.
- Enum lifecycle baru dinamai `AssignmentLifecycleStatus` karena `AssignmentStatus` sudah dipakai educator-assignment (`ACTIVE`/`ENDED`/`CANCELLED`).

Migration: `apps/api/prisma/migrations/20260928000000_task_024_assignment_submission/migration.sql` (127 baris).

## API / Application Contract

`@Controller('assignments')`:

| Method | Path | Ringkasan |
| --- | --- | --- |
| `POST` | `/api/v1/assignments` | Buat assignment untuk satu learning activity |
| `GET` | `/api/v1/assignments` | Daftar assignment (`activityId`, `meetingId`, `classSubjectId`, `academicClassId`, `educationBatchId`, `status`, `search`, `page`, `limit`) |
| `GET` | `/api/v1/assignments/{id}` | Baca satu assignment |
| `PATCH` | `/api/v1/assignments/{id}` | Ubah assignment (title, instructions, dueAt, assessmentId, maxScore, attemptsAllowed) |
| `PATCH` | `/api/v1/assignments/{id}/status` | Publish / close / archive |

`@Controller('assignment-submissions')` — pemisahan base path agar route submission tidak bertabrakan dengan `assignments/:id`:

| Method | Path | Ringkasan |
| --- | --- | --- |
| `GET` | `/api/v1/assignment-submissions` | Daftar submission (`assignmentId`, `enrollmentId`, `submissionStatus`, `page`, `limit`) |
| `POST` | `/api/v1/assignment-submissions` | Peserta submit satu attempt |
| `GET` | `/api/v1/assignment-submissions/{id}` | Baca satu submission beserta file dan grade |
| `PATCH` | `/api/v1/assignment-submissions/{id}` | Ubah `textAnswer` attempt berstatus DRAFT |
| `POST` | `/api/v1/assignment-submissions/{id}/files` | Lampirkan file yang sudah di-upload |
| `DELETE` | `/api/v1/assignment-submissions/{id}/files/{storedFileId}` | Lepas file |
| `POST` | `/api/v1/assignment-submissions/{id}/grade` | Beri nilai satu attempt (educator) |
| `POST` | `/api/v1/assignment-submissions/{id}/return` | Rilis nilai agar terlihat peserta |

Semua route memakai `@AllowAuthenticated()` (lihat "Risiko" di bawah). `POST .../grade` dan `POST .../return` memakai `@CurrentUser().personId` sebagai `graderPersonId` dan memverifikasi otoritas educator sebelum penilaian.

## Business Rules
- **Deadline server authoritative.** `isLate` dihitung dari jam server (`now > assignment.dueAt`), bukan dari input klien. Pengiriman setelah deadline tetap diterima namun ditandai `isLate = true`.
- **attemptsAllowed enforced.** `attemptNo` selalu diturunkan dari hitungan server (`maxAttemptNo + 1`); bila attempt sudah terpakai >= `attemptsAllowed`, pengiriman baru ditolak 409.
- **Resubmission tidak overwrite historical attempt.** Resubmission membuat baris attempt baru (`attemptNo + 1`). Draft yang terbuka dilanjutkan (nomor attempt draft dipakai kembali) sehingga tidak ada lubang pada urutan attempt.
- **Grade 0..maxScore.** Batas atas divalidasi di service terhadap `assignment.maxScore` (tidak ada di request DTO); skor di luar rentang ditolak 400.
- **Satu grade per attempt.** `AssignmentGrade.submissionId` unik; menilai attempt lama tidak mengubah grade attempt lain.
- **Feedback tertahan sampai rilis.** Response menyembunyikan `feedback` selama status masih `GRADED`; baru terlihat ketika status `RETURNED`.
- **File attachment terikat namespace.** File wajib berasal dari namespace `assignment-submission` dan berstatus `UPLOADED`/`ACTIVE`; selain itu 422. Duplikat 409.
- **Attachment beku setelah dinilai.** Lampir/lepas file ditolak 422 begitu submission `GRADED`/`RETURNED` — menukar lampiran setelah penilaian akan membatalkan nilai.
- **Authorization.** Peserta hanya boleh submit melalui enrollment miliknya sendiri (`enrollment.personId === principal.personId`) dan enrollment harus `ACTIVE`. Penilaian hanya oleh educator aktif pada class subject terkait (`EducatorAssignment` ACTIVE dalam rentang `validFrom`..`validUntil`).
- **ARCHIVED bersifat terminal.** Assignment `ARCHIVED` tidak bisa diubah maupun dipindah statusnya. Perubahan ke status yang sama adalah no-op tanpa menulis audit (tahan retry).
- **Penurunan langit-langit ditolak.** `maxScore` tidak boleh turun di bawah grade yang sudah ada, dan `attemptsAllowed` tidak boleh turun di bawah jumlah attempt tercatat (keduanya 409).

## Acceptance Criteria
[x] deadline/attempt tests
[x] file relation
[x] grade validation
[x] tests + checks green

## Verification Result
Dijalankan dari root repository:

| Perintah | Hasil |
| --- | --- |
| `pnpm lint` | PASS — 11 tasks (0 error) |
| `pnpm typecheck` | PASS — 14 tasks |
| `pnpm build` | PASS — 11 tasks |
| `pnpm test` | PASS — **159 API + 2 api-client = 161 test, 0 fail** (`assignments.test.cjs` 19 test baru) |
| `pnpm --filter @lms/api db:validate` | PASS — "The schema at prisma/schema.prisma is valid 🚀" |
| `pnpm --filter @lms/api db:generate` | PASS — Prisma Client v6.19.3 |

Test `apps/api/test/assignments.test.cjs` (19 test) mencakup:
1. pembuatan assignment (activity tidak ada → 404; activity sudah punya assignment → 409; normalisasi title/default).
2. `ARCHIVED` terminal, edit ditolak, dan same-status no-op tanpa audit.
3. `maxScore` tidak boleh turun di bawah grade yang ada.
4. `attemptsAllowed` tidak boleh turun di bawah attempt terpakai.
5. deadline: sebelum deadline `isLate=false`, sesudah `isLate=true`; `attemptsUsed`/`attemptsRemaining` benar.
6. resubmission menambah `attemptNo=2` dan attempt 1 tetap utuh.
7. `attemptsAllowed` dihitung sisi server (attempt ke-3 dari 2 ditolak 409).
8. hanya assignment `PUBLISHED` menerima submission.
9. peserta tidak bisa submit lewat enrollment orang lain; enrollment non-`ACTIVE` ditolak.
10. submission tanpa teks dan tanpa file ditolak 400; draft + satu file memenuhi syarat.
11. lampiran: namespace salah 422, file belum terkonfirmasi 422, file tidak ada 404, duplikat 409.
12. lampiran bisa dilepas; setelah dinilai lampir/lepas ditolak 422.
13. grade di luar `0..maxScore` ditolak 400; feedback hanya terlihat setelah rilis.
14. `returnToParticipant` menghasilkan status `RETURNED` dan audit `assignment.grade_returned`.
15. attempt `DRAFT` tidak bisa dinilai.
16. otoritas educator ditegakkan (bukan educator → 422; educator aktif → lolos).
17. setiap attempt membawa grade-nya sendiri.
18. listing submission dapat di-scope ke satu peserta.
19. route `/api/v1/assignments` dan `/api/v1/assignment-submissions` terekspos di OpenAPI dan mengembalikan 401 tanpa token.

**DEFERRED (bukan blocker task, sesuai TASK-000):** eksekusi migration pada PostgreSQL runtime tidak dapat dijalankan karena Docker/DB runtime tidak tersedia di lingkungan ini. Migration sudah digenerate dan schema tervalidasi; eksekusi runtime akan diverifikasi saat environment database tersedia.

## Risiko / Catatan
- Seluruh controller domain pendidikan memakai `@AllowAuthenticated()` sebagai carry-forward dari task sebelumnya; `@RequirePermissions`/`@RequireScope` belum dipasang. Ini adalah risiko yang sudah terdaftar dan harus diganti sebelum produksi.
- `Assignment.assessmentId` belum memiliki FK karena domain assessment (TASK-040+) belum dibangun; kolom disiapkan agar integrasi berikutnya tidak memerlukan migration destruktif.
- Status `CLOSED` disediakan pada lifecycle dan hanya boleh dimasuki dari `PUBLISHED`; penggunaannya belum dipakai otomatis oleh scheduler mana pun.
- `POST /assignment-submissions` menerima `assignmentId` + `enrollmentId` di body dan memverifikasi bahwa enrollment dimiliki pemanggil; pengikatan berbasis route (`/assignments/{id}/submissions`) dapat dipertimbangkan bila UI sudah mapan.

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

### File dibuat
- `apps/api/src/assignments/assignments.module.ts`
- `apps/api/src/assignments/assignments.controller.ts` (dua controller: `AssignmentsController`, `AssignmentSubmissionsController`)
- `apps/api/src/assignments/assignments.repository.ts`
- `apps/api/src/assignments/assignments.service.ts`
- `apps/api/src/assignments/submissions.service.ts`
- `apps/api/src/assignments/assignment.types.ts`
- `apps/api/src/assignments/dto/assignment-status.dto.ts`
- `apps/api/src/assignments/dto/assignment-submission-status.dto.ts`
- `apps/api/src/assignments/dto/create-assignment.dto.ts`
- `apps/api/src/assignments/dto/update-assignment.dto.ts`
- `apps/api/src/assignments/dto/update-assignment-status.dto.ts`
- `apps/api/src/assignments/dto/list-assignments-query.dto.ts`
- `apps/api/src/assignments/dto/submission.dto.ts`
- `apps/api/src/assignments/dto/grade-submission.dto.ts`
- `apps/api/src/assignments/dto/assignment-response.dto.ts`
- `apps/api/test/assignments.test.cjs`

### File diubah
- `apps/api/prisma/schema.prisma` — 4 model, 2 enum, 4 back-relation.
- `apps/api/src/audit/audit-actions.ts` — 9 action + 3 resource type.
- `apps/api/src/app.module.ts` — registrasi `AssignmentsModule`.

### Migration / Schema
`apps/api/prisma/migrations/20260928000000_task_024_assignment_submission/migration.sql`.

### Endpoint
13 route pada dua controller (`assignments`, `assignment-submissions`) — lihat tabel di atas.

### Test
`apps/api/test/assignments.test.cjs` — 19 test, semuanya lolos.

### Hasil pemeriksaan
lint 11 tasks PASS, typecheck 14 tasks PASS, build 11 tasks PASS, test 161 PASS / 0 fail, `db:validate` PASS, `db:generate` PASS.

### Verification DEFERRED
Eksekusi migration pada PostgreSQL runtime (Docker tidak tersedia).

### Konfirmasi
Task berikutnya tidak dikerjakan. Status dihentikan pada `REVIEW`.
