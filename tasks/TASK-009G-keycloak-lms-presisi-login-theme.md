# TASK-009G — Keycloak LMS PRESISI Login Theme

**Status:** REVIEW

## Dependency

TASK-009F = REVIEW. Admin login landing page and operator UX are available.

## Objective

Membuat custom Keycloak login theme untuk realm `lemdiklat` agar halaman autentikasi SSO terlihat konsisten dengan halaman `/login` LMS PRESISI dan prototype `login.html`, tanpa memindahkan pemrosesan username/password keluar dari Keycloak.

## Mandatory References

`docs/02-domain-architecture.md`, `docs/05-api-standards.md`, `docs/07-security-standards.md`

## Data Model / Persistence

Tidak menambah persistence aplikasi. Konfigurasi yang berubah hanya theme Keycloak dan realm login theme.

## API / Application Contract

Flow OIDC tetap sama:

- Portal membuka `/api/auth/login`.
- Portal redirect ke Keycloak authorization endpoint.
- Keycloak memproses username/password.
- Callback tetap ke `/api/auth/callback`.

Tidak membuat custom password login di Admin app.

## Scope

- Tambah Keycloak login theme `lms-presisi`.
- Tampilan login mengikuti visual prototype: split hero, logo Lemdiklat, prinsip PRESISI, login card, dan copy LMS PRESISI.
- Form tetap memakai field Keycloak `username` dan `password`.
- Mount theme ke Keycloak container local dan production.
- Deploy production mengaktifkan `loginTheme=lms-presisi` untuk realm `lemdiklat`.
- Halaman Keycloak lain tetap fallback ke parent theme.

## Acceptance Criteria

[x] Theme `lms-presisi` tersedia dalam repository.
[x] Keycloak login memakai visual LMS PRESISI.
[x] Username/password tetap diproses Keycloak.
[x] Docker Compose local dan production mem-mount theme.
[x] Deploy production mengaktifkan theme untuk realm `lemdiklat`.
[x] checks green.

## Verification

- PASS: `node --check themes/keycloak/lms-presisi/login/resources/js/login.js`
- PASS: YAML parse for `docker-compose.yml`, `docker-compose.production.yml`, and `.github/workflows/deploy-production.yml`
- PASS: targeted Prettier check for edited YAML, Markdown, CSS, and JS files
- PASS: `git diff --check`
- DEFERRED: Keycloak container runtime preview. Docker is not installed in the local environment (`docker: command not found`). Production deploy mounts the theme and applies `loginTheme=lms-presisi` through Keycloak admin CLI.
