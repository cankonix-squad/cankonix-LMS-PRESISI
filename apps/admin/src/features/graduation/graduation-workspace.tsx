'use client';

import type {
  GraduationRule,
  GraduationRuleList,
  GraduationRuleStatus,
} from '@lms/api-client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  ActionButton,
  ActionGroup,
  AdminPage,
  EmptyState,
  EnterpriseDrawer,
  EnterpriseTable,
  ErrorState,
  FilterTabs,
  FilterToolbar,
  PageHeader,
  PaginationBar,
  StatusBadge,
  StickyActionCell,
} from '@/components/admin';
import { changeGraduationRuleStatusAction } from './graduation-actions';
import {
  ruleStatusLabel,
  ruleStatusTone,
} from './graduation-labels';

type Filters = {
  code?: string;
  status?: GraduationRuleStatus;
  page: number;
  limit: number;
};

type Result = {
  data: GraduationRuleList | null;
  error: string | null;
};

type Drawer = { mode: 'detail'; rule: GraduationRule } | null;

export function GraduationWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const rules = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Kelulusan & Sertifikat / Kelulusan"
        title="Kelola aturan kelulusan"
        description={
          result.error
            ? 'Data aturan kelulusan belum dapat dimuat.'
            : `${total} aturan kelulusan ditemukan. Aturan menentukan syarat peserta dinyatakan lulus dari suatu angkatan.`
        }
      />

      <div className="px-5 pt-1">
        <GraduationToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rules.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada aturan kelulusan yang cocok.
            </p>
            <p className="mt-2">
              Aturan kelulusan dikaitkan dengan angkatan. Gunakan filter status atau ubah pencarian.
            </p>
            <Link
              href="/kelulusan"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Reset filter
            </Link>
          </EmptyState>
        ) : (
          <>
            <GraduationTable
              rules={rules}
              onDetail={(r) => setDrawer({ mode: 'detail', rule: r })}
            />
            <PaginationBar
              page={filters.page}
              limit={filters.limit}
              total={total}
              totalPages={totalPages}
              itemLabel="aturan kelulusan"
              hrefFor={(next) =>
                graduationHref({ ...filters, page: next.page, limit: next.limit })
              }
            />
          </>
        )}
      </div>

      {drawer ? (
        <GraduationDetailDrawer
          rule={drawer.rule}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function GraduationToolbar({ filters }: { filters: Filters }) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Draft', value: 'DRAFT' as const },
    { label: 'Diterbitkan', value: 'PUBLISHED' as const },
    { label: 'Arsip', value: 'ARCHIVED' as const },
  ];
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((s) => ({
            label: s.label,
            href: graduationHref({
              ...filters,
              status: s.value,
              page: 1,
            }),
            active: filters.status === s.value || (!filters.status && !s.value),
          }))}
        />
      }
    >
      <form
        action="/kelulusan"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="code"
          defaultValue={filters.code}
          placeholder="Cari kode aturan"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/kelulusan"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function GraduationTable({
  rules,
  onDetail,
}: {
  rules: GraduationRule[];
  onDetail: (rule: GraduationRule) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Nama aturan' },
        { label: 'Kode', className: 'w-24' },
        { label: 'Versi', className: 'w-16 text-center' },
        { label: 'Status' },
        { label: 'Komponen' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={['1fr', '6rem', '4rem', '7rem', '5rem', '9rem', '8.5rem']}
      mobile={rules.map((r) => (
        <GraduationCard key={r.id} rule={r} onDetail={() => onDetail(r)} />
      ))}
    >
      {rules.map((r) => (
        <tr key={r.id} className="group hover:bg-slate-50 transition-colors">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-950">{r.name}</p>
            {r.description ? (
              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                {r.description}
              </p>
            ) : null}
          </td>
          <td className="px-4 py-3 font-mono text-xs text-slate-600">
            {r.code}
          </td>
          <td className="px-4 py-3 text-center font-medium text-slate-700">
            v{r.version}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={ruleStatusTone(r.status)}>
              {ruleStatusLabel(r.status)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600">
            {r.components.length} komponen
          </td>
          <td className="px-4 py-3 text-sm text-slate-500">
            {formatDate(r.updatedAt)}
          </td>
          <StickyActionCell>
            <GraduationRuleActions rule={r} onDetail={() => onDetail(r)} />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function GraduationCard({
  rule,
  onDetail,
}: {
  rule: GraduationRule;
  onDetail: () => void;
}) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-950">{rule.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {rule.code} · v{rule.version}
          </p>
        </div>
        <StatusBadge tone={ruleStatusTone(rule.status)}>
          {ruleStatusLabel(rule.status)}
        </StatusBadge>
      </div>
      {rule.description ? (
        <p className="text-xs text-slate-500 line-clamp-2">{rule.description}</p>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{rule.components.length} komponen</span>
        <span>·</span>
        <span>{formatDate(rule.updatedAt)}</span>
      </div>
      <div className="flex gap-2 pt-1">
        <ActionButton onClick={onDetail}>Detail</ActionButton>
        <GraduationRuleActions rule={rule} onDetail={onDetail} />
      </div>
    </div>
  );
}

function GraduationRuleActions({
  rule,
  onDetail,
}: {
  rule: GraduationRule;
  onDetail: () => void;
}) {
  return (
    <ActionGroup>
      <ActionButton onClick={onDetail}>Detail</ActionButton>
      <PublishAction rule={rule} />
      <ArchiveAction rule={rule} />
    </ActionGroup>
  );
}

function PublishAction({ rule }: { rule: GraduationRule }) {
  const [, action, isPending] = useActionState(
    changeGraduationRuleStatusAction,
    { ok: true, message: null },
  );
  if (rule.status !== 'DRAFT') return null;
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm('Terbitkan aturan kelulusan ini? Aturan yang sudah diterbitkan tidak dapat diubah.'))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={rule.id} />
      <input type="hidden" name="status" value="PUBLISHED" />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center rounded-md border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
      >
        {isPending ? 'Memproses...' : 'Terbitkan'}
      </button>
    </form>
  );
}

function ArchiveAction({ rule }: { rule: GraduationRule }) {
  const [, action, isPending] = useActionState(
    changeGraduationRuleStatusAction,
    { ok: true, message: null },
  );
  if (rule.status !== 'PUBLISHED') return null;
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm('Arsipkan aturan kelulusan ini?'))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={rule.id} />
      <input type="hidden" name="status" value="ARCHIVED" />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-60"
      >
        {isPending ? 'Memproses...' : 'Arsipkan'}
      </button>
    </form>
  );
}

function GraduationDetailDrawer({
  rule,
  onClose,
}: {
  rule: GraduationRule;
  onClose: () => void;
}) {
  return (
    <EnterpriseDrawer
      eyebrow="Kelulusan / Detail Aturan"
      title={rule.name}
      description={`Kode: ${rule.code} · Versi: ${rule.version}`}
      onClose={onClose}
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
            Informasi aturan
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <StatusBadge tone={ruleStatusTone(rule.status)}>
                {ruleStatusLabel(rule.status)}
              </StatusBadge>
            </div>
            {rule.description ? (
              <div>
                <p className="text-xs text-slate-500">Deskripsi</p>
                <p className="mt-1 text-sm text-slate-700">{rule.description}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Angkatan</p>
                <p className="mt-1 font-mono text-xs text-slate-700 break-all">
                  {rule.educationBatchId}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Terakhir diubah</p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDateTime(rule.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
            Komponen kelulusan ({rule.components.length})
          </h3>
          <div className="space-y-2">
            {rule.components.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {idx + 1}. {c.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {c.componentType}
                      {!c.required ? ' · Opsional' : ''}
                    </p>
                  </div>
                  {c.thresholdValue != null ? (
                    <span className="text-xs font-medium text-slate-600">
                      ≥ {c.thresholdValue}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </EnterpriseDrawer>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function graduationHref({
  code,
  status,
  page,
  limit,
}: {
  code?: string;
  status?: GraduationRuleStatus;
  page: number;
  limit: number;
}): string {
  const params = new URLSearchParams();
  if (code) params.set('code', code);
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/kelulusan?${params.toString()}`;
}