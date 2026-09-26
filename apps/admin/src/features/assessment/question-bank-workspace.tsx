'use client';

import type {
  ApiListResponse,
  QuestionBank,
  Curriculum,
} from '@lms/api-client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  ActionButton,
  ActionGroup,
  ActionMessage,
  AdminPage,
  EmptyState,
  EnterpriseDrawer,
  EnterpriseTable,
  ErrorState,
  FilterTabs,
  FilterToolbar,
  FormActions,
  FormField,
  PageHeader,
  PaginationBar,
  PrimaryActionButton,
  StatusBadge,
  StickyActionCell,
  enterpriseInputClass,
} from '@/components/admin';
import {
  createQuestionBankAction,
  updateQuestionBankAction,
  updateQuestionBankStatusAction,
} from './question-bank-actions';

type Filters = {
  search?: string;
  curriculumId?: string;
  subjectId?: string;
  status?: QuestionBank['status'];
  page: number;
  limit: number;
};
type Result = {
  data: ApiListResponse<QuestionBank> | null;
  error: string | null;
};
type Drawer =
  | { mode: 'create' }
  | { mode: 'edit'; bank: QuestionBank }
  | null;

export function QuestionBankWorkspace({
  result,
  curricula,
  filters,
}: {
  result: Result;
  curricula: Curriculum[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const banks = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Ujian & Penilaian / Bank Soal"
        title="Kelola bank soal"
        description={
          result.error
            ? 'Data bank soal belum dapat dimuat.'
            : `${total} bank soal ditemukan. Gunakan filter untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Tambah bank soal
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <BankToolbar filters={filters} curricula={curricula} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : banks.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada bank soal yang cocok.
            </p>
            <p className="mt-2">
              Bank soal dikaitkan dengan kurikulum subject. Coba ubah pencarian atau filter.
            </p>
            <Link
              href="/bank-soal"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <BankTable
            banks={banks}
            onEdit={(bank) => setDrawer({ mode: 'edit', bank })}
          />
        )}
        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="bank soal"
            hrefFor={({ page, limit }) =>
              bankHref({ ...filters, page, limit })
            }
          />
        ) : null}
      </div>

      {drawer ? (
        <BankDrawer
          drawer={drawer}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function BankToolbar({
  filters,
  curricula,
}: {
  filters: Filters;
  curricula: Curriculum[];
}) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Aktif', value: 'ACTIVE' as const },
    { label: 'Nonaktif', value: 'INACTIVE' as const },
  ];
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((s) => ({
            label: s.label,
            href: bankHref({ ...filters, status: s.value, page: 1 }),
            active:
              filters.status === s.value ||
              (!filters.status && !s.value),
          }))}
        />
      }
    >
      <form
        action="/bank-soal"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <select
          name="curriculumId"
          defaultValue={filters.curriculumId ?? ''}
          aria-label="Filter kurikulum"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-56"
        >
          <option value="">Semua kurikulum</option>
          {curricula.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.version})
            </option>
          ))}
        </select>
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari nama atau kode bank soal"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/bank-soal"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function BankTable({
  banks,
  onEdit,
}: {
  banks: QuestionBank[];
  onEdit: (bank: QuestionBank) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Nama bank soal' },
        { label: 'Kode' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={880}
      mobile={
        <>
          {banks.map((bank) => (
            <BankCard key={bank.id} bank={bank} onEdit={onEdit} />
          ))}
        </>
      }
    >
      {banks.map((bank) => (
        <tr key={bank.id} className="group hover:bg-slate-50/80">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-950">{bank.name}</p>
            {bank.description ? (
              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                {bank.description}
              </p>
            ) : null}
          </td>
          <td className="px-4 py-3 font-medium text-slate-600">{bank.code}</td>
          <td className="px-4 py-3">
            <StatusBadge
              tone={bank.status === 'ACTIVE' ? 'green' : 'red'}
            >
              {bank.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-slate-600">
            {formatDate(bank.updatedAt)}
          </td>
          <StickyActionCell>
            <BankActions bank={bank} onEdit={() => onEdit(bank)} />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function BankCard({
  bank,
  onEdit,
}: {
  bank: QuestionBank;
  onEdit: (bank: QuestionBank) => void;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{bank.name}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{bank.code}</p>
        </div>
        <StatusBadge
          tone={bank.status === 'ACTIVE' ? 'green' : 'red'}
        >
          {bank.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Diubah</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(bank.updatedAt)}
          </dd>
        </div>
      </dl>
      <BankActions bank={bank} onEdit={() => onEdit(bank)} />
    </article>
  );
}

function BankActions({
  bank,
  onEdit,
}: {
  bank: QuestionBank;
  onEdit: () => void;
}) {
  const targetStatus = bank.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const [state, action, isPending] = useActionState(
    updateQuestionBankStatusAction,
    { ok: false, message: null },
  );
  return (
    <div className="flex flex-col gap-2">
      <ActionGroup>
        <ActionButton onClick={onEdit}>Edit</ActionButton>
        <form action={action}>
          <input type="hidden" name="id" value={bank.id} />
          <input type="hidden" name="name" value={bank.name} />
          <input type="hidden" name="status" value={targetStatus} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-60"
          >
            {isPending
              ? 'Memproses...'
              : targetStatus === 'ACTIVE'
                ? 'Aktifkan'
                : 'Nonaktifkan'}
          </button>
        </form>
      </ActionGroup>
      {state.message ? <ActionMessage state={state} /> : null}
    </div>
  );
}

function BankDrawer({
  drawer,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  onClose: () => void;
}) {
  const isEdit = drawer.mode === 'edit';
  const bank = isEdit ? drawer.bank : null;
  const [state, action, isPending] = useActionState(
    isEdit ? updateQuestionBankAction : createQuestionBankAction,
    { ok: false, message: null },
  );
  return (
    <EnterpriseDrawer
      eyebrow={isEdit ? 'Ubah data' : 'Tambah data'}
      title={isEdit ? 'Ubah bank soal' : 'Tambah bank soal'}
      description="Isi kolom wajib dengan data yang mudah dikenali operator."
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {bank ? <input type="hidden" name="id" value={bank.id} /> : null}
        <FormField label="Mata pelajaran kurikulum" required>
          <input
            name="curriculumSubjectId"
            defaultValue={bank?.curriculumSubjectId ?? ''}
            required
            placeholder="UUID curriculum subject"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Kode bank soal" required>
          <input
            name="code"
            defaultValue={bank?.code ?? ''}
            required
            maxLength={64}
            placeholder="Contoh: BS-HUKUM-2024"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Nama bank soal" required>
          <input
            name="name"
            defaultValue={bank?.name ?? ''}
            required
            maxLength={255}
            placeholder="Contoh: Bank Soal Hukum Pidana 2024"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Deskripsi">
          <textarea
            name="description"
            defaultValue={bank?.description ?? ''}
            rows={4}
            maxLength={1000}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Status" required>
          <select
            name="status"
            defaultValue={bank?.status ?? 'ACTIVE'}
            className={enterpriseInputClass}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </FormField>
        <ActionMessage state={state} />
        <div className="border-t border-slate-200 pt-4">
          <FormActions
            onCancel={onClose}
            pending={isPending}
            submitLabel="Simpan"
          />
        </div>
      </form>
    </EnterpriseDrawer>
  );
}

function bankHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.curriculumId) params.set('curriculumId', filters.curriculumId);
  if (filters.subjectId) params.set('subjectId', filters.subjectId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/bank-soal?${query}` : '/bank-soal';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}