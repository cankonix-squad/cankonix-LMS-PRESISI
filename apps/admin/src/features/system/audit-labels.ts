// ---------------------------------------------------------------------------
// Audit & System display helpers (Bahasa Indonesia, natural)
// ---------------------------------------------------------------------------

/** Splits a `<resource>.<event>` action into a readable phrase. */
export function actionLabel(action: string): string {
  if (!action) return '—';
  const parts = action.split('.');
  const resource = parts[0] ?? '';
  const event = parts[1] ?? '';
  const resourceLabel = resourceLabelFor(resource);
  const eventWord = eventLabelFor(event || action);
  return `${resourceLabel} · ${eventWord}`;
}

function resourceLabelFor(resource: string): string {
  const map: Record<string, string> = {
    organization: 'Organisasi',
    education_program: 'Program',
    education_batch: 'Angkatan',
    academic_class: 'Kelas',
    class_subject: 'Mata Pelajaran',
    enrollment: 'Enrollment',
    educator_type: 'Tipe Pengajar',
    educator_assignment: 'Penugasan Pengajar',
    class_staff_assignment: 'Staff Kelas',
    academic_schedule: 'Jadwal Akademik',
    learning_meeting: 'Pertemuan',
    learning_activity_type: 'Tipe Aktivitas',
    learning_activity: 'Aktivitas',
    learning_content: 'Konten Pembelajaran',
    learning_progress: 'Progress Pembelajaran',
    assessment_type: 'Tipe Penilaian',
    assessment: 'Penilaian',
    question_bank: 'Bank Soal',
    exam: 'Ujian',
    grading: 'Penilaian',
    final_grade: 'Nilai Akhir',
    graduation_rule: 'Aturan Kelulusan',
    graduation_evaluation: 'Evaluasi Kelulusan',
    graduation_decision: 'Keputusan Kelulusan',
    certificate_template: 'Template Sertifikat',
    certificate: 'Sertifikat',
    reporting: 'Reporting',
    assignment: 'Tugas',
    assignment_submission: 'Pengumpulan Tugas',
    attendance_session: 'Sesi Kehadiran',
    attendance_record: 'Catatan Kehadiran',
    attendance_correction: 'Koreksi Kehadiran',
    attendance_summary: 'Rekap Kehadiran',
    stored_file: 'File',
    subject: 'Mata Pelajaran',
    curriculum: 'Kurikulum',
    person: 'Personel',
    person_placement: 'Penempatan Personel',
    user_account: 'Akun Pengguna',
    role: 'Role',
    permission: 'Permission',
    role_permission: 'Permission Role',
    role_assignment: 'Penugasan Role',
    role_assignment_scope: 'Scope Penugasan',
  };
  return map[resource] ?? humanize(resource);
}

function eventLabelFor(event: string): string {
  const map: Record<string, string> = {
    created: 'Dibuat',
    updated: 'Diperbarui',
    deleted: 'Dihapus',
    archived: 'Diarsipkan',
    deactivated: 'Dinonaktifkan',
    status_changed: 'Status diubah',
    published: 'Dipublikasikan',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    revoked: 'Dicabut',
    reopened: 'Dibuka kembali',
    submitted: 'Dikirim',
    completed: 'Diselesaikan',
    granted: 'Diberikan',
    revoked_permission: 'Dicabut',
    assigned: 'Ditugaskan',
    ended: 'Diakhiri',
    cancelled: 'Dibatalkan',
    reordered: 'Diurutkan ulang',
    refreshed: 'Di-refresh',
    issued: 'Diterbitkan',
    uploaded: 'Diunggah',
    downloaded: 'Diunduh',
    initiated: 'Dimulai',
    class_transferred: 'Pindah kelas',
    file_attached: 'File dilampirkan',
    file_detached: 'File dilepaskan',
    graded: 'Dinilai',
    grade_returned: 'Nilai dikembalikan',
    grade_approved: 'Nilai disetujui',
    grade_rejected: 'Nilai ditolak',
    grade_returned_to_educator: 'Nilai dikembalikan',
    upload_initiated: 'Unggah dimulai',
    upload_completed: 'Unggah selesai',
    download_url_issued: 'URL unduh diterbitkan',
    bulk_recorded: 'Dicatat massal',
    recorded: 'Dicatat',
    run: 'Dijalankan',
    corrected: 'Dikoreksi',
  };
  return map[event] ?? humanize(event);
}

/** Converts snake_case into Title Case for unknown tokens. */
function humanize(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function actorLabel(actorUserAccountId: string | null): string {
  if (!actorUserAccountId) return 'Sistem';
  return `${actorUserAccountId.slice(0, 8)}…`;
}

export function resourceTypeTone(
  resourceType: string,
): 'slate' | 'green' | 'red' | 'blue' | 'amber' {
  const family = resourceType.split('_')[0] ?? resourceType;
  const map: Record<string, 'slate' | 'green' | 'red' | 'blue' | 'amber'> = {
    organization: 'blue',
    person: 'blue',
    user: 'blue',
    role: 'blue',
    permission: 'blue',
    enrollment: 'amber',
    educator: 'amber',
    class: 'amber',
    academic: 'green',
    learning: 'green',
    curriculum: 'green',
    subject: 'green',
    assessment: 'red',
    exam: 'red',
    grading: 'red',
    question: 'red',
    final: 'red',
    graduation: 'slate',
    certificate: 'slate',
    reporting: 'green',
    assignment: 'amber',
    attendance: 'blue',
    stored: 'slate',
  };
  return map[family] ?? 'slate';
}

/** Formats a date-time string into an Indonesian date. */
export function formatAuditDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * Renders an unknown JSON snapshot as a compact, single-line, safe summary.
 * The payload is already redacted server-side; this only avoids raw dumps and
 * never renders secret-shaped keys verbatim.
 */
export function snapshotSummary(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.slice(0, 80);
  const serialized = JSON.stringify(value);
  if (!serialized) return '—';
  return serialized.length > 80 ? `${serialized.slice(0, 80)}…` : serialized;
}
