-- TASK-009AI — Bootstrap admin authorization seed.
--
-- Roles and permissions are DATA, not code branches: this migration inserts the
-- operational seed that lets `bootstrap-admin` open `/roles` and `/assignments`
-- without introducing any role-name check into the runtime authorization model
-- (which stays Permission + Scope).
--
-- Everything here is idempotent and safe to re-run:
-- - permissions reuse `ON CONFLICT (code) DO NOTHING`
-- - the role reuses `ON CONFLICT (code) DO NOTHING`
-- - role<->permission links reuse `ON CONFLICT (role_id, permission_id) DO NOTHING`
-- The account->role assignment itself is created later by the operational
-- script (it needs the actual account id resolved from the bootstrap person),
-- and that script is likewise idempotent.

-- 1. Authorization permission catalogue -------------------------------------
INSERT INTO "permissions" ("id", "code", "name", "description", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'authorization.role.read', 'Lihat Role', 'Membaca katalog role beserta permission yang dimiliki', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'authorization.role.manage', 'Kelola Role', 'Membuat, mengubah, menghapus role dan tautan role-permission', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'authorization.permission.read', 'Lihat Permission', 'Membaca katalog permission', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'authorization.permission.manage', 'Kelola Permission', 'Mendaftarkan atau men-seed kode permission', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'authorization.assignment.read', 'Lihat Penugasan Role', 'Membaca penugasan role dan binding scope', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'authorization.assignment.manage', 'Kelola Penugasan Role', 'Menugaskan/mencabut role, mengubah status penugasan, dan mengatur scope', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'authorization.effective_permission.read', 'Lihat Permission Efektif', 'Membaca/mengevaluasi permission efektif akun lain', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 2. Bootstrap administration role (system role). ---------------------------
-- `is_system = true` protects it from deletion/deactivation/code rename via the
-- service layer; it is still just data and never referenced as a code branch.
INSERT INTO "roles" ("id", "code", "name", "description", "is_system", "status", "created_at", "updated_at")
VALUES (
    gen_random_uuid(),
    'SUPER_ADMIN',
    'Super Administrator',
    'Administrator pusat yang memegang seluruh permission domain authorization untuk membuka akses awal. Security tetap dievaluasi melalui Permission + Scope.',
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

-- 3. Link every authorization permission to SUPER_ADMIN. --------------------
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT
    r.id,
    p.id,
    CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN (
      'authorization.role.read',
      'authorization.role.manage',
      'authorization.permission.read',
      'authorization.permission.manage',
      'authorization.assignment.read',
      'authorization.assignment.manage',
      'authorization.effective_permission.read'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;