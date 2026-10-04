# TASK-009AP — Foundation: Bahasa Indonesia & Pemisahan Data Individu / Akun Pengguna

**Status:** REVIEW

## Dependency

TASK-002 (person-user) = DONE, TASK-004 (role-permission) =
DONE-WITH-DEFERRED, TASK-005 (scope) = DONE-WITH-DEFERRED, TASK-009L
(person-user operator UX) = REVIEW, TASK-009AN (Keycloak user provisioning) =
REVIEW, TASK-009AO (Admin portal access boundary) = REVIEW.

## Objective

Merapikan modul Foundation pada portal Admin dalam dua pekerjaan:

**A. Konsistensi bahasa.** Menu `Foundation` menjadi `Data Induk`, dan seluruh
antarmuka modul (menu, judul halaman, label formulir, kolom tabel, tombol,
filter, tooltip, pesan validasi, notifikasi, dialog konfirmasi, empty state)
memakai satu glosarium: Foundation → Data Induk, Person → Data Individu, User
Account → Akun Pengguna, Role → Peran, Permission → Hak Akses, Assignment →
Penugasan, Organization Scope → Cakupan Organisasi, Active/Inactive →
Aktif/Nonaktif. Singkatan resmi NRP/NIP dan SSO dipertahankan.

**B. Pemisahan Data Individu dan Akun Pengguna.** Sebelum task ini, satu halaman
`/personel` menggabungkan identitas orang dan identitas login: formulir person
membawa field akun, dan akun hanya bisa lahir sebagai efek samping pembuatan
person. Task ini memisahkan menu, halaman daftar, formulir, dan tanggung
jawabnya.

## Mandatory References

`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`,
`docs/04-authorization-model.md`, `docs/05-api-standards.md`,
`docs/07-security-standards.md`, `docs/08-frontend-architecture.md`,
`docs/09-backend-architecture.md`, `TASK-002-person-user.md`,
`TASK-009-admin-person-user-ui.md`, `TASK-009AN-admin-keycloak-user-provisioning.md`,
`TASK-009AO-admin-portal-access-boundary.md`.

## Temuan model data (sebelum perubahan)

`Person` dan `UserAccount` **sudah** berupa dua tabel terpisah dengan relasi
1:1 (`user_accounts.person_id` unique, FK `onDelete: Restrict`). Karena itu
**tidak ada perubahan schema dan tidak ada migration** pada task ini; pekerjaan
ini adalah pemisahan UI/API/workflow, bukan perubahan model. Kardinalitas yang
sudah berlaku — **satu akun per individu, banyak peran/penugasan** — dipertahankan
apa adanya, dan dukungan akun sistem/service tidak diubah.

## Non-negotiable rules yang dijaga

- **Nama tabel, kolom database, endpoint API, dan identifier kode tidak
  diterjemahkan.** Perubahan bahasa hanya pada tampilan pengguna. Route UI Admin
  (`/personel`, `/roles`, `/assignments`) memang diganti nama, dan route lama
  dipertahankan lewat redirect permanen.
- **Backend tetap security boundary.** Pemisahan menu tidak memperluas akses:
  direktori akun baru memakai permission `user_account.read` yang sama, dan
  pemanggil tanpa permission tetap ditolak `403` — direktori tidak menjadi jalan
  pintas.
- **Permission + Scope dipertahankan.** Tidak ada branch role-name di runtime.
- **Tidak ada penggabungan identitas otomatis.** Email atau nama yang sama tidak
  pernah disimpulkan sebagai orang yang sama.
- **SSO dipertahankan.** Tidak ada login/password lokal; password tidak pernah
  disimpan di LMS.

## Scope

### A. Bahasa Indonesia

1. **Glosarium terpusat** — `apps/admin/src/features/foundation/display.ts`
   (baru) memuat pemetaan status dan formatter yang dipakai bersama
   (`accountStatusLabel/Tone`, `personStatusLabel`, `assignmentStatusLabel/Tone`,
   `placementLabel`, `scopeTypeLabel`, `SCOPE_TYPE_LABEL`,
   `PROVISIONING_STATUS_LABEL`, `IDENTITY_AMBIGUITY_LABEL`, `formatDate`,
   `formatDateTime`, `AccountReadError`) sehingga Data Individu dan Akun Pengguna
   tidak mungkin memakai dua kata berbeda untuk satu nilai backend.
2. **Sapuan bahasa** pada `actions.ts`, `keycloak-actions.ts`,
   `role-permission-management.tsx`, `assignment-scope-management.tsx`,
   `dashboard.tsx`, `organization-management.tsx`,
   `keycloak-provisioning-panel.tsx`, `components/admin/feedback.tsx`, dan
   `lib/admin-permission-labels.ts`.
