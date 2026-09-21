'use client';

import { FormEvent, useState, useTransition } from 'react';
import type { Exam, ExamStatus } from '@lms/api-client';
import {
  FieldLabel,
  Pill,
  SubmitButton,
  inputClassName,
} from '@/components/data-state';
import {
  changeExamStatusAction,
  createExamAction,
  updateExamAction,
} from '../exam-actions';
import { SectionCard } from '@/components/educator-shell';

/**
 * Exam lifecycle, mirrored from the API's state machine.
 *
 * `VALIDATED` is the only transition with a precondition the caller cannot see
 * locally: the server re-counts the question pool for every blueprint rule and
 * refuses if any rule is short. That check is intentionally left to the API —
 * duplicating the pool query in the browser would be both slower and wrong.
 */
const ALLOWED_EXAM_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  DRAFT: ['VALIDATED'],
  VALIDATED: ['SCHEDULED', 'DRAFT'],
  SCHEDULED: ['CLOSED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

const STATUS_TONES = {
  DRAFT: 'slate',
  VALIDATED: 'blue',
  SCHEDULED: 'amber',
  CLOSED: 'green',
  ARCHIVED: 'red',
} as const;

function asExamStatus(status: string): ExamStatus {
  return (
    (Object.keys(ALLOWED_EXAM_TRANSITIONS) as ExamStatus[]).find(
      (candidate) => candidate === status,
    ) ?? 'DRAFT'
  );
}

export function ExamAuthoringPanel({ exam }: { exam: Exam | null }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function createExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await createExamAction({
        assessmentId: String(data.get('assessmentId')),
        title: String(data.get('title')),
        durationMinutes: Number(data.get('durationMinutes')),
        attemptsAllowed: data.get('attemptsAllowed')
          ? Number(data.get('attemptsAllowed'))
          : undefined,
        shuffleQuestions: data.get('shuffleQuestions') === 'on',
        shuffleOptions: data.get('shuffleOptions') === 'on',
      });
      if (result.ok) {
        setMessage('Exam berhasil dibuat.');
        form.reset();
      } else {
        setError(result.message);
      }
    });
  }

  function changeStatus(status: ExamStatus) {
    if (!exam) return;
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await changeExamStatusAction(exam.id, status);
      if (result.ok) setMessage(`Status exam diubah ke ${status}.`);
      else setError(result.message);
    });
  }

  function toggleShuffle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exam) return;
    const data = new FormData(event.currentTarget);
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await updateExamAction(exam.id, {
        shuffleQuestions: data.get('shuffleQuestions') === 'on',
        shuffleOptions: data.get('shuffleOptions') === 'on',
      });
      if (result.ok) setMessage('Konfigurasi exam diperbarui.');
      else setError(result.message);
    });
  }

  const status = exam ? asExamStatus(exam.status) : null;
  const transitions = status ? ALLOWED_EXAM_TRANSITIONS[status] : [];
  // The API rejects updates once an exam is scheduled, so the form is hidden
  // rather than offered and then refused.
  const mutable = exam !== null && ['DRAFT', 'VALIDATED'].includes(exam.status);

  return (
    <SectionCard
      id="exam-authoring"
      title="Authoring exam"
      description="Konfigurasi exam, lalu validasi kecukupan pool sebelum dijadwalkan."
    >
      {!exam ? (
        <form onSubmit={createExam} className="space-y-4">
          <FieldLabel label="Assessment ID">
            <input name="assessmentId" required className={inputClassName} />
          </FieldLabel>
          <FieldLabel label="Judul">
            <input name="title" required className={inputClassName} />
          </FieldLabel>
          <FieldLabel label="Durasi (menit)" hint="1–1440.">
            <input
              name="durationMinutes"
              type="number"
              min="1"
              max="1440"
              required
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel label="Jumlah percobaan">
            <input
              name="attemptsAllowed"
              type="number"
              min="1"
              className={inputClassName}
            />
          </FieldLabel>
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="shuffleQuestions" /> Acak soal
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="shuffleOptions" /> Acak pilihan
            </label>
          </div>
          <SubmitButton disabled={pending}>Buat exam</SubmitButton>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-100">{exam.title}</p>
              <Pill tone={status ? STATUS_TONES[status] : 'slate'}>
                {exam.status}
              </Pill>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {exam.durationMinutes} menit
              {exam.attemptsAllowed
                ? ` · maksimal ${exam.attemptsAllowed} percobaan`
                : ' · percobaan tidak dibatasi'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {exam.shuffleQuestions ? 'soal diacak' : 'soal tetap'} ·{' '}
              {exam.shuffleOptions ? 'pilihan diacak' : 'pilihan tetap'}
            </p>
            <p className="text-xs text-slate-500">
              Assessment {exam.assessmentId}
            </p>
          </div>

          {mutable ? (
            <form onSubmit={toggleShuffle} className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="shuffleQuestions"
                    defaultChecked={exam.shuffleQuestions}
                  />{' '}
                  Acak soal
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="shuffleOptions"
                    defaultChecked={exam.shuffleOptions}
                  />{' '}
                  Acak pilihan
                </label>
              </div>
              <SubmitButton disabled={pending}>Simpan konfigurasi</SubmitButton>
            </form>
          ) : (
            <p className="text-xs text-slate-500">
              Exam yang sudah dijadwalkan bersifat immutable.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {transitions.length === 0 ? (
              <p className="text-xs text-slate-500">
                Status akhir — tidak ada transisi tersedia.
              </p>
            ) : (
              transitions.map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={pending}
                  onClick={() => changeStatus(next)}
                  className="rounded-xl border border-sky-500/40 px-3 py-1.5 text-xs text-sky-100 disabled:opacity-50"
                >
                  Ubah ke {next}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {message ? (
        <p className="mt-4 text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </SectionCard>
  );
}
