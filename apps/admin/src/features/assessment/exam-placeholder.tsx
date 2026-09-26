'use client';

import { AdminPage, EmptyState, PageHeader } from '@/components/admin';

/**
 * Exam (ujian) administration placeholder.
 *
 * The backend `exams` and `exam-sessions` domains exist (TASK-042/043) but only
 * expose resource-by-id routes (`GET /exams/:id`, `PATCH /exams/:id`, etc.).
 * There is no list endpoint the admin table could page through, so building a
 * real operator workspace would require a backend change. That is out of scope
 * for a frontend pattern standardization pass, so this page reports the
 * limitation honestly instead of wiring to a non-existent route.
 *
 * When a `GET /exams` (pageable) endpoint lands in `@lms/api-client`, replace
 * this placeholder with a full workspace mirroring `AssessmentWorkspace`.
 */
export function ExamPlaceholder() {
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Ujian & Penilaian / Exam"
        title="Kelola ujian"
        description="Halaman pengelolaan ujian."
      />
      <div className="px-5 pb-5">
        <EmptyState>
          <p className="font-semibold text-slate-950">
            Pengelolaan ujian belum tersedia.
          </p>
          <p className="mt-2">
            API daftar ujian (`GET /exams`) belum tersedia untuk admin. Halaman ini akan diaktifkan setelah kontrak backend list exam tersedia.
          </p>
        </EmptyState>
      </div>
    </AdminPage>
  );
}