'use client';

import type {
  CertificateTemplate,
  CertificateTemplateList,
  CertificateTemplateStatus,
} from '@lms/api-client';
import Link from 'next/link';
import { useState } from 'react';
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
import {
  templateStatusLabel,
  templateStatusTone,
} from './graduation-labels';

type Filters = {
  code?: string;
  status?: CertificateTemplateStatus;
  page: number;
  limit: number;
};

type Result = {
  data: CertificateTemplateList | null;
  error: string | null;
};

type Drawer = { mode: 'detail'; template: CertificateTemplate } | null;

export function CertificateTemplateWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const templates = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Kelulusan & Sertifikat / Template Sertifikat"
        title="Template sertifikat"
        description={
          result.error
            ? 'Data template sertifikat belum dapat dimuat.'
            : `${total} template sertifikat ditemukan. Template menentukan tampilan dokumen sertifikat yang diterbitkan.`
        }
      />

      <div className="px-5 pt-1">
        <TemplateToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : templates.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada template sertifikat yang cocok.
            </p>
            <p className="mt-2">
              Gunakan filter status atau ubah pencarian untuk menemukan template.
            </p>
            <Link
              href="/template-sertifikat"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Reset filter
            </Link>
          </EmptyState>
        ) : (
          <>
            <TemplateTable
              templates={templates}
              onDetail={(t) => setDrawer({ mode: 'detail', template: t })}
            />
            <PaginationBar
              page={filters.page}
              limit={filters.limit}
              total={total}
              totalPages={totalPages}
              itemLabel="template sertifikat"
              hrefFor={(next) =>
                templateHref({ ...filters, page: next.page, limit: next.limit })
              }
            />
          </>
        )}
      </div>

      {drawer ? (
        <TemplateDetailDrawer
          template={drawer.template}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function TemplateToolbar({ filters }: { filters: Filters }) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Draft', value: 'DRAFT' as const },
    { label: 'Aktif', value: 'ACTIVE' as const },
    { label: 'Arsip', value: 'ARCHIVED' as const },
  ];
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((s) => ({
            label: s.label,
            href: templateHref({
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
        action="/template-sertifikat"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="code"
          defaultValue={filters.code}
          placeholder="Cari kode template"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/template-sertifikat"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function TemplateTable({
  templates,
  onDetail,
}: {
  templates: CertificateTemplate[];
  onDetail: (t: CertificateTemplate) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Nama template' },
        { label: 'Kode', className: 'w-24' },
        { label: 'Versi', className: 'w-16 text-center' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={['1fr', '6rem', '4rem', '6rem', '9rem', '6rem']}
      mobile={templates.map((t) => (
        <TemplateCard key={t.id} template={t} onDetail={() => onDetail(t)} />
      ))}
    >
      {templates.map((t) => (
        <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-950">{t.name}</p>
            {t.description ? (
              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                {t.description}
              </p>
            ) : null}
          </td>
          <td className="px-4 py-3 font-mono text-xs text-slate-600">
            {t.code}
          </td>
          <td className="px-4 py-3 text-center font-medium text-slate-700">
            v{t.version}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={templateStatusTone(t.status)}>
              {templateStatusLabel(t.status)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm text-slate-500">
            {formatDate(t.updatedAt)}
          </td>
          <StickyActionCell>
            <ActionGroup>
              <ActionButton onClick={() => onDetail(t)}>Detail</ActionButton>
            </ActionGroup>
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function TemplateCard({
  template,
  onDetail,
}: {
  template: CertificateTemplate;
  onDetail: () => void;
}) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-950">{template.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {template.code} · v{template.version}
          </p>
        </div>
        <StatusBadge tone={templateStatusTone(template.status)}>
          {templateStatusLabel(template.status)}
        </StatusBadge>
      </div>
      {template.description ? (
        <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
      ) : null}
      <div className="flex gap-2">
        <ActionButton onClick={onDetail}>Detail</ActionButton>
      </div>
    </div>
  );
}

function TemplateDetailDrawer({
  template,
  onClose,
}: {
  template: CertificateTemplate;
  onClose: () => void;
}) {
  return (
    <EnterpriseDrawer
      eyebrow="Template Sertifikat / Detail"
      title={template.name}
      description={`Kode: ${template.code} · Versi: ${template.version}`}
      onClose={onClose}
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
            Informasi template
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <StatusBadge tone={templateStatusTone(template.status)}>
                {templateStatusLabel(template.status)}
              </StatusBadge>
            </div>
            {template.description ? (
              <div>
                <p className="text-xs text-slate-500">Deskripsi</p>
                <p className="mt-1 text-sm text-slate-700">{template.description}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Dibuat</p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDateTime(template.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Terakhir diubah</p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDateTime(template.updatedAt)}
                </p>
              </div>
            </div>
            {template.templateObjectKey ? (
              <div>
                <p className="text-xs text-slate-500">Objek artefak</p>
                <p className="mt-1 font-mono text-xs text-slate-700 break-all">
                  {template.templateObjectKey}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {template.config ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
              Konfigurasi tampilan
            </h3>
            <pre className="max-h-64 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 font-mono">
              {JSON.stringify(template.config, null, 2)}
            </pre>
          </section>
        ) : null}
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

function templateHref({
  code,
  status,
  page,
  limit,
}: {
  code?: string;
  status?: CertificateTemplateStatus;
  page: number;
  limit: number;
}): string {
  const params = new URLSearchParams();
  if (code) params.set('code', code);
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/template-sertifikat?${params.toString()}`;
}