/**
 * Admin permission human labels, categories, and role templates.
 *
 * This module is UI-only. It does NOT change the authorization model.
 * Permission codes remain the source of truth; these labels are purely
 * for display in the Admin operator UX.
 *
 * Categories and labels are derived from the locked architecture
 * permission vocabulary (see `apps/api/src/*\/ *-permissions.ts`).
 */

// ---------------------------------------------------------------------------
// Permission code → Bahasa Indonesia display label
// ---------------------------------------------------------------------------

export const PERMISSION_LABELS: Record<string, string> = {
  // authorization (TASK-004, TASK-009AI)
  'authorization.role.read': 'Lihat Role',
  'authorization.role.manage': 'Kelola Role',
  'authorization.permission.read': 'Lihat Permission',
  'authorization.permission.manage': 'Kelola Permission',
  'authorization.assignment.read': 'Lihat Penugasan Role',
  'authorization.assignment.manage': 'Kelola Penugasan Role',
  'authorization.effective_permission.read': 'Lihat Permission Efektif',

  // user account + Keycloak provisioning (TASK-002, TASK-009AN)
  'user_account.read': 'Lihat Akun Pengguna',
  'user_account.manage': 'Kelola Akun Pengguna',

  // attendance (TASK-030, TASK-031)
  'attendance.record.read': 'Lihat Data Kehadiran',
  'attendance.record.manage': 'Kelola Absensi Peserta',
  'attendance.correction.read': 'Lihat Riwayat Koreksi Absensi',
  'attendance.correction.manage': 'Kelola Koreksi Absensi',
  'attendance.summary.read': 'Lihat Ringkasan Kehadiran',
  'attendance.summary.refresh': 'Perbarui Ringkasan Kehadiran',

  // question bank (TASK-041)
  'question.type.read': 'Lihat Jenis Soal',
  'question.type.manage': 'Kelola Jenis Soal',
  'question.bank.read': 'Lihat Bank Soal',
  'question.bank.manage': 'Kelola Bank Soal',
  'question.read': 'Lihat Soal & Kunci Jawaban',
  'question.manage': 'Kelola Soal',
  'question.participate': 'Lihat Soal (Tampilan Peserta)',

  // assessment (TASK-040)
  'assessment.type.read': 'Lihat Tipe Assessment',
  'assessment.type.manage': 'Kelola Tipe Assessment',
  'assessment.read': 'Lihat Assessment & Penilaian',
  'assessment.manage': 'Kelola Assessment & Penilaian',

  // exam (TASK-042)
  'exam.read': 'Lihat Ujian',
  'exam.manage': 'Kelola Ujian',
  'exam.validate': 'Validasi Ujian',

  // grading (TASK-046, TASK-050, TASK-051)
  'exam.grade.manage': 'Kelola Nilai Ujian',
  'grading.scheme.read': 'Lihat Skema Penilaian',
  'grading.scheme.manage': 'Kelola Skema Penilaian',
  'grading.final_grade.manage': 'Kelola Nilai Akhir',

  // certificate (TASK-054, TASK-055)
  'certificate.template.read': 'Lihat Template Sertifikat',
  'certificate.template.manage': 'Kelola Template Sertifikat',
  'certificate.read': 'Lihat Sertifikat',
  'certificate.issue': 'Terbitkan Sertifikat',
  'certificate.revoke': 'Cabut Sertifikat',

  // graduation (TASK-052)
  'graduation.rule.read': 'Lihat Aturan Kelulusan',
  'graduation.rule.manage': 'Kelola Aturan Kelulusan',
  'graduation.evaluation.read': 'Lihat Evaluasi Kelulusan',
  'graduation.evaluation.run': 'Jalankan Evaluasi Kelulusan',

  // graduation decision (TASK-053)
  'graduation.decision.read': 'Lihat Keputusan Kelulusan',
  'graduation.decision.record': 'Catat Keputusan Kelulusan',
  'graduation.decision.approve': 'Setujui Keputusan Kelulusan',
  'graduation.decision.revoke': 'Cabut Keputusan Kelulusan',

  // audit (TASK-006)
  'audit.log.read': 'Lihat Jejak Audit',

  // reporting (TASK-060, TASK-061)
  'reporting.metric.read': 'Lihat Metrik Pelaporan',
  'reporting.metric.refresh': 'Perbarui Metrik Pelaporan',
  'reporting.executive.read': 'Lihat Laporan Eksekutif',
};

// ---------------------------------------------------------------------------
// Domain prefix → category label (Bahasa Indonesia)
// ---------------------------------------------------------------------------

export const PERMISSION_CATEGORIES: Record<string, string> = {
  authorization: 'Akses & Otorisasi',
  attendance: 'Kehadiran',
  question: 'Bank Soal',
  assessment: 'Assessment & Penilaian',
  exam: 'Ujian',
  grading: 'Nilai',
  certificate: 'Sertifikat',
  graduation: 'Kelulusan',
  audit: 'Audit Sistem',
  reporting: 'Pelaporan',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the human-readable label for a permission code, or the code itself as fallback. */
export function humanLabel(code: string): string {
  return PERMISSION_LABELS[code] ?? code;
}

/** Return the category label for a permission code (derived from the first segment). */
export function categoryForPermission(code: string): string {
  const prefix = code.split('.')[0] ?? '';
  return PERMISSION_CATEGORIES[prefix] ?? (prefix || 'Lainnya');
}

/** Group an array of permission codes by their category label. */
export function groupPermissionsByCategory(
  codes: string[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const code of codes) {
    const cat = categoryForPermission(code);
    const list = map.get(cat);
    if (list) {
      list.push(code);
    } else {
      map.set(cat, [code]);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Role templates — recommended permission sets for common roles
// ---------------------------------------------------------------------------

export type RoleTemplate = {
  id: string;
  name: string;
  description: string;
  permissionCodes: string[];
  enabled: boolean;
  disabledReason?: string;
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'educator',
    name: 'Pengajar',
    description:
      'Akses kehadiran, bank soal, assessment, dan nilai ujian — sesuai kebutuhan pengajar di kelas.',
    permissionCodes: [
      'attendance.record.read',
      'attendance.record.manage',
      'attendance.correction.read',
      'attendance.correction.manage',
      'question.type.read',
      'question.bank.read',
      'question.bank.manage',
      'assessment.read',
      'assessment.manage',
      'exam.grade.manage',
    ],
    enabled: true,
  },
  {
    id: 'admin_pusat',
    name: 'Admin Pusat',
    description:
      'Akses penuh ke modul otorisasi: kelola role, permission, dan penugasan.',
    permissionCodes: [
      'authorization.role.read',
      'authorization.role.manage',
      'authorization.permission.read',
      'authorization.permission.manage',
      'authorization.assignment.read',
      'authorization.assignment.manage',
      'authorization.effective_permission.read',
    ],
    enabled: true,
  },
  {
    id: 'peserta',
    name: 'Peserta',
    description:
      'Template permission untuk peserta akan ditentukan setelah permission final disepakati.',
    permissionCodes: [],
    enabled: false,
    disabledReason: 'Permission final belum disepakati.',
  },
  {
    id: 'pimpinan',
    name: 'Pimpinan',
    description:
      'Template permission untuk pimpinan akan ditentukan setelah permission final disepakati.',
    permissionCodes: [],
    enabled: false,
    disabledReason: 'Permission final belum disepakati.',
  },
];
