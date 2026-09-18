# Lemdiklat LMS — Implementation Tasks v2

Patch ini **tidak mengganti source code TASK-000** dan sengaja **tidak menyertakan AGENTS.md atau MASTER-CHECKLIST.md**, agar perubahan/status aktual repository Anda tidak tertimpa.

## Cara pakai

1. Backup/commit repository saat ini.
2. Copy seluruh file di folder `tasks/` patch ini ke folder `tasks/` repository `lemdiklat-lms`, lalu replace file dengan nama yang sama. File task baru akan ditambahkan.
3. Karena TASK-001 sebelumnya ditandai BLOCKED hanya akibat placeholder, setelah file baru masuk minta Codex menyinkronkan status TASK-001 dari BLOCKED ke NOT STARTED bila tidak ada blocker teknis lain.
4. Jangan mengganti `AGENTS.md`, `MASTER-CHECKLIST.md`, source code, package config, atau hasil TASK-000.
5. Setelah itu gunakan perintah: `Baca AGENTS.md dan lanjutkan project.`

Semua task di patch ini sudah memiliki dependency, data model/persistence, API/application contract, business rules, acceptance criteria, verification, dan stop-at-REVIEW rule.
