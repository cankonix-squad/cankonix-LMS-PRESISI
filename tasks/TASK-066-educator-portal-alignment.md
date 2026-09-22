# TASK-066 — Educator Portal Alignment

## Status

`REVIEW`

## Goal

Menyelaraskan shell dan bahasa visual Educator Portal dengan Admin Portal agar seluruh LMS terasa sebagai satu produk, tanpa mengubah scope bisnis Educator atau pekerjaan Admin yang sedang berjalan.

## Scope

- Menyelaraskan layout desktop dan mobile dengan pola Admin Portal.
- Menambahkan sidebar Educator yang dapat diciutkan pada desktop.
- Mempertahankan navigasi khusus Educator: kelas, pertemuan, aktivitas, tugas, exam, kehadiran, dan pemantauan.
- Menyelaraskan palette, border, radius, typography, header, card, dan state surface dengan bahasa visual Admin.
- Mempertahankan login/logout SSO Educator.
- Menjaga halaman tetap memakai API client dan server-side token flow yang sudah ada.

## Out of scope

- Perubahan Admin Portal.
- Perubahan API, database, Prisma schema, permission, atau scope.
- Perubahan business logic pembelajaran, ujian, attendance, atau grading.
- Ekstraksi komponen shared ke `packages/ui` sebelum pola visual disepakati dengan developer Admin.

## References

- `AGENTS.md`
- `docs/08-frontend-architecture.md`
- `docs/11-coding-standards.md`
- `docs/12-development-workflow.md`
- `tasks/TASK-025-educator-learning-ui.md`
- `tasks/TASK-032-attendance-ui.md`
- `tasks/TASK-047-educator-exam-ui.md`
- `apps/admin/src/components/admin-shell.tsx`
- `apps/admin/src/components/admin-sidebar-nav.tsx`
- `apps/admin/src/components/admin-design-system.tsx`

## Acceptance checklist

- [x] Educator desktop shell memiliki sidebar gelap, header putih, dan content surface yang konsisten dengan Admin.
- [x] Sidebar dapat diciutkan dan navigasi aktif terlihat jelas.
- [x] Navigasi mobile tetap dapat digunakan tanpa horizontal overflow yang merusak layout.
- [x] Navigasi Educator hanya menampilkan area yang relevan bagi pengajar.
- [x] Login/logout tetap tersedia.
- [x] Tidak ada perubahan pada API contract atau business logic.
- [ ] `pnpm --filter @lms/educator build` berhasil.
- [x] `pnpm lint` dan `pnpm typecheck` berhasil.
- [x] Hasil siap dipindahkan ke `REVIEW`; task tidak ditandai `DONE` oleh Codex.

## Verification

- `pnpm --filter @lms/educator lint` — PASS.
- `pnpm --filter @lms/educator typecheck` — PASS.
- `pnpm --filter @lms/educator... build` — package `@lms/ui`, `@lms/types`, dan `@lms/api-client` berhasil dibuild; Next.js Educator gagal di sandbox lokal dengan Turbopack `Operation not permitted` saat membuat child process/port untuk PostCSS. Ini dicatat sebagai verifikasi build DEFERRED dan bukan error TypeScript dari perubahan shell.
- `git diff --check` — PASS.

Task menunggu review visual dan persetujuan developer sebelum dipindahkan ke `DONE`.

## Planned files

- `apps/educator/src/components/educator-shell.tsx`
- `tasks/TASK-066-educator-portal-alignment.md`
- `tasks/MASTER-CHECKLIST.md`
