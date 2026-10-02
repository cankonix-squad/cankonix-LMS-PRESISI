# TASK-009AN — Admin Keycloak User Provisioning dari UI

**Status:** REVIEW

## Dependency

TASK-003 = DONE-WITH-DEFERRED, TASK-004 = DONE-WITH-DEFERRED,
TASK-009AI = REVIEW, TASK-009AM = REVIEW.

## Objective

Admin harus dapat membuat identitas Keycloak untuk `UserAccount` LMS yang sudah
ada langsung dari portal Admin, tanpa membuka konsol Keycloak manual. Sebelum
task ini, `UserAccount.externalAuthId` hanya bisa diisi manual, sehingga akun
seperti `ui-pengajar-01102601` memiliki role/permission LMS tetapi tidak bisa
login karena tidak memiliki identitas Keycloak.

Task ini menambahkan provisioning melalui **Keycloak Admin API** dengan
kredensial layanan dari environment API (bukan dari frontend), menyimpan hanya
subject Keycloak ke `UserAccount.externalAuthId`, dan **tidak pernah** menyimpan
password/token di database LMS.

## Mandatory References

`docs/04-authorization-model.md`, `docs/05-api-standards.md`,
`docs/06-database-standards.md`, `docs/07-security-standards.md`,
`docs/09-backend-architecture.md`, `TASK-003-auth-keycloak.md`,
`TASK-009-admin-person-user-ui.md`.

## Non-negotiable constraints (dipenuhi)

1. Backend LMS membuat user di Keycloak via Admin API memakai kredensial layanan
   di environment (`KEYCLOAK_ADMIN_*`), bukan dari frontend.
2. Hanya `UserAccount.externalAuthId` yang disimpan. **Tidak ada** kolom/field
   password, hash, atau token di schema LMS.
3. Aktivasi/password awal lewat Keycloak: API mem-forward password satu kali ke
   Keycloak (`PUT .../password`), dan default berupa kredensial sementara
   (`temporary: true`) sehingga Keycloak memaksa ganti password saat login
   pertama.
4. Duplikasi username/email, kegagalan sebagian (Keycloak sukses tetapi DB gagal),
   retry idempoten, dan audit log ditangani secara eksplisit.
5. UI menampilkan status jujur: `READY` (siap login), `ACTIVATION_REQUIRED` (perlu
   aktivasi), `ADOPTABLE`/`LINK_EXISTING`, `LINK_CONFLICT`, `STALE_LINK`,
   `NOT_CONFIGURED`, `ERROR`. Ada jalur **hubungkan/provision ulang** UserAccount
   yang sudah ada, termasuk akun `ui-pengajar-01102601`.
6. Model **Permission + Scope** dipertahankan: endpoint baru memakai
   `user_account.read`/`user_account.manage`; tidak ada branching role-name.
   Tidak ada perubahan API yang breaking (endpoint baru di bawah
   `/api/v1/persons/:personId/keycloak`).

## Data Model / Persistence

Tidak ada perubahan schema. Kolom `user_accounts.external_auth_id` (nullable,
unique) sudah ada. Migration yang ditambahkan hanya **seed permission**:

`apps/api/prisma/migrations/20261009001100_task_009AN_keycloak_provisioning_permissions/migration.sql`

- Seed `user_account.read` ("Lihat Akun Pengguna") dan `user_account.manage`
  ("Kelola Akun Pengguna") dengan `ON CONFLICT (code) DO NOTHING`.
- Tautkan keduanya ke role `SUPER_ADMIN` dengan
  `ON CONFLICT (role_id, permission_id) DO NOTHING`.

