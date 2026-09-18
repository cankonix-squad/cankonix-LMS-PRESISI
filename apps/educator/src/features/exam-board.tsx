'use client';

import { FormEvent, useState } from 'react';
import type { Exam, ExamSession } from '@lms/api-client';
import {
  EmptyState,
  ErrorState,
  FieldLabel,
  inputClassName,
  SubmitButton,
  formatDateTime,
} from '@/components/data-state';
import {
  changeExamStatusAction,
  createExamAction,
  createExamSessionAction,
} from './exam-actions';
import { SectionCard } from '@/components/educator-shell';

export function ExamManagementBoard({
  exam,
  session,
  error,
}: {
  exam: Exam | null;
  session: ExamSession | null;
  error: string | null;
}) {
  const [message, setMessage] = useState('');
  async function createExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createExamAction({
      assessmentId: String(form.get('assessmentId')),
      title: String(form.get('title')),
      durationMinutes: Number(form.get('durationMinutes')),
    });
    setMessage(result.ok ? 'Exam berhasil dibuat.' : result.message);
  }
  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createExamSessionAction({
      examId: String(form.get('examId')),
      startAt: String(form.get('startAt')),
      endAt: String(form.get('endAt')),
    });
    setMessage(result.ok ? 'Sesi berhasil dibuat.' : result.message);
  }
  async function publish() {
    if (!exam) return;
    const result = await changeExamStatusAction(exam.id, 'SCHEDULED');
    setMessage(result.ok ? 'Exam dijadwalkan.' : result.message);
  }
  if (error) return <ErrorState message={error} />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        id="exam-authoring"
        title="Authoring exam"
        description="Buat konfigurasi exam dan jadwal berdasarkan kontrak API."
      >
        {!exam ? (
          <form onSubmit={createExam} className="space-y-4">
            <FieldLabel label="Assessment ID">
              <input name="assessmentId" required className={inputClassName} />
            </FieldLabel>
            <FieldLabel label="Judul">
              <input name="title" required className={inputClassName} />
            </FieldLabel>
            <FieldLabel label="Durasi (menit)">
              <input
                name="durationMinutes"
                type="number"
                min="1"
                required
                className={inputClassName}
              />
            </FieldLabel>
            <SubmitButton>Buat exam</SubmitButton>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-widest text-sky-400">
                {exam.status}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{exam.title}</h3>
              <p className="text-sm text-slate-400">
                {exam.durationMinutes} menit ·{' '}
                {exam.shuffleQuestions ? 'soal diacak' : 'soal tetap'}
              </p>
            </div>
            <button
              onClick={publish}
              className="rounded-xl border border-sky-500/40 px-4 py-2 text-sm text-sky-100"
            >
              Jadwalkan exam
            </button>
          </div>
        )}
        {message ? (
          <p className="mt-4 text-sm text-emerald-300">{message}</p>
        ) : null}
      </SectionCard>
      <SectionCard
        id="exam-session"
        title="Session & peserta"
        description="Atur window sesi dan kelola peserta melalui API."
      >
        {!session ? (
          <form onSubmit={createSession} className="space-y-4">
            <FieldLabel label="Exam ID">
              <input name="examId" required className={inputClassName} />
            </FieldLabel>
            <FieldLabel label="Mulai">
              <input
                name="startAt"
                type="datetime-local"
                required
                className={inputClassName}
              />
            </FieldLabel>
            <FieldLabel label="Selesai">
              <input
                name="endAt"
                type="datetime-local"
                required
                className={inputClassName}
              />
            </FieldLabel>
            <SubmitButton>Buat sesi</SubmitButton>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              Status: <strong>{session.status}</strong>
            </p>
            <p className="text-sm text-slate-400">
              {formatDateTime(session.startAt)} —{' '}
              {formatDateTime(session.endAt)}
            </p>
            <p className="text-sm text-slate-400">
              {session.participants?.length ?? 0} peserta terdaftar
            </p>
          </div>
        )}
      </SectionCard>
      <SectionCard
        id="exam-blueprint"
        title="Blueprint & grading"
        description="Blueprint dan grading dikelola dengan endpoint backend; kunci jawaban tidak ditampilkan di UI peserta."
      >
        <EmptyState>
          {exam?.blueprint
            ? `${exam.blueprint.rules.length} aturan blueprint tersimpan.`
            : 'Blueprint belum tersedia. Tambahkan rule dari integrasi API.'}
        </EmptyState>
      </SectionCard>
    </div>
  );
}
