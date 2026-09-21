'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Attempt, AttemptQuestion } from '@lms/api-client';
import { SectionCard } from '@/components/student-shell';
import { Pill, formatDateTime } from '@/components/data-state';
import {
  SAVE_STATUS,
  applySavedAnswer,
  answeredCount,
  buildAnswerPayload,
  formatDuration,
  isUrgent,
  readSavedKeys,
  readSavedText,
  remainingMs,
  revisionOf,
  type SaveStatus,
} from './exam-view';
import { saveAnswerAction, submitAttemptAction } from './actions';

/** Debounce for autosave: long enough to batch typing, short enough to be safe. */
const AUTOSAVE_DEBOUNCE_MS = 900;

type QuestionState = {
  keys: string[];
  text: string;
  status: SaveStatus;
  message: string;
};

/**
 * The exam runtime.
 *
 * Design decisions worth stating:
 *
 * - **The deadline is the server's.** `remainingMs` is computed from the
 *   attempt's `expiresAt` against a clock reading taken on each tick. Nothing
 *   here decides when the attempt ends; it only renders the server's answer.
 * - **Resume is a re-read, not local storage.** Saved answers arrive inside the
 *   attempt payload, so a refresh restores exactly what the server holds. No
 *   answer is cached in the browser, and no answer key is ever fetched.
 * - **The revision comes from the server.** Each write advances the revision the
 *   server acknowledged; a stale write is rejected by the API and surfaced
 *   rather than silently discarded.
 */
