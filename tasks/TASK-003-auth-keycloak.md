# TASK-003 — Authentication / Keycloak Integration

**Status:** DONE-WITH-DEFERRED

## Dependency
TASK-002 = DONE (approved 2026-09-16).

## Objective
Mengintegrasikan API dengan Keycloak/OIDC tanpa memindahkan authorization bisnis ke Keycloak.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Gunakan `UserAccount.externalAuthId` sebagai mapping `sub` Keycloak. Tidak ada tabel password/token rahasia. Config issuer/audience/client melalui environment.

## API / Application Contract
Tambahkan auth guard/strategy JWT untuk protected API, current-user context, dan endpoint diagnostik aman seperti `GET /api/v1/me` bila sesuai repository. Jangan membuat login password sendiri.

## Business Rules
Validasi signature, issuer, audience, expiry. Mapping subject harus ke UserAccount aktif. Keycloak menjawab identitas; permission/scope tetap NestJS. Secret tidak committed. Public health/docs mengikuti config keamanan.

## Acceptance Criteria
[x] auth guard dapat dites dengan mocked JWT/JWKS boundary; [x] inactive/unmapped user ditolak; [x] current user context tersedia; [x] no secrets/password storage; [x] checks green; runtime Keycloak boleh DEFERRED.

## Implementation Notes

### Shape
API diperlakukan sebagai **OIDC resource server**. Keycloak menerbitkan token; API hanya memvalidasi. Tidak ada login form, tidak ada token yang diterbitkan API, tidak ada penyimpanan password.

### Modul baru `apps/api/src/auth/`
| File | Peran |
| --- | --- |
| `auth.config.ts` | `AuthConfig`, pembacaan environment, `resolveDocsEnabled`, default + validasi |
| `auth.types.ts` | `AuthClaims`, `AuthenticatedPrincipal`, `AuthenticatedHttpRequest` (tanpa roles/permissions) |
| `jwks.provider.ts` | `JwksProvider` (port) + `KeycloakJwksProvider` (cache TTL, single-flight, force refresh) |
| `jwt-verifier.service.ts` | Verifikasi signature + claim, `TokenValidationError` |
| `auth-identity.resolver.ts` | `AuthIdentityResolver` (port) + `KeycloakIdentityResolver` |
| `auth.service.ts` | Verifikasi → mapping akun → pengecekan status → principal |
| `auth.guard.ts` | `JwtAuthGuard` (default-deny, `@Public()` opt-out) |
| `auth.decorators.ts` | `@Public()`, `@CurrentUser()` |
| `auth.controller.ts` | `GET /api/v1/me` |
| `auth.module.ts` | Dynamic module, registrasi `APP_GUARD` |
| `dto/current-user-response.dto.ts` | Kontrak respons identitas |

### Keputusan desain penting
- **Tanpa dependency baru.** Verifikasi RS256/RS384/RS512 memakai `node:crypto` (`createPublicKey` + `createVerify`) dan JWKS diambil dengan `fetch` bawaan Node. Tidak ada `@nestjs/jwt`, `jwks-rsa`, atau `jose`.
- **Default-deny.** `JwtAuthGuard` terdaftar sebagai `APP_GUARD` sehingga controller baru otomatis terproteksi. Opt-out hanya lewat `@Public()` (dipakai `GET /api/v1/health`).
- **Fail closed.** Bila config auth tidak ada/tidak lengkap, route terproteksi mengembalikan `401`; tidak pernah turun menjadi akses anonim. Di `NODE_ENV=production` konfigurasi tidak lengkap membuat proses gagal start.
- **Proteksi algorithm confusion.** `alg: none` dan keluarga HMAC (`HS256`/`HS384`/`HS512`) ditolak sebelum signature diverifikasi.
- **Rotasi key.** `kid` yang belum dikenal memicu tepat satu force refresh JWKS; kegagalan refresh tidak menghapus cache yang masih valid.
- **Pemisahan tanggung jawab.** `AuthIdentityResolver` adalah port sempit, sehingga guard tidak mengakses modul lain secara langsung dan dapat diganti fake pada test.
- **Identity-only.** `GET /api/v1/me` tidak mengembalikan roles/permissions; itu domain TASK-004/TASK-005.
- **Docs.** OpenAPI tetap di `api/v1/docs`, dapat dimatikan lewat `DOCS_ENABLED` (default mati di production).
- **`lastLoginAt`** ditulis saat autentikasi berhasil dengan throttle (`AUTH_LAST_LOGIN_THROTTLE_SECONDS`, default 300 detik).

