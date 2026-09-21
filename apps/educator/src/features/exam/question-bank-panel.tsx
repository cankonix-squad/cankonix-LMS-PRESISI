'use client';

import { FormEvent, useState, useTransition } from 'react';
import type { Question, QuestionBank, QuestionType } from '@lms/api-client';
import {
  DataBlock,
  EmptyState,
  FieldLabel,
  Pill,
  inputClassName,
  SubmitButton,
  textareaClassName,
} from '@/components/data-state';
import type { LoadResult } from '@/lib/api';
import {
  createQuestionAction,
  createQuestionBankAction,
  publishQuestionVersionAction,
} from '../exam-actions';
import { SectionCard } from '@/components/educator-shell';

/**
 * Question bank authoring.
 *
 * The bank list, the questions inside the selected bank and the question-type
 * vocabulary are three independent reads, so each render failure is confined to
 * its own block instead of blanking the whole panel.
 *
 * The authoring form is driven by the selected type's `hasOptions`/
 * `multiSelect` flags rather than by comparing `code` against known values, so a
 * new type added to the seeded vocabulary works without touching this file.
 */
export function QuestionBankPanel({
  banks,
  questions,
  questionTypes,
  selectedBankId,
}: {
  banks: LoadResult<{ data: QuestionBank[] }>;
  questions: LoadResult<{ data: Question[] }>;
  questionTypes: LoadResult<{ data: QuestionType[] }>;
  selectedBankId: string | null;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [typeId, setTypeId] = useState('');

  const types = questionTypes.data?.data ?? [];
  const activeType = types.find((type) => type.id === typeId) ?? null;
  const optionCount = activeType?.hasOptions
    ? activeType.multiSelect
      ? 5
      : 4
    : 0;

  function createBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      curriculumSubjectId: String(form.get('curriculumSubjectId')),
      code: String(form.get('code')),
      name: String(form.get('name')),
      description: String(form.get('description') || ''),
    };
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await createQuestionBankAction(payload);
      if (result.ok) setMessage('Bank soal berhasil dibuat.');
      else setError(result.message);
    });
  }

  function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBankId) {
      setError('Pilih bank soal terlebih dahulu.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const options = Array.from({ length: optionCount }, (_, index) => {
      const key = String.fromCharCode(65 + index);
      const label = String(form.get(`option-${key}`) ?? '');
      if (!label) return null;
      return {
        key,
        label,
        isCorrect: form.get(`correct-${key}`) === 'on',
        sortOrder: index,
      };
    }).filter(
      (option): option is NonNullable<typeof option> => option !== null,
    );

    const payload = {
      questionTypeId: typeId,
      stem: String(form.get('stem')),
      maxScore: Number(form.get('maxScore')),
      explanation: String(form.get('explanation') || '') || undefined,
      topic: String(form.get('topic') || '') || undefined,
      difficulty: String(form.get('difficulty') || '') || undefined,
      options: options.length > 0 ? options : undefined,
    };
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await createQuestionAction(selectedBankId, payload);
      if (result.ok) setMessage('Soal berhasil dibuat.');
      else setError(result.message);
    });
  }

  function publish(question: Question) {
    const version = question.latestVersion;
    if (!version) return;
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await publishQuestionVersionAction(
        question.id,
        version.id,
      );
      if (result.ok) setMessage('Versi soal dipublikasikan.');
      else setError(result.message);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        id="question-banks"
        title="Bank soal"
        description="Bank soal terhubung ke curriculum subject dan menjadi sumber rule blueprint."
      >
        <form onSubmit={createBank} className="space-y-4">
          <FieldLabel label="Curriculum subject ID">
            <input
              name="curriculumSubjectId"
              required
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel label="Kode">
            <input
              name="code"
              required
              maxLength={64}
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel label="Nama">
            <input
              name="name"
              required
              maxLength={200}
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel label="Deskripsi">
            <textarea name="description" className={textareaClassName} />
          </FieldLabel>
          <SubmitButton disabled={pending}>Buat bank soal</SubmitButton>
        </form>
        <div className="mt-6 border-t border-slate-800 pt-5">
          <DataBlock
            result={banks}
            empty="Belum ada bank soal."
            isEmpty={(data) => data.data.length === 0}
          >
            {(data) => (
              <ul className="space-y-2">
                {data.data.map((bank) => (
                  <li
                    key={bank.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-slate-100">{bank.name}</p>
                      <p className="text-xs text-slate-500">{bank.code}</p>
                    </div>
                    <Pill tone={bank.status === 'ACTIVE' ? 'green' : 'slate'}>
                      {bank.status}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </DataBlock>
        </div>
      </SectionCard>

      <SectionCard
        id="question-authoring"
        title="Soal & versi"
        description="Versi yang sudah dipublikasikan tidak dapat diubah; buat versi baru untuk koreksi."
      >
        {!selectedBankId ? (
          <EmptyState>
            Buka halaman ini dengan parameter ?bank=&lt;id&gt; untuk melihat dan
            menambah soal pada bank tertentu.
          </EmptyState>
        ) : (
          <>
            <DataBlock
              result={questionTypes}
              empty="Vocabulary tipe soal belum tersedia."
              isEmpty={(data) => data.data.length === 0}
            >
              {(data) => (
                <form onSubmit={createQuestion} className="space-y-4">
                  <FieldLabel label="Tipe soal">
                    <select
                      required
                      value={typeId}
                      onChange={(event) => setTypeId(event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">— pilih tipe —</option>
                      {data.data.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Pertanyaan">
                    <textarea
                      name="stem"
                      required
                      className={textareaClassName}
                    />
                  </FieldLabel>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FieldLabel label="Poin maksimal">
                      <input
                        name="maxScore"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        className={inputClassName}
                      />
                    </FieldLabel>
                    <FieldLabel label="Topik">
                      <input name="topic" className={inputClassName} />
                    </FieldLabel>
                    <FieldLabel label="Kesulitan">
                      <input name="difficulty" className={inputClassName} />
                    </FieldLabel>
                  </div>
                  {activeType?.hasOptions ? (
                    <fieldset className="space-y-3">
                      <legend className="text-sm text-slate-300">
                        Pilihan jawaban
                        {activeType.multiSelect
                          ? ' (boleh lebih dari satu benar)'
                          : ' (satu jawaban benar)'}
                      </legend>
                      {Array.from({ length: optionCount }, (_, index) => {
                        const key = String.fromCharCode(65 + index);
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <input
                              name={`correct-${key}`}
                              type={
                                activeType.multiSelect ? 'checkbox' : 'radio'
                              }
                              value="on"
                              aria-label={`Jawaban benar ${key}`}
                              className="h-4 w-4"
                            />
                            <span className="w-4 text-sm text-slate-400">
                              {key}
                            </span>
                            <input
                              name={`option-${key}`}
                              className={inputClassName}
                              placeholder={`Teks pilihan ${key}`}
                            />
                          </div>
                        );
                      })}
                    </fieldset>
                  ) : null}
                  <FieldLabel
                    label="Pembahasan"
                    hint="Hanya tampil setelah penilaian."
                  >
                    <textarea
                      name="explanation"
                      className={textareaClassName}
                    />
                  </FieldLabel>
                  <SubmitButton disabled={pending || !typeId}>
                    Simpan soal (draft)
                  </SubmitButton>
                </form>
              )}
            </DataBlock>

            <div className="mt-6 border-t border-slate-800 pt-5">
              <DataBlock
                result={questions}
                empty="Bank ini belum memiliki soal."
                isEmpty={(data) => data.data.length === 0}
              >
                {(data) => (
                  <ul className="space-y-2">
                    {data.data.map((question) => (
                      <li
                        key={question.id}
                        className="rounded-xl border border-slate-800 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-100">
                              {question.latestVersion?.stem ??
                                question.code ??
                                question.id}
                            </p>
                            <p className="text-xs text-slate-500">
                              {question.versionCount} versi
                            </p>
                          </div>
                          <Pill
                            tone={
                              question.latestVersion?.status === 'PUBLISHED'
                                ? 'green'
                                : 'amber'
                            }
                          >
                            {question.latestVersion?.status ?? 'NO VERSION'}
                          </Pill>
                        </div>
                        {question.latestVersion?.status === 'DRAFT' ? (
                          <button
                            type="button"
                            onClick={() => publish(question)}
                            disabled={pending}
                            className="mt-3 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs text-sky-100 disabled:opacity-50"
                          >
                            Publikasikan
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </DataBlock>
            </div>
          </>
        )}
        {message ? (
          <p className="mt-4 text-sm text-emerald-300">{message}</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      </SectionCard>
    </div>
  );
}
