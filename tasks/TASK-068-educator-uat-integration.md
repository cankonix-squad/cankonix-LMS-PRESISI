# TASK-068 — Educator UAT & Integration Verification

## Status

`REVIEW`

## Dependency

TASK-025 = DONE-WITH-DEFERRED, TASK-047 = DONE, TASK-066 = DONE.

## Objective

Memverifikasi alur Educator dari login SSO sampai konsumsi data yang dikelola melalui Admin dan API, menggunakan environment production tanpa mengubah business logic atau schema.

## Scope

- Verifikasi route Educator production dan status responsnya.
- Verifikasi redirect login/logout SSO Educator.
- Verifikasi dashboard dan halaman kelas pengajaran.
- Verifikasi pertemuan, aktivitas, tugas, kehadiran, exam, dan pemantauan.
- Verifikasi API client Educator memakai endpoint `/api/v1` yang sama dengan backend production.
- Catat temuan fungsional atau kontrak yang perlu menjadi task perbaikan terpisah.

## Out of scope

- Perubahan Admin Portal.
- Perubahan API, database, Prisma schema, permission, atau scope.
- Pembuatan data production tanpa persetujuan operator.
- Perubahan deployment architecture.

## Mandatory References

`AGENTS.md`, `tasks/MASTER-CHECKLIST.md`, `docs/08-frontend-architecture.md`, `docs/11-coding-standards.md`, `docs/12-development-workflow.md`, `tasks/TASK-025-educator-learning-ui.md`, `tasks/TASK-032-attendance-ui.md`, `tasks/TASK-047-educator-exam-ui.md`, `tasks/TASK-066-educator-portal-alignment.md`

## Acceptance checklist

- [x] Educator production URL merespons tanpa error gateway.
- [x] Route login mengarah ke Keycloak dan route logout tersedia.
- [x] Semua route Educator utama dapat dirender atau mengarah ke alur autentikasi yang benar.
- [x] API health production merespons `{"status":"ok"}`.
- [x] Tidak ada perubahan kontrak atau data production selama verifikasi.
- [x] Temuan UAT dicatat dengan bukti dan task perbaikan dipisahkan bila diperlukan.
- [x] Setelah verifikasi selesai, task dipindahkan ke `REVIEW`; Codex tidak menandai `DONE`.

## Verification plan

1. Jalankan HTTP smoke test untuk domain Educator, route utama, login/logout, dan API health.
2. Gunakan browser/session pengajar untuk memeriksa redirect SSO dan halaman setelah login.
3. Catat hasil per route dan per alur data Admin → API → Educator.
4. Jalankan lint/typecheck/build hanya bila ada perubahan kode selama UAT.

## Verification Result

- Route `/`, `/kelas`, `/pertemuan`, `/aktivitas`, `/tugas`, `/kehadiran`, `/exam`, dan `/pemantauan` di production merespons HTTP `200`.
- `GET /api/auth/login` merespons HTTP `307` ke Keycloak realm `lemdiklat` dengan client `lms-educator`.
- `GET /api/auth/logout` awalnya mengarah ke `https://0.0.0.0:3001/`; route diperbaiki agar memakai forwarded public host dan setelah deployment merespons HTTP `307` ke `https://educator.lms-presisi.digitallearningcenter.id/`.
- `GET https://api.lms-presisi.digitallearningcenter.id/api/v1/health` merespons `{"status":"ok"}`.
- Deployment commit `03f25f1`, workflow run `35731713819` — SUCCESS.
- Local verification untuk perubahan logout: `git diff --check`, Prettier, ESLint route, Next route type generation, dan TypeScript Educator — PASS.
- Tidak ada data production yang dibuat atau diubah selama verifikasi.