### Perubahan pendukung
- `app.ts`: `createApp(options)` dengan seam `authConfig`, `jwksProvider`, `identityResolver`, `docsEnabled`; validasi konfigurasi environment.
- `app.module.ts`: `AppModule.register(...)` (dynamic) meneruskan seluruh opsi ke `AuthModule.register`.
- `health.controller.ts`: `@Public()`.
- `persons.service.ts`: `findPersonById` non-throwing.
- `user-accounts.service.ts` + `user-accounts.repository.ts`: `findAccountByExternalAuthId`, `touchLastLoginAt`, `updateLastLoginAt`.
- `apps/api/eslint.config.mjs`: global `Buffer` untuk berkas test.
- `apps/api/.env.example`, `README.md`: variabel dan dokumentasi autentikasi.
- **Tidak ada perubahan schema/migration.** `externalAuthId` sudah disiapkan sejak TASK-002.

## Verification Evidence

- PASS: `pnpm lint` (turbo lint 11/11 + `prettier --check .`)
- PASS: `pnpm typecheck` (14/14 task)
- PASS: `pnpm test` — `@lms/api` 33/33, `@lms/api-client` 2/2
- PASS: `pnpm build` (11/11 task)
- PASS: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lemdiklat_lms?schema=public" pnpm --filter @lms/api db:validate`
- PASS: `pnpm --filter @lms/api db:generate`
- DEFERRED: runtime Keycloak terhadap realm nyata.
- DEFERRED: audience mapper/client audience Keycloak.
- DEFERRED: runtime PostgreSQL migration, termasuk eksekusi migration warisan TASK-000/001/002.
- Deferred verification tersebut bukan blocker untuk development task berikutnya, tetapi wajib diselesaikan sebelum integration testing, UAT, atau production readiness.

### Test baru `apps/api/test/auth.test.cjs` (15 test)
RSA key pair nyata di-generate in-test; token benar-benar ditandatangani dan benar-benar diverifikasi, sehingga jalur verifikasi produksi teruji (bukan stub verifier).

Cakupan:
1. Verifier menerima token Keycloak yang valid.
2. Verifier menolak issuer, audience, `exp`, dan `nbf` yang tidak sah.
3. Verifier menolak signature yang diubah, `alg: none`, `HS256`, dan token non-compact.
4. Verifier melakukan tepat satu forced refresh untuk `kid` tak dikenal; memakai cache untuk `kid` dikenal.
5. JWKS provider: fetch sekali, cache, force refresh, dan refetch saat cache kedaluwarsa.
6. Konfigurasi auth diturunkan dari environment (JWKS dari issuer), override numerik dihormati, dan konfigurasi parsial/rusak dilaporkan tanpa pernah setengah diterapkan.
7. Instance `NODE_ENV=production` menolak start tanpa konfigurasi auth, termasuk konfigurasi yang hanya sebagian.
8. Auth service memetakan akun aktif ke principal dan mencatat aktivitas.
9. Auth service menolak subject tak terpetakan (401), akun `SUSPENDED`/`INACTIVE` (403), person `INACTIVE` (403), dan akun yatim (401).
10. Auth service melakukan throttle `lastLoginAt` dan fail closed tanpa config.
11. Route terproteksi: tanpa header, skema non-Bearer, token kedaluwarsa, token `HS256` palsu, dan subject tak terpetakan → 401.
12. `GET /api/v1/me` mengembalikan konteks identitas; `GET /api/v1/health` tetap publik; body tidak memuat roles/permissions.
13. Akun `SUSPENDED` dan person `INACTIVE` → 403 melalui HTTP.
14. OpenAPI memuat `/api/v1/me`, health, security scheme bearer, tanpa field credential; `kid` tak dikenal → 401.
15. Aplikasi tanpa konfigurasi auth tetap fail closed (401) sementara health tetap 200.