3. **Navigasi** — `admin-shell.tsx`: grup `Data Induk` (Organisasi,
   Data Individu) dan grup `Manajemen Akses` (Akun Pengguna,
   Peran & Hak Akses, Penugasan). Kelompok menu yang sudah setara dipakai ulang;
   tidak ada menu duplikat.
4. **Rename route + redirect permanen** (`next.config.mjs`):
   `/personel` → `/data-individu`, `/roles` → `/peran-hak-akses`,
   `/assignments` → `/penugasan`.

### B. Pemisahan Data Individu dan Akun Pengguna

5. **Data Individu** — `features/foundation/person-management.tsx`
   (`PersonWorkspace`) dan route `/data-individu`, `/data-individu/[id]`:
   - sumber utama identitas orang (nama, NRP/NIP, pangkat, jabatan, satuan kerja);
   - **dapat dibuat tanpa akun pengguna** — formulirnya tidak memiliki satu pun
     field login;
   - tidak menyimpan pengaturan login atau hak akses;
   - satu baris per orang, tidak diduplikasi ketika orang tersebut menerima
     peran atau penugasan tambahan.
6. **Akun Pengguna** — `features/foundation/account-management.tsx`
   (`AccountWorkspace`) dan route `/akun-pengguna`:
   - mengelola identitas login/SSO (`externalAuthId`), status akun, peran, dan
     cakupan kewenangan;
   - **memilih** individu yang sudah terdaftar lewat picker, tidak meminta
     pengisian ulang nama dan NRP/NIP; identitas ditampilkan sebagai proyeksi
     read-only;
   - picker hanya menawarkan individu yang belum memiliki akun, sehingga alur
     normal tidak bisa membuat akun kedua.
7. **Detail Data Individu** (`/data-individu/[id]`) menampilkan akun yang
   terhubung atau `Belum memiliki akun`, plus panel Keycloak dan riwayat
   satuan kerja. **Detail Akun Pengguna** menampilkan identitas pemilik dan
   tautan ke detail individunya.
8. **Status individu dan status akun dibedakan.** Menonaktifkan akun hanya
   menghentikan akses login; identitas, riwayat pendidikan, penugasan, dan data
   akademik tetap tersimpan. Perubahan status individu tidak mengubah status akun
   (`createPersonAction` tidak menyentuh akun sama sekali).
9. **Server actions dipisah** — `createPersonWithAccountAction` diganti
   `createPersonAction` (identitas saja) dan `createPersonAccountAction`
   (menghubungkan akun ke `personId` yang sudah ada).
10. **Kode mati dihapus** — `assignment-management.tsx`,
    `create-person-account-form.tsx`, panel dashboard yang sudah tidak dipakai
    (`PersonAccountPanel`, `RolePermissionPanel`, `AssignmentScopePanel`,
    `PersonList`, `PersonAccountCell`, `RolePermissionList`, `RoleList`,
    `PermissionList`, `AssignmentList`, `loadPersonAccounts`, `loadUserAccounts`).

### C. Integritas data dan kompatibilitas

11. **Direktori akun (API)** — `GET /api/v1/user-accounts`
    (`UserAccountDirectoryController`) dengan `user_account.read`:
    `apps/api/src/user-accounts/dto/list-user-accounts-query.dto.ts`,
    `user-account-with-person-response.dto.ts`,
    `UserAccountsService.list()`, dan `PrismaUserAccountsRepository.list()`.
    Controller terpisah dari `persons/:personId/account` karena yang satu
    menjawab "siapa saja yang punya akun" dan yang lain menjawab "apakah orang
    ini punya akun". Pencarian mencakup kedua sisi relasi (nama/NRP pada
    `Person`, username/email pada `UserAccount`).
12. **Audit integritas identitas** — `apps/api/src/persons/identity-audit.ts`
    (fungsi murni `findIdentityAmbiguities`),
    `person-identity.types.ts`, `dto/identity-audit-response.dto.ts`,
    `PersonsService.auditIdentity()`, `PersonsRepository.listIdentityCandidates()`,
    dan `GET /api/v1/persons/identity-audit`.
    Laporan memuat `totalPersons`, `personsWithAccount`, `personsWithoutAccount`,
    `orphanedAccounts`, `personsWithMultipleAccounts`, dan `ambiguities`
    (`DUPLICATE_EMAIL`, `DUPLICATE_NAME`, `ACCOUNT_EMAIL_MISMATCH`).
    Audit **hanya melaporkan**: tidak menggabung, mengganti nama, mengosongkan,
    atau menonaktifkan satu baris pun. Setiap finding membawa seluruh kandidat
    (`personIds`), tanpa memilih pemenang.
13. **UI audit** — panel `Pemeriksaan integritas identitas` pada
    `/data-individu` menampilkan hitungan dan daftar identitas ambigu beserta
    tautan ke tiap kandidat. Kegagalan pembacaan audit **tidak** dirender sebagai
    "tidak ada temuan".
