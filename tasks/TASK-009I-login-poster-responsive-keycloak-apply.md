# TASK-009I — Login Poster Responsive & Keycloak Theme Apply

**Status:** REVIEW

## Dependency

TASK-009H = REVIEW. Admin login fullscreen hero is available.

## Objective

Merapi halaman login Admin dan Keycloak agar poster LMS PRESISI tampil utuh tanpa crop, tetap responsive di desktop/tablet/mobile, dan deploy production selalu memastikan realm `lemdiklat` memakai theme Keycloak `lms-presisi`.

## Mandatory References

`docs/07-security-standards.md`

## Scope

- Ubah Admin `/login` dari `object-cover` menjadi poster utuh.
- Pertahankan CTA masuk ke `/api/auth/login`.
- Ubah Keycloak login theme menjadi poster background utuh dengan form login overlay.
- Pastikan form username/password tetap diproses Keycloak.
- Pastikan deploy production selalu menjalankan set `loginTheme=lms-presisi`.

## Acceptance Criteria

[x] Admin `/login` tidak memotong poster utama.
[x] Admin `/login` responsive.
[x] Keycloak login memakai theme LMS PRESISI dengan poster tidak terpotong.
[x] Deploy production memastikan realm `lemdiklat` memakai theme `lms-presisi`.
[x] checks green.

## Verification

- PASS: workflow YAML parse.
- PASS: Prettier for supported edited files.
- PASS: `git diff --check`.
- PASS: targeted ESLint for edited Admin login files.
- PASS: `next typegen`.
- PASS: `tsc --noEmit` for `apps/admin`.
- PASS: `next build --webpack` for `apps/admin`.
- DEFERRED: direct Keycloak runtime preview in local Docker. Docker is not available in this local environment.
