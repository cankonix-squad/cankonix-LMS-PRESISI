'use client';

import { FormEvent, useState, useTransition } from 'react';
import type {
  ExamParticipant,
  ExamSession,
  SessionStatus,
} from '@lms/api-client';
import {
  EmptyState,
  FieldLabel,
  Pill,
  SubmitButton,
  formatDateTime,
  inputClassName,
} from '@/components/data-state';
import {
  addParticipantAction,
  changeSessionStatusAction,
} from '../exam-actions';
import { SectionCard } from '@/components/educator-shell';

/**
 * Session lifecycle transitions mirrored from the API.
 *
 * Duplicated here only to decide which button is *offered*; the API remains the
 * authority and rejects an illegal transition with a 422 that this component
 * surfaces verbatim rather than swallowing.
 */
const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['OPEN', 'CANCELLED'],
  OPEN: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

const PARTICIPANT_TONES = {
  INVITED: 'amber',
  ELIGIBLE: 'blue',
  DISQUALIFIED: 'red',
  COMPLETED: 'green',
} as const;

export function SessionPanel({
  session,
  managedMode = false,
}: {
  session: ExamSession;
  /** Managers mutate; observers (e.g. an executive view) only read. */
  managedMode?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function changeStatus(status: SessionStatus) {
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await changeSessionStatusAction(session.id, status);
      if (result.ok) setMessage(`Status sesi diubah ke ${status}.`);
      else setError(result.message);
    });
  }

  function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await addParticipantAction(session.id, {
        enrollmentId: String(data.get('enrollmentId')),
      });
      if (result.ok) {
        setMessage('Peserta ditambahkan.');
        form.reset();
      } else {
        setError(result.message);
      }
    });
  }

  const participants: ExamParticipant[] = session.participants ?? [];
  const transitions = ALLOWED_TRANSITIONS[session.status];
  const canAddParticipant =
    managedMode &&
    (session.status === 'DRAFT' || session.status === 'SCHEDULED');

  return (
    <SectionCard
      id="exam-session"
      title="Sesi & peserta"
      description="Peserta hanya dapat ditambahkan sebelum sesi dibuka; sesudah itu gunakan koreksi."
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Pill tone={session.status === 'OPEN' ? 'green' : 'blue'}>
            {session.status}
          </Pill>
          <p className="text-sm text-slate-400">
            {formatDateTime(session.startAt)} — {formatDateTime(session.endAt)}
          </p>
        </div>

        {managedMode ? (
          <div className="flex flex-wrap gap-2">
            {transitions.length === 0 ? (
              <p className="text-xs text-slate-500">
                Status akhir — tidak ada transisi tersedia.
              </p>
            ) : (
              transitions.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending}
                  onClick={() => changeStatus(status)}
                  className="rounded-xl border border-sky-500/40 px-3 py-1.5 text-xs text-sky-100 disabled:opacity-50"
                >
                  Ubah ke {status}
                </button>
              ))
            )}
          </div>
        ) : null}

        {canAddParticipant ? (
          <form onSubmit={addParticipant} className="space-y-3">
            <FieldLabel label="Enrollment ID peserta">
              <input name="enrollmentId" required className={inputClassName} />
            </FieldLabel>
            <SubmitButton disabled={pending}>Tambahkan peserta</SubmitButton>
          </form>
        ) : null}

        {participants.length === 0 ? (
          <EmptyState>Belum ada peserta terdaftar.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-3 py-2"
              >
                <span className="truncate text-xs text-slate-400">
                  {participant.enrollmentId}
                </span>
                <Pill tone={PARTICIPANT_TONES[participant.status] ?? 'slate'}>
                  {participant.status}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message ? (
        <p className="mt-4 text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </SectionCard>
  );
}
