-- TASK-009AN — User account / Keycloak provisioning permissions.
--
-- Replaces the foundation `@AllowAuthenticated()` allow-list on the user-account
-- routes with a real Permission + Scope boundary, and grants the two codes to
-- the existing SUPER_ADMIN system role so the Admin portal keeps working.
--
-- No role-name branching is introduced: the codes are data, and SUPER_ADMIN
-- gets them because a row links the two. A deployment that wants a narrower
-- operator role grants these codes to that role instead, with a scope.
--
-- Everything is idempotent and safe to re-run:
-- - permissions reuse `ON CONFLICT (code) DO NOTHING`
-- - role<->permission links reuse `ON CONFLICT (role_id, permission_id) DO NOTHING`

-- 1. Permission catalogue -----------------------------------------------------
INSERT INTO "permissions" ("id", "code", "name", "description", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'user_account.read', 'Lihat Akun Pengguna', 'Membaca UserAccount dan status provisioning Keycloak', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'user_account.manage', 'Kelola Akun Pengguna', 'Membuat/mengubah UserAccount dan melakukan provisioning identitas Keycloak', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 2. Grant both codes to SUPER_ADMIN (created by the TASK-009AI migration). ----
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT
    r.id,
    p.id,
    CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN ('user_account.read', 'user_account.manage')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
