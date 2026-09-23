# TASK-009J — Local Admin With Production Keycloak Login

**Status:** REVIEW

## Dependency

TASK-009I = REVIEW. Admin and Keycloak login UI are available.

## Objective

Membuat Admin portal dapat dijalankan lokal tanpa Docker memakai Keycloak production dan API production untuk kebutuhan review UI.

## Mandatory References

`docs/07-security-standards.md`

## Scope

- Dukung cookie OIDC state/access token di `http://localhost:3000` tanpa menurunkan keamanan production HTTPS.
- Pastikan deploy production menambahkan callback lokal ke client Keycloak `lms-admin`.
- Pertahankan callback production untuk domain `lms-presisi` dan `admin.lms-presisi`.

## Acceptance Criteria

[x] Local Admin dapat redirect ke Keycloak production memakai `http://localhost:3000/api/auth/callback`.
[x] Cookie lokal bekerja di HTTP localhost.
[x] Cookie production tetap `secure` di HTTPS.
[x] Keycloak client `lms-admin` menyimpan redirect URI dan web origin lokal.
[x] checks green.

## Verification

- PASS: workflow YAML parse.
- PASS: Prettier for edited route, workflow, and task files.
- PASS: targeted ESLint for edited Admin auth route files.
- PASS: `next typegen`.
- PASS: `tsc --noEmit` for `apps/admin`.
- PASS: `next build --webpack` for `apps/admin`.
- PASS: `git diff --check`.
- PENDING PRODUCTION APPLY: deploy workflow must run once to write the new Keycloak client redirect/web origin configuration to production.