## API Contract (non-breaking, additive)

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/persons/:personId/keycloak/status` | `user_account.read` |
| POST | `/api/v1/persons/:personId/keycloak/provision` | `user_account.manage` |
| POST | `/api/v1/persons/:personId/keycloak/link-existing` | `user_account.manage` |
| PUT | `/api/v1/persons/:personId/keycloak/password` | `user_account.manage` |
| POST | `/api/v1/persons/:personId/keycloak/activation` | `user_account.manage` |
| PUT | `/api/v1/persons/:personId/keycloak/status` | `user_account.manage` |

Selain itu, endpoint `POST/PATCH/GET /api/v1/persons/:personId/account` dinaikkan
dari allow-list `@AllowAuthenticated()` menjadi `user_account.manage`/`.read`.
Perubahan ini **memperketat**, bukan breaking: permission yang sama persis dengan
endpoint provisioning.

Semua route terdokumentasi di OpenAPI. `SetKeycloakPasswordDto` adalah kontrak
**input** (password masuk, tidak pernah keluar); schema response tidak memiliki
`password`, `passwordHash`, atau `clientSecret`.

## Urutan operasi (idempotensi & kegagalan sebagian)

1. Panggil Keycloak **lebih dulu**. Bila Keycloak gagal, tidak ada link yang
   ditulis sehingga akun tetap jujur `NOT_PROVISIONED` — bukan menunjuk subject
   yang tidak ada.
2. Bila user dengan username yang sama sudah ada (sisa percobaan yang gagal),
   user tersebut **diadopsi**, bukan diduplikasi. Ini yang membuat retry
   idempoten.
3. Penulisan link memakai compare-and-set (`updateMany` dengan
   `externalAuthId = expectedCurrent`):
   - subject sama sudah tertulis → sukses (efek sudah tercapai);
   - subject berbeda tertulis orang lain → `LINK_CONFLICT`, nilai asing
     dipertahankan;
   - nilai masih kosong → penulisan DB gagal; status dilaporkan `ADOPTABLE`
     dengan pesan "coba lagi" sehingga retry memakai user Keycloak yang sama.

Audit: `user_account.keycloak_provisioned`, `user_account.keycloak_linked`,
`user_account.keycloak_password_set`, `user_account.keycloak_status_changed`.
Nilai password tidak pernah masuk audit (redaction + tidak pernah dikirim ke
`AuditService`).

## Scope

1. **Modul backend** `apps/api/src/keycloak-provisioning/**`: config environment,
   port + adapter (`KeycloakAdminClient` via `fetch`), null-object
   (`UnconfiguredKeycloakAdmin`) yang fail-closed, repository link (Prisma),
   service orkestrasi, controller, DTO, README.
2. **Permission** `apps/api/src/user-accounts/user-account-permissions.ts` +
   enforcement di `user-accounts.controller.ts`.
3. **Audit actions** baru di `apps/api/src/audit/audit-actions.ts`.
4. **Registrasi** `KeycloakProvisioningModule` di `apps/api/src/app.module.ts`.
5. **Migration seed permission** (lihat atas).
6. **Script operator** `apps/api/src/scripts/link-keycloak-user.ts`
   (`--username`/`--personnel-number`/`--person-id`/`--dry-run`/`--token`,
   idempoten, menolak bila sudah tertaut ke akun lain).
7. **API client** `packages/api-client/src/index.ts`: tipe + method
   `getKeycloakProvisioning`, `provisionKeycloakUser`, `linkExistingKeycloakUser`,
   `setKeycloakPassword`, `requestKeycloakActivation`, `setKeycloakUserStatus`.
8. **Admin UI** `apps/admin/src/features/foundation/keycloak-actions.ts`
   (server actions) dan `keycloak-provisioning-panel.tsx` (badge status + aksi),
   terintegrasi di `person-management.tsx` dan `app/personel/page.tsx`.
9. **Konfigurasi** `KEYCLOAK_ADMIN_*` didokumentasikan di
   `apps/api/.env.example`, `apps/api/src/keycloak-provisioning/README.md`,
   `README.md`, `.env.example`, dan diteruskan di
   `docker-compose.production.yml`.

## Scope boundaries

- **Tidak mengubah** portal educator/student/executive.
- **Tidak menulis** role/permission/scope ke Keycloak; otorisasi tetap di LMS.
- **Tidak menyimpan** password/token/hash di database LMS.
- **Tidak ada** branching nama role di guard/controller/business logic.

## Acceptance Criteria

- [x] Admin dapat membuat user Keycloak dari UI untuk `UserAccount` yang ada.
- [x] Kredensial layanan berasal dari environment, tidak pernah dari frontend.
- [x] Hanya `externalAuthId` yang disimpan; tidak ada password/hash/token di DB.
- [x] Password awal di-set sebagai kredensial sementara via Keycloak.
- [x] Duplikat username/email ditolak sebagai `LINK_CONFLICT`.
- [x] Kegagalan sebagian tidak disembunyikan; retry idempoten (adopsi, tanpa
      duplikat).
- [x] Compare-and-set menolak menimpa tautan yang berubah bersamaan.
- [x] Audit log tercatat; password tidak pernah masuk audit.
- [x] UI menampilkan status jujur dan menyediakan jalur link/re-provision untuk
      `ui-pengajar-01102601`.
- [x] Permission + Scope dipertahankan; tidak ada perubahan API yang breaking.
- [x] Endpoint tanpa kredensial provisioning fail-closed (`NOT_CONFIGURED`/503).

## Verification

- `pnpm typecheck` — PASS (22/22 tasks)
- `pnpm test` — PASS (467 test API + 9 test api-client, termasuk 21 test baru
  `apps/api/test/keycloak-provisioning.test.cjs`)
- `pnpm build` — PASS
- `pnpm --filter @lms/api db:validate` — PASS
- `pnpm --filter @lms/api db:generate` — PASS
- `git diff --check` — PASS
- `pnpm lint` — Turbo lint 11/11 PASS; langkah repo-wide `prettier --check .`
  gagal pada **46 file pre-existing** di luar task ini (features
  assessment/graduation/learning/academic admin, portal student/educator,
  `packages/ui`). Overlap dengan file yang diubah task ini = **0**; semua file
  task ini lolos `prettier --check`. Karena `prettier --check .` memakai glob
  repo-wide, kegagalan pre-existing tersebut tidak dapat diperbaiki tanpa
  menyentuh aplikasi lain yang di luar scope task ini.

Coverage test baru: sukses, idempotensi (retry tidak membuat duplikat), adopsi
user same-username, konflik username, konflik email, 409 Keycloak, kegagalan
transport Keycloak, gagal tulis DB + retry, penolakan penulisan bersamaan,
password (forward + tidak tersimpan), status (ADOPTABLE/STALE_LINK/ERROR/
NOT_CONFIGURED), batas HTTP (401/403), dan OpenAPI (tanpa field password).

## Verifikasi production (2026-10-01, setelah deploy)

Blocker provisioning "Belum ada akun" terbukti disebabkan migration seed
permission belum pernah diterapkan di production, bukan oleh kegagalan artefak
(image API memang sudah memuat kedua migration). Perbaikan struktural:
migration kini diterapkan oleh one-shot compose service `api-migrate` yang
wajib sukses sebelum service `api` boleh start
(`api.depends_on.api-migrate: service_completed_successfully`), sehingga
`docker compose up -d api` secara struktural tidak dapat melewati migration.

Bukti terverifikasi pada VPS `187.77.127.202` (db `lemdiklat`, commit `69772cec`,
deploy run `36866483770` = success):

- `cankonix-lms-lemdiklat-api-migrate` — `Exited (0)`; log berakhir
  `No pending migrations to apply.`
- `_prisma_migrations`: `20261009001000_task_009AM_seed_educator_role_permissions`
  dan `20261009001100_task_009AN_keycloak_provisioning_permissions` keduanya
  `ok=true` (finished); 0 migration gagal.
- `permissions` = 19; `assessment.manage`, `user_account.read`,
  `user_account.manage` ada.
- Role `P_001` (name `PENGAJAR`) = 10 permission; `SUPER_ADMIN` = 9 permission,
  termasuk `user_account.read` + `user_account.manage`.
- `bootstrap-admin` (personnel `BOOTSTRAP-ADMIN`) = `SUPER_ADMIN`,
  `external_auth_id = 5ca4fb3f-75a8-45e6-9de0-b928ff71e344`.
- Dist yang ter-deploy memuat `user_account.read`
  (`/app/dist/user-accounts/user-account-permissions.js`) dan 41 direktori
  migration.
- 403 pada `GET /persons/:id/account` kini tampil sebagai error jujur di UI
  ("Akses akun ditolak", `LoadErrorNotice`), bukan lagi sebagai "Belum ada akun".

## Konfigurasi kredensial provisioning production (2026-10-01, lanjutan)

Panel Admin menampilkan "Provisioning nonaktif" karena container API menerima
`KEYCLOAK_ADMIN_CLIENT_ID`/`KEYCLOAK_ADMIN_CLIENT_SECRET` kosong: `.env` VPS
belum memiliki keduanya, sedangkan `docker-compose.production.yml` meneruskannya
dengan default `:-` kosong. Kredensial disiapkan sebagai **service account
confidential** dengan izin minimum di realm `lemdiklat`.

Bukti terverifikasi di VPS `187.77.127.202` (nilai secret **tidak pernah**
ditampilkan pada repo, log, atau output):

- Client Keycloak `lms-admin-provisioning` dibuat di realm `lemdiklat` dengan
  `publicClient=false`, `serviceAccountsEnabled=true`, `standardFlowEnabled=false`,
  `directAccessGrantsEnabled=false`.
- Service account-nya hanya diberi **tiga** client role `realm-management`:
  `view-users`, `query-users`, `manage-users` (minimum untuk melihat/membuat
  user). Tidak ada `realm-admin` atau role lain.
- `KEYCLOAK_ADMIN_CLIENT_ID` (len 22) dan `KEYCLOAK_ADMIN_CLIENT_SECRET` (len 32)
  ditulis ke `.env` VPS — tepat 1 baris masing-masing, file `chmod 600`. Secret
  dibaca dari file sementara di dalam container lalu file dihapus; tidak masuk
  Git, log, maupun output.
- `docker compose up -d --no-build api` → container `api-migrate` `Exited (0)`,
  container `api` `healthy`. Env container: `KEYCLOAK_ADMIN_CLIENT_ID=SET`,
  `KEYCLOAK_ADMIN_CLIENT_SECRET=SET`, `KEYCLOAK_ADMIN_BASE_URL=SET len=49`,
  `KEYCLOAK_ADMIN_REALM=SET len=9` (nilai tidak ditampilkan).
- Log startup API: `[KeycloakAdmin] Keycloak user provisioning enabled for realm
  lemdiklat` — bukan lagi peringatan unconfigured. Uji `client_credentials` dari
  dalam container → HTTP `200`; uji `GET /admin/realms/lemdiklat/users?...`
  dengan token itu → HTTP `200`. Health publik `GET /api/v1/health` =
  `{"status":"ok"}`.
- Akun `ui-pengajar-01102601` (`status=ACTIVE`, `external_auth_id` kosong, dan
  belum ada user Keycloak dengan username tersebut) kini berstatus
  **NOT_PROVISIONED** ("Belum terhubung") dengan tombol provisioning — bukan lagi
  "Provisioning nonaktif".

Sesuai instruksi operator, langkah ini **tidak** membuat/mereset password user dan
**tidak** memprovision akun test; pembuatan user sungguhan tetap menjadi langkah
berikutnya yang eksplisit.

## Deferred (infrastruktur tidak tersedia lokal)

Docker/container runtime tidak tersedia secara lokal. Kredensial provisioning
production **sudah terpasang dan terverifikasi** (lihat bagian di atas), sehingga
verifikasi yang masih **DEFERRED** sebelum integration testing/UAT hanya:

- Pembuatan user Keycloak sungguhan + email aktivasi melalui UI Admin
  end-to-end. Belum dijalankan karena operator meminta menahan provisioning akun
  test pada langkah ini.

`prisma migrate deploy` untuk kedua migration seed permission **sudah
terverifikasi di production** (lihat bagian bukti di atas), sehingga tidak lagi
termasuk deferred.

Deferred ini bukan blocker development: seluruh perilaku service diuji terhadap
double in-memory, endpoint fail-closed saat provisioning tidak dikonfigurasi tetap
teruji, dan konfigurasi production kini menerima kredensial layanan.
