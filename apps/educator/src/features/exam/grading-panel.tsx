'use client';

import { FormEvent, useState, useTransition } from 'react';
import {
  FieldLabel,
  SubmitButton,
  inputClassName,
  textareaClassName,
} from '@/components/data-state';
import { autoGradeAction, manualGradeAction } from '../exam-actions';
import { SectionCard } from '@/components/educator-shell';

/**
 * Exam grading actions.
 *
 * Scoring is entirely server-side: the objective rules live on the frozen
 * question version and the manual score is bounded by that version's points, so
 * this panel only submits intent. It deliberately does not pre-validate a score
 * against a ceiling it would have to fetch — the API answers with the real
 * bound and the message is shown unchanged.
 *
 * NOTE: the API currently exposes grading *actions* but no attempt/queue read
 * endpoint, so an attempt is addressed by its identifier. When the queue read
 * lands this panel can be fed from it without changing these actions.
 */
export function GradingPanel() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function autoGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await autoGradeAction(String(data.get('attemptId')));
      if (result.ok) {
        setMessage('Penilaian objektif dijalankan.');
        form.reset();
      } else {
        setError(result.message);
      }
    });
  }

  function manualGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await manualGradeAction(String(data.get('answerId')), {
        score: Number(data.get('score')),
        feedback: String(data.get('feedback') || '') || undefined,
        graderPersonId: String(data.get('graderPersonId')),
      });
      if (result.ok) {
        setMessage('Nilai manual tersimpan.');
        form.reset();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <SectionCard
      id="exam-grading"
      title="Penilaian"
      description="Penilaian objektif dihitung server dari kunci jawaban; nilai esai dibatasi poin versi soal."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={autoGrade} className="space-y-4">
          <h3 className="text-sm font-medium text-slate-200">
            Penilaian objektif
          </h3>
          <FieldLabel label="Attempt ID">
            <input name="attemptId" required className={inputClassName} />
          </FieldLabel>
          <SubmitButton disabled={pending}>Jalankan auto-grade</SubmitButton>
        </form>

        <form onSubmit={manualGrade} className="space-y-4">
          <h3 className="text-sm font-medium text-slate-200">Nilai manual</h3>
          <FieldLabel label="Answer ID">
            <input name="answerId" required className={inputClassName} />
          </FieldLabel>
          <FieldLabel label="Skor">
            <input
              name="score"
              type="number"
              min="0"
              step="0.01"
              required
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel label="Grader person ID">
            <input name="graderPersonId" required className={inputClassName} />
          </FieldLabel>
          <FieldLabel label="Umpan balik">
            <textarea name="feedback" className={textareaClassName} />
          </FieldLabel>
          <SubmitButton disabled={pending}>Simpan nilai</SubmitButton>
        </form>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </SectionCard>
  );
}
