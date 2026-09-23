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

## UI follow-up — LMS PRESISI landing page (2026-09-23)

The local Admin `/login` route now presents an enterprise landing page rather than a login panel. It uses the local login imagery, transparent hero navigation, responsive mobile menu, hero CTA to `/api/auth/login`, KPI strip, platform overview, role cards, feature grid, news cards, and navy footer. Authentication remains entirely in the existing Keycloak/OIDC flow; no username/password form was added to the Admin app.

## Verification

- PASS: workflow YAML parse.
- PASS: Prettier for edited route, workflow, and task files.
- PASS: targeted ESLint for edited Admin auth route files.
- PASS: `next typegen`.
- PASS: `tsc --noEmit` for `apps/admin`.
- PASS: `next build --webpack` for `apps/admin`.
- PASS: Prettier, `pnpm --filter @lms/admin lint`, `next typegen`, `tsc --noEmit`, and `next build --webpack` after the landing-page implementation.
- PASS: `git diff --check`.
- PENDING PRODUCTION APPLY: deploy workflow must run once to write the new Keycloak client redirect/web origin configuration to production.
