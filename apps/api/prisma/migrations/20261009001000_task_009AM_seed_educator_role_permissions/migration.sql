-- TASK-009AM — Seed educator (PENGAJAR) operational permissions.
--
-- Roles and permissions are DATA, not code branches: this migration adds the
-- operational permission catalogue needed by the PENGAJAR role and links the
-- two. It introduces no role-name check into runtime authorization (which stays
-- Permission + Scope), and it does not touch the guard/controller layer.
--
-- Everything here is idempotent and safe to re-run:
-- - permissions reuse `ON CONFLICT (code) DO NOTHING`
-- - role<->permission links reuse `ON CONFLICT (role_id, permission_id) DO NOTHING`
--
-- The PENGAJAR role is matched WITHOUT a fixed primary key. In production this
-- role exists with `code = 'P_001'` and `name = 'PENGAJAR'` (its code was
-- generated at creation time). To be robust, the link matches by name OR by any
-- of the known code variants ('PENGAJAR', 'ROLE_PENGAJAR', 'P_001'). If the role
-- is absent, the links simply insert zero rows — the catalogue is still seeded.

-- 1. Educator operational permission catalogue ------------------------------
INSERT INTO "permissions" ("id", "code", "name", "description", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'attendance.record.read', 'Lihat Data Kehadiran', 'Melihat sesi dan rekap data kehadiran peserta', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'attendance.record.manage', 'Kelola Absensi Peserta', 'Membuat/mengubah sesi kehadiran dan mencatat absensi peserta', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'attendance.correction.read', 'Lihat Riwayat Koreksi Absensi', 'Melihat riwayat koreksi atas data kehadiran', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'attendance.correction.manage', 'Kelola Koreksi Absensi', 'Menerapkan koreksi pada catatan kehadiran', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'question.type.read', 'Lihat Jenis Soal', 'Membaca katalog jenis soal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'question.bank.read', 'Lihat Bank Soal', 'Membaca bank soal beserta versi dan opsinya', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'question.bank.manage', 'Kelola Bank Soal', 'Membuat/mengubah bank soal, soal, opsi dan versi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'assessment.read', 'Lihat Assessment & Penilaian', 'Membaca assessment/penilaian pada kelas atau subject', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'assessment.manage', 'Kelola Assessment & Penilaian', 'Membuat/mengubah assessment dan memindahkannya antar lifecycle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'exam.grade.manage', 'Kelola Nilai Ujian', 'Menilai jawaban ujian secara manual/otomatis dan membaca hasil penilaian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 2. Link the educator permissions to the PENGAJAR role (if present). --------
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT
    r.id,
    p.id,
    CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE p.code IN (
      'attendance.record.read',
      'attendance.record.manage',
      'attendance.correction.read',
      'attendance.correction.manage',
      'question.type.read',
      'question.bank.read',
      'question.bank.manage',
      'assessment.read',
      'assessment.manage',
      'exam.grade.manage'
  )
  AND (r.name = 'PENGAJAR' OR r.code IN ('PENGAJAR', 'ROLE_PENGAJAR', 'P_001'))
ON CONFLICT ("role_id", "permission_id") DO NOTHING;