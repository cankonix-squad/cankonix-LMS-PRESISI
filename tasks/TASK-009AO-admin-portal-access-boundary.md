# TASK-009AO — Admin Portal Access Boundary

**Status:** REVIEW

## Dependency

TASK-009AN = REVIEW. TASK-005 (scope) = DONE-WITH-DEFERRED, TASK-009AI
(bootstrap admin authorization) = REVIEW.

## Objective

Menutup celah otorisasi pada batas portal Admin. Sebelum task ini, gate portal
Admin adalah `hasAdminSession()`, yang hanya menanyakan **apakah ada cookie**,
bukan **apakah akun berhak**. Setiap identitas Keycloak yang valid — misalnya
akun pendidik dengan assignment `PENGAJAR` aktif (`ui-pengajar-01102601`) —
memegang token yang sah, sehingga dapat membuka portal Admin dan berhenti hanya
di permission domain per halaman; rute `/` tidak dihentikan oleh apa pun selain
keberadaan cookie.

Task ini memperkenalkan **batas portal sebagai permission** (`portal.admin.access`)
yang dinilai oleh LMS, dan menggantikan gate cookie di seluruh rute Admin.

## Mandatory References

`docs/04-authorization-model.md`, `docs/07-security-standards.md`,
`docs/09-backend-architecture.md`, `TASK-004-role-permission.md`,
`TASK-005-scope.md`, `TASK-009AI-bootstrap-admin-authorization-fix.md`,
`TASK-009AN-admin-keycloak-user-provisioning.md`.

## Non-negotiable rules yang dijaga

- **Tidak ada role name di runtime.** Tidak ada `hasRole('ADMIN')` dan tidak ada
  branch pada string role. Batas portal adalah permission yang di-resolve dari
  effective permissions, termasuk wildcard `portal.*.access`.
- **Backend adalah security boundary.** Gate portal di portal Admin adalah
  pertahanan berlapis + UX yang jujur; setiap panggilan API tetap ditegakkan
  oleh `PermissionGuard` di backend. Menyembunyikan UI bukan otorisasi.
- **Permission + Scope dipertahankan.** `portal.admin.access` adalah data yang
  di-grant sebuah role; akun memegangnya hanya karena `UserRoleAssignment` aktif.

## Data Model / Persistence

Tidak ada perubahan schema. Hanya seed data melalui migration
`apps/api/prisma/migrations/20261009001200_task_009AO_admin_portal_access_permission/`:

- **Permission**: `portal.admin.access` ("Akses Portal Admin"), inserted dengan
  `ON CONFLICT (code) DO NOTHING`.
- **RolePermission**: menautkan permission tersebut ke `SUPER_ADMIN`
  (`r.code = 'SUPER_ADMIN'`) dengan `ON CONFLICT (role_id, permission_id) DO NOTHING`.

Migration bersifat idempotent dan aman dijalankan ulang.

**Sengaja TIDAK di-grant ke `PENGAJAR`.** Memberi permission portal Admin kepada
role pendidik agar sebuah gate UI lolos adalah kesalahan yang justru dicegah
task ini: akses portal adalah data otorisasi, dan assignment pendidik bukan
otorisasi Admin.

## Scope

1. **Katalog permission backend** — `apps/api/src/authorization/portal-permissions.ts`
   mengekspor `PORTAL_PERMISSIONS.ADMIN_ACCESS = 'portal.admin.access'` sebagai
   satu-satunya sumber kode di sisi backend.

2. **Migration seed** — `20261009001200_task_009AO_admin_portal_access_permission`
   (permission + grant ke `SUPER_ADMIN`, idempotent).

3. **Gate portal di portal Admin** — `apps/admin/src/lib/api.ts`:
   - `ADMIN_PORTAL_PERMISSION` — cermin kode backend (data, bukan role).
   - `getAdminPortalAccess()` / `evaluateAdminPortalAccess(token)` — dua panggilan
     berurutan ke LMS: `GET /me` (memetakan token ke account id, sekaligus uji
     jujur "apakah token masih diterima") lalu
     `GET /authorization/users/{id}/has-permission/portal.admin.access`.
   - Status: `GRANTED` / `DENIED` / `NO_SESSION` / `UNAUTHENTICATED` /
     `UNAVAILABLE`. Kegagalan **fail closed** (`UNAVAILABLE`, bukan lolos).
   - `hasAdminPortalAccess()` — varian non-navigasi (mengembalikan state).
   - `requireAdminPortalAccess()` — gate halaman; bila tidak `GRANTED`, melakukan
     `redirect` dan tidak pernah kembali.
   - `denialRedirect(status)` — `NO_SESSION`/`UNAUTHENTICATED` ke `/login`;
     `DENIED`/`UNAVAILABLE` ke `/akses-ditolak`. "Belum masuk" dan "masuk tetapi
     bukan Admin" tidak boleh disamakan.
   - `PORTAL_DENIAL_MESSAGES` + `toDenialReason()` — copy Bahasa Indonesia per
     alasan penolakan; input `?reason=` tidak tepercaya dan dinarrowing.