14. **api-client** — tipe `UserAccountWithPerson`, `IdentityAmbiguity`,
    `IdentityAuditReport`; `persons.get()`, `persons.identityAudit()`, dan
    namespace `userAccounts.list()`.
15. **Pembacaan akun yang gagal dibedakan dari "tidak punya akun".** `403`
    dirender sebagai `Akses akun ditolak`, bukan `Belum memiliki akun` — regresi
    produksi yang membuat operator membuat akun duplikat.

## Acceptance Criteria

- [x] Antarmuka Data Induk konsisten Bahasa Indonesia.
- [x] Data Individu dan Akun Pengguna memiliki halaman serta formulir terpisah.
- [x] Individu dapat disimpan tanpa akun (tidak ada field akun pada formulirnya).
- [x] Akun dapat dihubungkan ke individu yang sudah terdaftar (picker by id).
- [x] Identitas tidak diduplikasi pada formulir akun (nama/NRP read-only).
- [x] Satu orang dapat memiliki beberapa peran tanpa menjadi beberapa individu.
- [x] Penonaktifan akun tidak menghapus identitas atau riwayat akademik.
- [x] Login SSO dan pembatasan akses tetap berjalan (`user_account.read` tetap
      menjadi batas; direktori akun menolak `403` tanpa permission itu).
- [x] Data lama dan relasi lintas modul tetap utuh (tidak ada perubahan schema).
- [x] Tidak ada nama tabel/kolom/endpoint/identifier kode yang diterjemahkan.
- [x] Tidak ada menu duplikat; kelompok menu yang setara dipakai ulang.
- [x] Tidak ada penggabungan identitas otomatis; data ambigu dilaporkan.

## Verifikasi

- `pnpm turbo run typecheck lint` → **33 tasks successful** (PASS).
- `pnpm turbo run test` → **6 packages successful, 0 fail**:
  - `pnpm --filter @lms/api test` → **477 pass, 0 fail** (+4 test kontrak baru:
    direktori akun dengan identitas pemilik dan pencarian lintas relasi, filter
    status akun independen dari status individu, audit integritas tanpa mutasi,
    dan audit yang melaporkan ambiguitas tanpa menggabung; +1 test otorisasi
    `GET /user-accounts` menolak `403` tanpa `user_account.read` dan `401` tanpa
    token).
  - `pnpm --filter @lms/admin test` → **25 pass, 0 fail** (+9 test regresi
    pemisahan Data Individu / Akun Pengguna).
- `pnpm turbo run build` → **11 tasks successful**; `pnpm --filter @lms/admin
  build` merender route `/data-individu`, `/data-individu/[id]`,
  `/akun-pengguna`, `/peran-hak-akses`, `/penugasan` tanpa route `/personel`,
  `/roles`, atau `/assignments`.
- Prettier, ESLint, `git diff --check` → PASS.

## Deferred

- Verifikasi runtime end-to-end terhadap PostgreSQL + Keycloak production
  (membuat individu tanpa akun, menghubungkan akun, menonaktifkan akun lalu
  memastikan riwayat akademik tetap terbaca) — tidak ada container runtime lokal.
- Eksekusi `GET /persons/identity-audit` terhadap data produksi. Audit belum
  pernah dijalankan pada dataset nyata, sehingga jumlah ambiguitas produksi belum
  diketahui dan belum ditinjau.
- Keputusan bisnis yang masih tertunda (lihat catatan di bawah).

## Catatan untuk peninjau: data dan keputusan bisnis

1. **Kepemilikan email login.** `ACCOUNT_EMAIL_MISMATCH` dilaporkan, bukan
   diperbaiki, karena email Keycloak (identitas login) dan email `Person`
   (kotak surat organisasi) bisa sah berbeda. Perlu keputusan alamat mana yang
   menjadi identitas login resmi.
2. **Email bersama (shared mailbox).** `DUPLICATE_EMAIL` dapat berasal dari email
   unit yang dipakai beberapa orang, bukan dari orang yang sama. Audit karena itu
   tidak pernah menggabung berdasarkan email.
3. **Nama lengkap sama.** `DUPLICATE_NAME` adalah kandidat, bukan konfirmasi.
   Dua orang dapat sah memiliki nama yang sama; penggabungan hanya boleh
   dilakukan manusia setelah membandingkan NRP/NIP dan riwayat.
4. **Akun tanpa individu dan individu dengan banyak akun.** Keduanya dihitung
   sebagai invarian yang harus `0` (dijamin FK dan `person_id` unique). Angka
   bukan-nol berarti asumsi schema dilanggar dan perlu ditinjau sebelum data
   dipakai lebih lanjut.
5. **Nonaktifkan individu.** Tombol nonaktif cepat pada daftar Data Individu
   sengaja dinonaktifkan; status individu hanya diubah melalui Edit agar tidak
   ada perubahan tersembunyi yang berdampak ke modul akademik.