export function ExamRuntime({ attempt: initialAttempt }: { attempt: Attempt }) {
  const [attempt, setAttempt] = useState(initialAttempt);
  const [now, setNow] = useState(() => Date.now());
  const [activeIndex, setActiveIndex] = useState(0);
  const [states, setStates] = useState<Record<string, QuestionState>>(() =>
    buildInitialStates(initialAttempt),
  );
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Guards against a debounced save firing after the attempt is submitted.
  const finalized = useRef(!['IN_PROGRESS'].includes(initialAttempt.status));
  // Guards against a second submit (manual or automatic) while one is running.
  const inFlight = useRef(false);

  const remaining = remainingMs(attempt.expiresAt, now);
  const expired = attempt.status !== 'IN_PROGRESS' || remaining <= 0;

  const persist = useCallback(
    async (question: AttemptQuestion, keys: string[], text: string) => {
      if (finalized.current) return;
      setStates((current) => ({
        ...current,
        [question.id]: {
          ...current[question.id],
          keys,
          text,
          status: SAVE_STATUS.SAVING,
          message: '',
        },
      }));
      const result = await saveAnswerAction(attempt.id, question.id, {
        answerPayload: buildAnswerPayload(keys, text),
        revision: revisionOf(question),
      });
      if (!result.ok) {
        setStates((current) => ({
          ...current,
          [question.id]: {
            ...current[question.id],
            keys,
            text,
            status: SAVE_STATUS.ERROR,
            message: result.message,
          },
        }));
        return;
      }
      setAttempt((current) =>
        applySavedAnswer(current, question.id, result.data),
      );
      setStates((current) => ({
        ...current,
        [question.id]: {
          keys,
          text,
          status: SAVE_STATUS.SAVED,
          message: '',
        },
      }));
    },
    [attempt.id],
  );

  function update(question: AttemptQuestion, keys: string[], text: string) {
    setStates((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        keys,
        text,
        status: SAVE_STATUS.IDLE,
        message: '',
      },
    }));
    // Replacing the pending timer for this question only: edits to one question
    // never cancel a save queued for another.
    clearTimeout(timers.current[question.id]);
    timers.current[question.id] = setTimeout(() => {
      void persist(question, keys, text);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /** Flushes every pending edit immediately, used before submitting. */
  const flushPending = useCallback(async () => {
    const pending = Object.entries(timers.current).filter(
      ([, timer]) => timer !== undefined,
    );
    for (const [questionId, timer] of pending) {
      clearTimeout(timer);
      delete timers.current[questionId];
      const question = attempt.questions.find((item) => item.id === questionId);
      const state = states[questionId];
      if (!question || !state) continue;
      const hasSaved =
        question.answer &&
        Object.keys(question.answer.answerPayload).length > 0;
      if (hasSaved) await persist(question, state.keys, state.text);
    }
  }, [attempt.questions, persist, states]);

  const submit = useCallback(
    async ({ flush = true }: { flush?: boolean } = {}) => {
      if (finalized.current || inFlight.current) return;
      inFlight.current = true;
      setSubmitting(true);
      setSubmitError('');
      setSubmitMessage('');
      // The expiry path skips the flush: the deadline has already passed, so the
      // API would reject every pending write anyway.
      if (flush) await flushPending();
      const result = await submitAttemptAction(attempt.id);
      inFlight.current = false;
      setSubmitting(false);
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      finalized.current = true;
      setAttempt((current) => ({
        ...current,
        status: result.data.status as Attempt['status'],
        score: result.data.score,
      }));
      setSubmitMessage(
        result.data.status === 'EXPIRED'
          ? 'Waktu habis. Jawaban yang tersimpan telah dikumpulkan otomatis.'
          : 'Jawaban berhasil dikumpulkan.',
      );
    },
    [attempt.id, flushPending],
  );

  // A one-second tick is all the display needs; the value itself always comes
  // from the server deadline, so drift in this interval cannot extend an exam.
  //
  // The tick also finalizes the attempt once the server deadline passes. A
  // countdown that only *displays* expiry would leave the attempt IN_PROGRESS on
  // the server indefinitely, since only a submit moves it out of that state.
  // Pending edits are not flushed on this path: the deadline has passed and the
  // API would reject those writes anyway.
  useEffect(() => {
    if (finalized.current) return;
    const interval = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (remainingMs(initialAttempt.expiresAt, tick) <= 0) {
        void submit({ flush: false });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [initialAttempt.expiresAt, submit]);

  const answered = useMemo(() => answeredCount(attempt), [attempt]);
  const active = attempt.questions[activeIndex];
  const activeState = active ? states[active.id] : undefined;

  if (!active || !activeState) {
    return (
      <SectionCard
        id="exam-runtime"
        title="Ujian"
        description="Tidak ada soal pada attempt ini."
      >
        <p className="text-sm text-slate-400">
          Hubungi pengawas bila Anda seharusnya menerima soal.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      {/* Sticky timer: the single most important piece of state in an exam. */}
      <div
        className={
          expired
            ? 'sticky top-0 z-20 rounded-2xl border border-rose-500/40 bg-rose-950/90 p-3 backdrop-blur'
            : isUrgent(remaining)
              ? 'sticky top-0 z-20 rounded-2xl border border-amber-500/40 bg-amber-950/80 p-3 backdrop-blur'
              : 'sticky top-0 z-20 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 backdrop-blur'
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Sisa waktu
            </p>
            <p
              className={
                expired
                  ? 'font-mono text-2xl font-bold text-rose-200'
                  : isUrgent(remaining)
                    ? 'font-mono text-2xl font-bold text-amber-200'
                    : 'font-mono text-2xl font-bold text-slate-100'
              }
            >
              {expired ? 'HABIS' : formatDuration(remaining)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Terjawab
            </p>
            <p className="text-lg font-semibold text-slate-100">
              {answered}/{attempt.questions.length}
            </p>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Berakhir {formatDateTime(attempt.expiresAt)} (waktu server)
        </p>
      </div>

      {submitMessage ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {submitMessage}
        </p>
      ) : null}
      {submitError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          {submitError}
        </p>
      ) : null}

      {/* Question navigator */}
      <div className="flex flex-wrap gap-2">
        {attempt.questions.map((question, index) => {
          const state = states[question.id];
          const done = state ? isQuestionAnswered(state) : false;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Soal ${index + 1}`}
              className={
                index === activeIndex
                  ? 'h-9 w-9 rounded-lg border border-sky-400 bg-sky-500/20 text-sm text-white'
                  : done
                    ? 'h-9 w-9 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-100'
                    : 'h-9 w-9 rounded-lg border border-slate-700 text-sm text-slate-300'
              }
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <SectionCard
        id={`soal-${active.sequence}`}
        title={`Soal ${active.sequence} dari ${attempt.questions.length}`}
        description={`${active.points} poin · ${active.questionType.name}`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
          {active.stem}
        </p>

        <div className="mt-5">
          {active.questionType.hasOptions && active.options.length > 0 ? (
            <fieldset disabled={expired} className="space-y-2">
              <legend className="mb-2 text-xs text-slate-400">
                {active.questionType.multiSelect
                  ? 'Pilih semua jawaban yang benar'
                  : 'Pilih satu jawaban'}
              </legend>
              {active.options.map((option) => {
                const checked = activeState.keys.includes(option.key);
                return (
                  <label
                    key={option.key}
                    className={
                      checked
                        ? 'flex cursor-pointer items-start gap-3 rounded-xl border border-sky-500/50 bg-sky-500/10 p-3'
                        : 'flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-3'
                    }
                  >
                    <input
                      type={
                        active.questionType.multiSelect ? 'checkbox' : 'radio'
                      }
                      name={`q-${active.id}`}
                      checked={checked}
                      onChange={() => {
                        const keys = active.questionType.multiSelect
                          ? checked
                            ? activeState.keys.filter(
                                (key) => key !== option.key,
                              )
                            : [...activeState.keys, option.key]
                          : [option.key];
                        update(active, keys, activeState.text);
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-200">
                      <span className="mr-2 font-mono text-xs text-slate-400">
                        {option.key}
                      </span>
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <label className="text-sm text-slate-300">
              Jawaban
              <textarea
                disabled={expired}
                value={activeState.text}
                onChange={(event) =>
                  update(active, activeState.keys, event.target.value)
                }
                className="mt-1 min-h-40 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400 disabled:opacity-60"
                placeholder="Tulis jawaban Anda di sini…"
              />
            </label>
          )}
        </div>

        {/* Autosave indicator. Always explicit: silence is not a status. */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          {activeState.status === SAVE_STATUS.SAVING ? (
            <span className="text-sky-300">Menyimpan…</span>
          ) : activeState.status === SAVE_STATUS.SAVED ? (
            <span className="text-emerald-300">Tersimpan</span>
          ) : activeState.status === SAVE_STATUS.ERROR ? (
            <span className="text-rose-300">
              Gagal menyimpan: {activeState.message}
            </span>
          ) : (
            <span className="text-slate-500">Belum ada perubahan</span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={activeIndex >= attempt.questions.length - 1}
            onClick={() =>
              setActiveIndex((index) =>
                Math.min(attempt.questions.length - 1, index + 1),
              )
            }
            className="rounded-xl border border-sky-500/40 px-4 py-2 text-sm text-sky-100 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </SectionCard>

      <SubmitBar
        answered={answered}
        total={attempt.questions.length}
        disabled={submitting || expired}
        status={attempt.status}
        onConfirm={() => void submit()}
      />
    </div>
  );
}

/**
 * Submission is irreversible, so it is guarded by an explicit confirmation that
 * names how many questions are still unanswered.
 */
function SubmitBar({
  answered,
  total,
  disabled,
  status,
  onConfirm,
}: {
  answered: number;
  total: number;
  disabled: boolean;
  status: Attempt['status'];
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const unanswered = total - answered;
  if (status !== 'IN_PROGRESS')
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-center">
        <Pill tone={status === 'SUBMITTED' ? 'green' : 'amber'}>{status}</Pill>
        <p className="mt-2 text-xs text-slate-400">
          Attempt ini sudah dikumpulkan.
        </p>
      </div>
    );
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-200">
            Kumpulkan sekarang?{' '}
            {unanswered > 0
              ? `Masih ada ${unanswered} soal belum dijawab.`
              : 'Semua soal sudah dijawab.'}
          </p>
          <p className="text-xs text-slate-500">
            Setelah dikumpulkan, jawaban tidak dapat diubah lagi.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
            >
              Ya, kumpulkan
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={disabled}
          className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-100 disabled:opacity-50"
        >
          Kumpulkan jawaban
        </button>
      )}
    </div>
  );
}

function isQuestionAnswered(state: QuestionState): boolean {
  return state.keys.length > 0 || state.text.trim().length > 0;
}

function buildInitialStates(attempt: Attempt): Record<string, QuestionState> {
  const states: Record<string, QuestionState> = {};
  for (const question of attempt.questions) {
    states[question.id] = {
      keys: readSavedKeys(question.answer?.answerPayload),
      text: readSavedText(question.answer?.answerPayload),
      status: question.answer ? SAVE_STATUS.SAVED : SAVE_STATUS.IDLE,
      message: '',
    };
  }
  return states;
}
