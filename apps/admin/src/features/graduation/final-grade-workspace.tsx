'use client';

import type { FinalGrade } from '@lms/api-client';
import {
  AdminPage,
  EmptyState,
  EnterpriseTable,
  ErrorState,
  PageHeader,
  StatusBadge,
  StickyActionCell,
} from '@/components/admin';
import { finalGradeStatusLabel, finalGradeStatusTone } from './graduation-labels';

type Result = {
  data: FinalGrade[] | null;
  error: string | null;
};

/**
 * Nilai Akhir (TASK-051).
 *
 * The backend has no list endpoint for final grades — a grade is produced on
 * demand via `calculate`/`recalculate` and read back by id. The Admin surface
 * therefore presents an operator-friendly empty state explaining that final
 * grades are calculated from the Grading workspace, not listed here. This keeps
 * the surface honest rather than inventing a fake list or a fake mutation.
 */
export function FinalGradeWorkspace({ result }: { result: Result }) {
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Kelulusan & Sertifikat / Nilai Akhir"
        title="Nilai akhir peserta"
        description="Nilai akhir dihitung otomatis dari komponen penilaian yang sudah diberi bobot di skema grading, lalu disetujui sebagai catatan akademik resmi."
      />

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : result.data === null ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Nilai akhir belum tersedia untuk ditampilkan.
            </p>
            <p className="mt-2 max-w-xl">
              API belum menyediakan endpoint daftar nilai akhir. Nilai akhir dihasilkan
              dari kalkulasi per peserta melalui fitur Grading, lalu dibuka oleh ID khusus.
            </p>
            <p className="mt-2 text-slate-400">
              Gunakan halaman Grading untuk menghitung dan menyetujui nilai akhir peserta.
            </p>
            <a
              href="/grading"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Buka halaman Grading
            </a>
          </EmptyState>
        ) : result.data.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Tidak ada nilai akhir yang tersedia.
            </p>
            <p className="mt-2">
              Hitung nilai akhir terlebih dahulu dari halaman Grading.
            </p>
          </EmptyState>
        ) : (
          <FinalGradeTable rows={result.data} />
        )}
      </div>
    </AdminPage>
  );
}

function FinalGradeTable({ rows }: { rows: FinalGrade[] }) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Peserta' },
        { label: 'Class subject' },
        { label: 'Nilai' },
        { label: 'Kode' },
        { label: 'Status' },
        { label: 'Dihitung pada' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={['1fr', '1fr', '6rem', '6rem', '8rem', '9rem', '6rem']}
      mobile={rows.map((grade) => (
        <div key={grade.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-950">{grade.enrollmentId}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {grade.classSubjectId}
              </p>
            </div>
            <StatusBadge tone={finalGradeStatusTone(grade.status)}>
              {finalGradeStatusLabel(grade.status)}
            </StatusBadge>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-950">
              {grade.numericScore}
            </span>
            {grade.gradeCode ? (
              <span className="text-slate-500">({grade.gradeCode})</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatDate(grade.calculatedAt)}</p>
        </div>
      ))}
    >
      {rows.map((grade) => (
        <tr key={grade.id} className="group hover:bg-slate-50 transition-colors">
          <td className="px-4 py-3">
            <p className="font-mono text-xs text-slate-600">{grade.enrollmentId}</p>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600">
            {grade.classSubjectId}
          </td>
          <td className="px-4 py-3 font-semibold text-slate-950">
            {grade.numericScore}
          </td>
          <td className="px-4 py-3 text-sm text-slate-600">
            {grade.gradeCode ?? '—'}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={finalGradeStatusTone(grade.status)}>
              {finalGradeStatusLabel(grade.status)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm text-slate-500">
            {formatDate(grade.calculatedAt)}
          </td>
          <StickyActionCell>
            <span className="text-xs text-slate-400">Detail</span>
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}