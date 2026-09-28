# TASK-009AL — Admin Permission Human Labels & Role Template UX

**Status:** REVIEW
**Dependencies:** TASK-009AH = REVIEW, TASK-009AI = REVIEW
**Type:** Frontend UX enhancement (admin only)
**Scope:** `apps/admin`

## Problem
Halaman `/roles` menampilkan permission sebagai kode teknis (`attendance.record.read`, `question.bank.manage`, dll) yang tidak ramah operator.

## Objectives
1. Permission label Bahasa Indonesia sebagai tampilan utama.
2. Group permission berdasarkan domain/kategori.
3. Role template/rekomendasi permission untuk role umum (Pengajar, Admin Pusat).
4. Kode permission tetap terlihat sebagai secondary technical detail.
5. Tidak mengubah backend authorization model; permission code tetap source of truth.

## Implementation

### 1. `apps/admin/src/lib/admin-permission-labels.ts` (NEW)
- `PERMISSION_LABELS`: Record mapping every known permission code → Bahasa Indonesia label
- `PERMISSION_CATEGORIES`: Record mapping domain prefix → category label
- `categoryForPermission(code)`: returns category label from code prefix
- `ROLE_TEMPLATES`: Template definitions:
  - `educator` (PENGAJAR): attendance.* + question.* + assessment.* + exam.grade.manage
  - `admin_pusat` (ADMIN_PUSAT): authorization.*
  - `peserta`: disabled (coming soon)
  - `pimpinan`: disabled (coming soon)

### 2. `apps/admin/src/features/foundation/role-permission-management.tsx` (MODIFY)
- `PermissionTable`: ganti `permission.code` jadi label manusia sebagai utama, kode sebagai secondary kecil monospace. Badge kategori pakai label kategori.
- `RoleDetailDrawer` section "Permission melekat": label manusia utama, kode secondary.
- `RoleDetailDrawer` section "Tambah permission": grouped by category, label manusia, kode secondary.
- Tambah section "Template role" di drawer detail dengan tombol template yang auto-attach permission via grantPermissionAction beruntun.

### 3. `apps/admin/src/features/foundation/actions.ts` (MODIFY)
- Add `applyTemplateAction` server action: menerima roleId + templateId, iterasi grant semua permission template ke role.

## Files Changed
- `apps/admin/src/lib/admin-permission-labels.ts` (NEW)
- `apps/admin/src/features/foundation/role-permission-management.tsx` (MODIFY)
- `apps/admin/src/features/foundation/actions.ts` (MODIFY)
- `tasks/TASK-009AL-admin-permission-human-labels-role-template-ux.md` (NEW)
- `tasks/MASTER-CHECKLIST.md` (MODIFY)

## Acceptance Criteria
- `/roles` tidak lagi menampilkan daftar permission sebagai kode teknis utama.
- Operator melihat label Bahasa Indonesia.
- Permission bisa dicari berdasarkan label atau kode.
- Permission dikelompokkan per kategori di drawer attach.
- Role template Pengajar tersedia sebagai rekomendasi permission.
- Kode permission tetap terlihat sebagai secondary technical detail.
- Tidak ada perubahan backend/auth/guard.

## Verification
- `pnpm turbo run lint typecheck build --filter=@lms/admin...`
- `git diff --check`