4. **Callback OIDC** (`app/api/auth/callback/route.ts`) — `evaluateAdminPortalAccess`
   dipanggil **sebelum** cookie sesi apa pun ditulis. Akun yang gagal tidak
   pernah menerima sesi Admin.

5. **Halaman `/akses-ditolak`** — layar penolakan eksplisit, dirender di luar
   `AdminShell` dan tanpa gate portal agar tidak terjadi loop.

6. **Migrasi seluruh rute Admin** ke gate portal:
   - 6 halaman yang melakukan redirect: `/`, `/roles`, `/sertifikat`,
     `/system-health`, `/template-sertifikat`, `/tugas`.
   - `features/foundation/dashboard.tsx` memakai varian **non-navigasi**
     (`hasAdminPortalAccess`), karena ia bercabang di dalam komponen untuk
     merender `LoginRequiredState` — bukan melakukan navigasi.

7. **`hasAdminSession()` dihapus.** Gate berbasis keberadaan cookie tidak lagi
   tersedia sebagai jalan pintas.

8. **api-client** — `authorization.hasPermission(userAccountId, permissionCode, params?)`
   dan `authorization.effectivePermissions(userAccountId)` beserta tipe
   `PermissionEvaluationResult` / `EffectivePermission`.

## Acceptance Criteria

- [x] Permission `portal.admin.access` tersedia sebagai data seed.
- [x] Permission hanya di-grant ke `SUPER_ADMIN`, tidak ke `PENGAJAR`.
- [x] Tidak ada role-name branch di guard/controller/business logic.
- [x] Tidak ada bypass auth (keputusan dibuat LMS dari effective permissions).
- [x] Portal Admin tidak lagi menganggap keberadaan cookie sebagai izin.
- [x] Setiap rute Admin memanggil gate portal sebelum merender data.
- [x] Dashboard memakai gate non-navigasi (tidak mengubah perilaku render).
- [x] Penolakan dibedakan per alasan; "bukan Admin" tidak dibounce diam-diam ke login.
- [x] Kegagalan memverifikasi akses menutup akses (`UNAVAILABLE`), bukan membukanya.
- [x] Migration idempotent dan aman dijalankan ulang.
- [x] Portal educator/student/executive tidak diubah.

## Verification

- `pnpm --filter @lms/api test` → **473 pass, 0 fail** (+2 test kontrak:
  migration TASK-009AO idempotent + `PENGAJAR`/`P_001` tidak pernah di-grant;
  katalog `PORTAL_PERMISSIONS` = `portal.admin.access`).
- `pnpm --filter @lms/admin test` → **16 pass, 0 fail** (+8 test regresi portal:
  batas portal adalah permission bukan role; sesi tidak ada = state, bukan throw;
  gate halaman menavigasi ke `/login`; penolakan dirutekan per alasan; `?reason=`
  tidak tepercaya; keenam halaman memanggil gate dan tidak lagi menguji cookie;
  dashboard memakai gate non-navigasi; kode gate Admin = kode katalog backend).
- `pnpm --filter @lms/admin typecheck` (`next typegen && tsc --noEmit`) → **PASS**
  (sebelumnya 7 error: `hasAdminSession` tidak diekspor pada 6 halaman + dashboard,
  dan `hasPermission` belum ada di `dist` api-client).
- `pnpm --filter @lms/api-client build` → PASS (`hasPermission` kini ada di
  `dist/index.d.ts`).
- Prettier, ESLint, `git diff --check` → PASS.

## Deferred

- Runtime end-to-end terhadap Keycloak + PostgreSQL production (akun pendidik
  ditolak, akun `SUPER_ADMIN` diterima) — tidak ada container runtime lokal.
- Penerapan migration `20261009001200` di production: migration akan diterapkan
  oleh one-shot service `api-migrate` pada deploy berikutnya. Sampai itu terjadi,
  deploy harus diverifikasi lewat `_prisma_migrations` (`ok=true`), bukan lewat
  status run.
- Grant `portal.admin.access` kepada akun Admin selain `bootstrap-admin` masih
  berupa data assignment manual (bukan bagian task ini).
