'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pill } from '@/components/data-state';
import { SectionCard } from '@/components/student-shell';
import type { ActionResult } from './actions';

/**
 * Eligibility gate for the exam runtime.
 *
 * The participant supplies the participant id they were enrolled under; the API
 * decides whether an attempt may be started (eligibility status, session window,
 * remaining duration). This component only reports what the API answers, so no
 * eligibility rule is duplicated in the browser.
 */
export function ExamStartForm({
  defaultParticipantId = '',
  action,
}: {
  defaultParticipantId?: string;
  action: (
    participantId: string,
  ) => Promise<ActionResult<{ attemptId: string }>>;
}) {
  const [participantId, setParticipantId] = useState(defaultParticipantId);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit() {
    const trimmed = participantId.trim();
    if (!trimmed) {
      setError('Masukkan nomor peserta terlebih dahulu.');
      setMessage('');
      return;
    }
    setPending(true);
    setError('');
    setMessage('');
    const result = await action(trimmed);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // Navigate to the attempt route so the runtime is rendered by the server
    // from the authoritative attempt, deadline and any saved answers, rather
    // than from anything the browser held before.
    router.push(`/ujian?attempt=${result.data.attemptId}`);
  }

  return (
    <SectionCard
      id="exam-start"
      title="Mulai Ujian"
      description="Masukkan nomor peserta Anda. Waktu ujian ditetapkan oleh server saat ujian dimulai."
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="blue">Sesi ditentukan server</Pill>
          <Pill tone="slate">Resume otomatis saat halaman dimuat ulang</Pill>
        </div>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Nomor peserta
          <input
            value={participantId}
            onChange={(event) => setParticipantId(event.target.value)}
            placeholder="UUID peserta"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="w-full rounded-xl border border-sky-500/40 bg-sky-500/20 px-4 py-3 text-sm font-medium text-sky-100 disabled:opacity-50 sm:w-auto"
        >
          {pending ? 'Memproses…' : 'Mulai / Lanjutkan Ujian'}
        </button>

        <p className="text-[11px] leading-relaxed text-slate-500">
          Memulai ulang saat ujian masih berjalan akan melanjutkan attempt yang
          sama, beserta jawaban yang sudah tersimpan.
        </p>
      </div>
    </SectionCard>
  );
}
