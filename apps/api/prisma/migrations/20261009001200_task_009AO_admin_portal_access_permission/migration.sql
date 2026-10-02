-- TASK-009AO — Admin portal access permission.
--
-- Before this migration the Admin portal had no backend authorization boundary:
-- any Keycloak identity could reach the Admin UI and would only be stopped
-- per-page by the individual domain permissions. An educator account
-- (`ui-pengajar-01102601`) holding an ACTIVE PENGAJAR assignment could therefore
-- open the Admin portal even though it holds no Admin permission at all.
--
-- This migration seeds the portal-boundary permission and grants it to the
-- existing SUPER_ADMIN system role.
--
-- It is deliberately NOT granted to PENGAJAR. Granting an Admin portal
-- permission to the educator role in order to make a UI gate pass would be the
-- exact mistake this task exists to prevent: portal access is authorization
-- data, and an educator assignment is not an Admin authorization.
--
-- No role-name branch is added to runtime authorization, which stays
-- Permission + Scope (the guard resolves `portal.admin.access`, or the broader
-- `portal.*.access`, from effective permissions).
--
-- Everything is idempotent and safe to re-run:
-- - permissions reuse `ON CONFLICT (code) DO NOTHING`
-- - role<->permission links reuse `ON CONFLICT (role_id, permission_id) DO NOTHING`

-- 1. Portal access permission catalogue ---------------------------------------
INSERT INTO "permissions" ("id", "code", "name", "description", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'portal.admin.access', 'Akses Portal Admin', 'Mengizinkan akun masuk dan mengoperasikan portal Admin LMS PRESISI', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 2. Grant the portal boundary to SUPER_ADMIN only (created by TASK-009AI). ---
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT
    r.id,
    p.id,
    CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code = 'portal.admin.access'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