### Test yang disesuaikan
- `apps/api/test/persons.test.cjs`: helper `startAuthenticatedApp()` + `AUTHORIZATION`; ditambah test bahwa `/api/v1/persons` menolak pemanggil anonim dengan `401`.
- `apps/api/test/organizations.test.cjs`: memakai `createApp({ docsEnabled: true })`.

## Known Issues / Risks
- **Audience Keycloak belum diverifikasi terhadap realm nyata.** `KEYCLOAK_AUDIENCE` harus dicocokkan dengan client/audience mapper realm saat Docker tersedia. Risiko konfigurasi, bukan risiko kode.
- **`DOCS_ENABLED` default `true` di luar production.** OpenAPI bersifat publik demi konsumen API; bila kebijakan keamanan meminta sebaliknya, set `DOCS_ENABLED=false`.
- **Clock skew default 30 detik** dapat disetel via `AUTH_CLOCK_SKEW_SECONDS`.
- **Belum ada rate limiting** pada endpoint terproteksi. `docs/07-security-standards.md` menyarankan rate limit "where appropriate"; relevan saat endpoint write sensitif ditambahkan.
- **Roles/permissions belum ada** (di luar cakupan TASK-003).
- Migration runtime warisan TASK-000/001/002 tetap DEFERRED.

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
- `apps/api/src/auth/auth.config.ts`, `auth.types.ts`, `jwks.provider.ts`, `jwt-verifier.service.ts`
- `apps/api/src/auth/auth-identity.resolver.ts`, `auth.service.ts`, `auth.guard.ts`, `auth.decorators.ts`
- `apps/api/src/auth/auth.controller.ts`, `auth.module.ts`, `dto/current-user-response.dto.ts`
- `apps/api/test/auth.test.cjs`

### File diubah
- `apps/api/src/app.ts`, `apps/api/src/app.module.ts`, `apps/api/src/health/health.controller.ts`
- `apps/api/src/persons/persons.service.ts`
- `apps/api/src/user-accounts/user-accounts.service.ts`, `apps/api/src/user-accounts/user-accounts.repository.ts`
- `apps/api/eslint.config.mjs`, `apps/api/.env.example`, `README.md`
- `apps/api/test/persons.test.cjs`, `apps/api/test/organizations.test.cjs`
- `tasks/MASTER-CHECKLIST.md`, `tasks/TASK-002-person-user.md` (catatan approval reviewer)

### Migration / schema
Tidak ada. `UserAccount.externalAuthId` sudah tersedia dari TASK-002.

### Endpoint
- `GET /api/v1/me` — identitas pemanggil terautentikasi.
- `GET /api/v1/health` — publik melalui `@Public()`.
- Semua endpoint lain kini default-deny.

### Bug yang ditemukan dan diperbaiki selama verifikasi
1. `AppModule.register` tidak meneruskan `jwksProvider`/`identityResolver`, sehingga override test diabaikan dan app jatuh ke provider Keycloak asli.
2. `AuthController` memakai `@UseGuards` padahal guard sudah global → autentikasi berjalan dua kali per request.
3. `createPublicKey(publicKeyObject)` tidak valid pada Node 24; import JWK memakai `crypto.createPublicKey({ key: jwk, format: 'jwk' })` yang memang jalur yang benar.
4. `Buffer` belum terdaftar sebagai global ESLint untuk berkas test.

### Konfirmasi
Task berikutnya (TASK-004) **tidak** dikerjakan.

## Approval

User/reviewer menyetujui hasil code review TASK-003 pada 2026-09-16.

Status final: `DONE-WITH-DEFERRED`.

Deferred verification yang masih wajib:

- Runtime Keycloak terhadap realm nyata.
- Audience mapper/client audience Keycloak.
- Runtime PostgreSQL migration.

Deferred verification tersebut bukan blocker untuk development task berikutnya, tetapi wajib diselesaikan sebelum integration testing, UAT, atau production readiness.
