# TASK-009H — Admin Login Fullscreen Hero

**Status:** REVIEW

## Dependency

TASK-009G = REVIEW. Admin login route and Keycloak SSO entrypoint are available.

## Objective

Menyederhanakan halaman `/login` Admin menjadi fullscreen hero berbasis aset LMS PRESISI, tanpa panel putih kanan, dan mempertahankan tombol masuk yang mengarah ke flow Keycloak/OIDC existing.

## Mandatory References

`docs/07-security-standards.md`

## Scope

- Jadikan gambar `login-hero-v3.png` memenuhi viewport.
- Hilangkan panel putih "Selamat datang" dari halaman `/login`.
- Sediakan satu tombol masuk yang tetap menuju `/api/auth/login`.
- Pertahankan pemrosesan username/password di Keycloak.

## Acceptance Criteria

[x] `/login` menampilkan hero fullscreen.
[x] Tidak ada panel putih login landing di sisi kanan.
[x] Tombol masuk tetap mengarah ke `/api/auth/login`.
[x] checks green.

## Verification

- PASS: Prettier check for edited login and task files.
- PASS: targeted ESLint for edited Admin login files.
- PASS: `next typegen`.
- PASS: `tsc --noEmit` for `apps/admin`.
- PASS: `next build --webpack` for `apps/admin`.
- DEFERRED: default Turbopack build in this local sandbox. Turbopack failed before application compilation with `Operation not permitted` while binding an internal port for CSS processing. The webpack production build passed.
