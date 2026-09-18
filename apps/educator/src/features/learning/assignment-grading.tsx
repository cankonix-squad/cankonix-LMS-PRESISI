'use client';

import { useState, useTransition } from 'react';
import type {
  Assignment,
  AssignmentLifecycleStatus,
  AssignmentSubmission,
  AssignmentSubmissionStatus,
  GradeSubmissionInput,
} from '@lms/api-client';
import {
  EmptyState,
  FieldLabel,
  Pill,
  SubmitButton,
  formatDateTime,
  inputClassName,
  textareaClassName,
} from '@/components/data-state';

const lifecycleTones: Record<
  AssignmentLifecycleStatus,
  'slate' | 'green' | 'red' | 'blue' | 'amber'
> = {
  DRAFT: 'slate',
  PUBLISHED: 'green',
  CLOSED: 'amber',
  ARCHIVED: 'red',
};

const submissionTones: Record<
  AssignmentSubmissionStatus,
  'slate' | 'green' | 'red' | 'blue' | 'amber'
> = {
  DRAFT: 'slate',
  SUBMITTED: 'blue',
  GRADED: 'green',
  RETURNED: 'amber',
};

export type GradeAction = (
  submissionId: string,
  input: GradeSubmissionInput,
) => Promise<void>;
export type ReturnAction = (submissionId: string) => Promise<void>;

export function AssignmentList({
  assignments,
  submissionsByAssignment,
  now,
  onGrade,
  onReturn,
}: {
  assignments: Assignment[];
  submissionsByAssignment: Record<string, AssignmentSubmission[]>;
  /** Server timestamp (ms). Passed in so render stays pure. */
  now: number;
  onGrade: GradeAction;
  onReturn: ReturnAction;
}) {
  if (assignments.length === 0) {
    return <EmptyState>Belum ada tugas pada cakupan ini.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-4">
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          submissions={submissionsByAssignment[assignment.id] ?? []}
          now={now}
          onGrade={onGrade}
          onReturn={onReturn}
        />
      ))}
    </div>
  );
}

function AssignmentCard({
  assignment,
  submissions,
  now,
  onGrade,
  onReturn,
}: {
  assignment: Assignment;
  submissions: AssignmentSubmission[];
  now: number;
  onGrade: GradeAction;
  onReturn: ReturnAction;
}) {
  const dueAt = assignment.dueAt ? new Date(assignment.dueAt) : null;
  const overdue = dueAt !== null && dueAt.getTime() < now;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {assignment.title}
          </h3>
          {assignment.instructions ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              {assignment.instructions}
            </p>
          ) : null}
        </div>
        <Pill tone={lifecycleTones[assignment.status]}>
          {assignment.status}
        </Pill>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Tenggat</dt>
          <dd className={overdue ? 'text-amber-300' : 'text-slate-300'}>
            {formatDateTime(assignment.dueAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Skor maksimum</dt>
          <dd className="text-slate-300">{assignment.maxScore}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Batas percobaan</dt>
          <dd className="text-slate-300">{assignment.attemptsAllowed}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Attempt masuk</dt>
          <dd className="text-slate-300">{submissions.length}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-slate-800 pt-3">
        {submissions.length === 0 ? (
          <EmptyState>Belum ada attempt yang masuk untuk tugas ini.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {submissions.map((submission) => (
              <SubmissionRow
                key={submission.id}
                assignment={assignment}
                submission={submission}
                onGrade={onGrade}
                onReturn={onReturn}
              />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function SubmissionRow({
  assignment,
  submission,
  onGrade,
  onReturn,
}: {
  assignment: Assignment;
  submission: AssignmentSubmission;
  onGrade: GradeAction;
  onReturn: ReturnAction;
}) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(
    submission.grade ? String(submission.grade.score) : '',
  );
  const [feedback, setFeedback] = useState(submission.grade?.feedback ?? '');
  const [returnToParticipant, setReturnToParticipant] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const graded = submission.grade !== undefined;
  const frozen =
    submission.status === 'GRADED' || submission.status === 'RETURNED';

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(score);
    if (!Number.isFinite(parsed)) {
      setMessage('Skor harus berupa angka.');
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        await onGrade(submission.id, {
          score: parsed,
          feedback: feedback.trim() || undefined,
          returnToParticipant,
        });
        setMessage('Nilai tersimpan.');
        setOpen(false);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'Gagal menyimpan nilai.',
        );
      }
    });
  }

  function release() {
    setMessage(null);
    startTransition(async () => {
      try {
        await onReturn(submission.id);
        setMessage('Nilai dirilis ke peserta.');
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'Gagal merilis nilai.',
        );
      }
    });
  }

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
          <Pill tone={submissionTones[submission.status]}>
            {submission.status}
          </Pill>
          <span>Attempt #{submission.attemptNo}</span>
          <span className="text-xs text-slate-500">
            dikirim {formatDateTime(submission.submittedAt)}
          </span>
          {submission.isLate ? <Pill tone="amber">terlambat</Pill> : null}
        </div>

        <div className="flex items-center gap-3">
          {graded ? (
            <span className="text-sm text-slate-300">
              Nilai: <strong>{submission.grade?.score}</strong> /{' '}
              {assignment.maxScore}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-400"
          >
            {open ? 'Tutup' : graded ? 'Nilai ulang' : 'Beri nilai'}
          </button>
        </div>
      </div>

      {submission.textAnswer ? (
        <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-300">
          {submission.textAnswer}
        </p>
      ) : null}

      {submission.files.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {submission.files.map((file) => (
            <li
              key={file.id}
              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300"
            >
              {file.label ?? file.originalName ?? 'Lampiran'}
              {file.sizeBytes !== null ? ` · ${file.sizeBytes} B` : ''}
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
          <FieldLabel
            label={`Skor (0–${assignment.maxScore})`}
            hint="Batas atas divalidasi server terhadap skor maksimum tugas."
          >
            <input
              type="number"
              min={0}
              max={assignment.maxScore}
              step="0.01"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              className={inputClassName}
            />
          </FieldLabel>

          <FieldLabel label="Umpan balik">
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              className={textareaClassName}
            />
          </FieldLabel>

          <label className="flex items-start gap-2 text-sm text-slate-300 sm:col-span-2">
            <input
              type="checkbox"
              checked={returnToParticipant}
              onChange={(event) => setReturnToParticipant(event.target.checked)}
              className="mt-1"
            />
            <span>
              Rilis langsung ke peserta
              <span className="mt-1 block text-xs text-slate-500">
                Rilis melewati status GRADED sebelum RETURNED, sesuai lifecycle
                submission.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <SubmitButton disabled={pending}>
              {pending ? 'Menyimpan…' : 'Simpan nilai'}
            </SubmitButton>
            {graded && submission.status === 'GRADED' ? (
              <button
                type="button"
                onClick={release}
                disabled={pending}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400 disabled:opacity-50"
              >
                Rilis nilai
              </button>
            ) : null}
            {frozen ? (
              <p className="text-xs text-slate-500">
                Lampiran terkunci setelah penilaian.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs text-slate-400">{message}</p>
      ) : null}
    </li>
  );
}
