# TASK-009AM — Seed Educator (PENGAJAR) Role Permissions

**Status:** REVIEW

## Dependency

TASK-009AI = REVIEW, TASK-009AL = REVIEW, TASK-030/031/040/041/042/046 = DONE-WITH-DEFERRED/DONE.

## Objective

Role `PENGAJAR` sudah ada di production, tetapi belum ada permission operasional
yang melekat padanya — katalog permission baru berisi `authorization.*` saja.
Task ini men-seed permission operasional pengajar dan menautkannya ke role
`PENGAJAR`, sehingga katalog `/roles` menampilkan permission
attendance/question/assessment/exam dan role `PENGAJAR` tidak lagi 0 permission.

## Mandatory References

`docs/04-authorization-model.md`, `docs/07-security-standards.md`,
`docs/09-backend-architecture.md`, `docs/06-database-standards.md`,
`TASK-004-role-permission.md`, `TASK-009AI-bootstrap-admin-authorization-fix.md`.

## Data Model / Persistence

Tidak ada perubahan schema. Hanya seed data ke tabel `permissions` dan jembatan
`role_permissions` via migration Prisma.

Permission operasional yang di-seed (kode adalah source of truth, label Bahasa
Indonesia untuk nilai `name`):

| Kode | Name |
| --- | --- |
| `attendance.record.read` | Lihat Data Kehadiran |
| `attendance.record.manage` | Kelola Absensi Peserta |
| `attendance.correction.read` | Lihat Riwayat Koreksi Absensi |
| `attendance.correction.manage` | Kelola Koreksi Absensi |
| `question.type.read` | Lihat Jenis Soal |
| `question.bank.read` | Lihat Bank Soal |
| `question.bank.manage` | Kelola Bank Soal |
| `assessment.read` | Lihat Assessment & Penilaian |
| `assessment.manage` | Kelola Assessment & Penilaian |
| `exam.grade.manage` | Kelola Nilai Ujian |

Semua kode di atas sudah dideklarasikan sebagai vocabulary di
`apps/api/src/{attendance,question-banks,assessments,grading}/*-permissions.ts`
dan dipakai oleh route-nya — migration ini hanya men-seed data agar vocabulary
tersebut muncul di katalog dan ter-grant ke role.

## Scope

1. **Migration seed** `apps/api/prisma/migrations/20261009001000_task_009AM_seed_educator_role_permissions/migration.sql`:
   - Insert 10 permission di atas dengan `ON CONFLICT (code) DO NOTHING`.
   - Insert `role_permissions`: semua 10 permission → role `PENGAJAR`
     dengan `ON CONFLICT (role_id, permission_id) DO NOTHING`.
   - Role `PENGAJAR` dicocokkan TANPA primary key tetap. Di production role ini
     ada dengan `code = 'P_001'` dan `name = 'PENGAJAR'` (code digenerate saat
     pembuatan). Link dibuat robust dengan mencocokkan `name = 'PENGAJAR'` ATAU
     salah satu varian code yang dikenal (`PENGAJAR`, `ROLE_PENGAJAR`, `P_001`).
     Jika role belum ada, link menghasilkan 0 baris — katalog tetap ter-seed.

2. **Tidak ada hardcode role di guard/controller/business logic.**
   Role `PENGAJAR` adalah data operasional, bukan branch di runtime.
   Security tetap Permission + Scope.

3. **Tidak mengubah portal educator/student/executive.**

## Acceptance Criteria

- [x] 10 permission operasional tersedia di tabel `permissions`.
- [x] Permission di atas tertaut ke role `PENGAJAR` jika role tersebut ada.
- [x] Migration idempotent: bisa dijalankan berkali-kali tanpa duplikasi
      (`ON CONFLICT DO NOTHING`).
- [x] Tidak ada hardcode role `PENGAJAR` di guard/controller/runtime.
- [x] Role `PENGAJAR` boleh sebagai data operasional.
- [x] Portal educator/student/executive tidak diubah.
- [x] Katalog permission menampilkan attendance/question/assessment/exam;
      role `PENGAJAR` tidak lagi 0 permission (verifikasi runtime production).

## Verification

- `pnpm lint` — PASS
- `pnpm typecheck` — PASS
- `pnpm test` — PASS
- `pnpm --filter @lms/api db:validate` — PASS
- `pnpm --filter @lms/api db:generate` — PASS
- `git diff --check` — PASS

Verifikasi query production (A dan B) serta pemeriksaan UI `/roles` dijalankan
setelah `prisma migrate deploy` pada environment production.