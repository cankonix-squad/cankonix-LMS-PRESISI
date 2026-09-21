'use client';

import { FormEvent, useState, useTransition } from 'react';
import type { Exam, ExamBlueprintRule, QuestionBank } from '@lms/api-client';
import {
  EmptyState,
  FieldLabel,
  inputClassName,
  SubmitButton,
} from '@/components/data-state';
import type { LoadResult } from '@/lib/api';
import { saveBlueprintAction } from '../exam-actions';
import { SectionCard } from '@/components/educator-shell';

type DraftRule = {
  code: string;
  label: string;
  count: string;
  pointsPerQuestion: string;
  questionBankId: string;
  topic: string;
  difficulty: string;
};

const emptyRule: DraftRule = {
  code: '',
  label: '',
  count: '1',
  pointsPerQuestion: '1',
  questionBankId: '',
  topic: '',
  difficulty: '',
};

function toDraft(rule: ExamBlueprintRule): DraftRule {
  return {
    code: rule.code,
    label: rule.label ?? '',
    count: String(rule.count),
    pointsPerQuestion: String(rule.pointsPerQuestion),
    questionBankId: rule.questionBankId ?? '',
    topic: rule.topic ?? '',
    difficulty: rule.difficulty ?? '',
  };
}

/**
 * Blueprint editor.
 *
 * A blueprint is a set of rules, so the whole set is sent in one request: the
 * API validates the aggregate (pool sufficiency, score consistency) and a
 * partial save would let the server see an inconsistent intermediate state.
 */
export function BlueprintEditor({
  exam,
  banks,
}: {
  exam: Exam;
  banks: LoadResult<{ data: QuestionBank[] }>;
}) {
  const [rules, setRules] = useState<DraftRule[]>(
    exam.blueprint?.rules?.map(toDraft) ?? [],
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function update(index: number, patch: Partial<DraftRule>) {
    setRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    const payload = {
      title: exam.blueprint?.title ?? exam.title,
      rules: rules.map((rule) => ({
        code: rule.code,
        label: rule.label || undefined,
        count: Number(rule.count),
        pointsPerQuestion: Number(rule.pointsPerQuestion),
        questionBankId: rule.questionBankId || undefined,
        topic: rule.topic || undefined,
        difficulty: rule.difficulty || undefined,
      })),
    };
    startTransition(async () => {
      const result = await saveBlueprintAction(exam.id, payload);
      if (result.ok) setMessage('Blueprint tersimpan.');
      else setError(result.message);
    });
  }

  const bankOptions = banks.data?.data ?? [];

  return (
    <SectionCard
      id="exam-blueprint"
      title="Blueprint & komposisi soal"
      description="Rule menentukan jumlah dan bobot soal; validasi kecukupan pool dilakukan API saat publish/start."
    >
      <form onSubmit={save} className="space-y-4">
        {rules.length === 0 ? (
          <EmptyState>Belum ada rule. Tambahkan minimal satu rule.</EmptyState>
        ) : null}
        {rules.map((rule, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-slate-800 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">
                Rule {index + 1}
              </p>
              <button
                type="button"
                onClick={() =>
                  setRules((current) => current.filter((_, i) => i !== index))
                }
                className="text-xs text-rose-300"
              >
                Hapus
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldLabel label="Kode rule">
                <input
                  required
                  value={rule.code}
                  onChange={(e) => update(index, { code: e.target.value })}
                  className={inputClassName}
                />
              </FieldLabel>
              <FieldLabel label="Label">
                <input
                  value={rule.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  className={inputClassName}
                />
              </FieldLabel>
              <FieldLabel label="Jumlah soal">
                <input
                  type="number"
                  min="1"
                  required
                  value={rule.count}
                  onChange={(e) => update(index, { count: e.target.value })}
                  className={inputClassName}
                />
              </FieldLabel>
              <FieldLabel label="Poin per soal">
                <input
                  type="number"
                  min="1"
                  required
                  value={rule.pointsPerQuestion}
                  onChange={(e) =>
                    update(index, { pointsPerQuestion: e.target.value })
                  }
                  className={inputClassName}
                />
              </FieldLabel>
              <FieldLabel label="Bank soal">
                <select
                  value={rule.questionBankId}
                  onChange={(e) =>
                    update(index, { questionBankId: e.target.value })
                  }
                  className={inputClassName}
                >
                  <option value="">— semua bank —</option>
                  {bankOptions.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Topik">
                <input
                  value={rule.topic}
                  onChange={(e) => update(index, { topic: e.target.value })}
                  className={inputClassName}
                />
              </FieldLabel>
              <FieldLabel label="Kesulitan">
                <input
                  value={rule.difficulty}
                  onChange={(e) =>
                    update(index, { difficulty: e.target.value })
                  }
                  className={inputClassName}
                />
              </FieldLabel>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setRules((current) => [...current, { ...emptyRule }])
            }
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Tambah rule
          </button>
          <SubmitButton disabled={pending || rules.length === 0}>
            Simpan blueprint
          </SubmitButton>
        </div>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </SectionCard>
  );
}
