'use client';

import type {
  Certificate,
  CertificateList,
  CertificateStatus,
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
import { revokeCertificateAction } from './graduation-actions';
import {
  certificateStatusLabel,
  certificateStatusTone,
} from './graduation-labels';

type Filters = {
  status?: CertificateStatus;
  page: number;
  limit: number;
};

type Result = {
  data: CertificateList | null;
  error: string | null;
};

type Drawer = { mode: 'detail'; certificate: Certificate } | null;

export function CertificateWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const certificates = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Kelulusan & Sertifikat / Sertifikat"
        title="Sertifikat peserta"
        description={
          result.error
            ? 'Data sertifikat belum dapat dimuat.'
            : `${total} sertifikat ditemukan. Sertifikat diterbitkan dari keputusan kelulusan yang telah disetujui.`
        }
      />

      <div className="px-5 pt-1">
        <CertificateToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : certificates.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada sertifikat yang cocok.
            </p>
            <p className="mt-2">
              Sertifikat diterbitkan dari keputusan kelulusan yang sudah disetujui. Ubah filter status atau pencarian.
            </p>
            <Link
              href="/sertifikat"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Reset filter
            </Link>
          </EmptyState>
        ) : (
          <>
            <CertificateTable
              certificates={certificates}
              onDetail={(c) => setDrawer({ mode: 'detail', certificate: c })}
            />
            <PaginationBar
              page={filters.page}
              limit={filters.limit}
              total={total}
              totalPages={totalPages}
              itemLabel="sertifikat"
              hrefFor={(next) =>
                certificateHref({ ...filters, page: next.page, limit: next.limit })
              }
            />
          </>
        )}
      </div>

      {drawer ? (
        <CertificateDetailDrawer
          certificate={drawer.certificate}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function CertificateToolbar({ filters }: { filters: Filters }) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Diterbitkan', value: 'ISSUED' as const },
    { label: 'Dicabut', value: 'REVOKED' as const },
  ];
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((s) => ({
            label: s.label,
            href: certificateHref({
              ...filters,
              status: s.value,
              page: 1,
            }),
            active: filters.status === s.value || (!filters.status && !s.value),
          }))}
        />
      }
    >
      <span className="text-sm text-slate-500">
        Filter berdasarkan status sertifikat. Sertifikat dicabut tetap tersimpan sebagai bukti penerbitan.
      </span>
    </FilterToolbar>
  );
}

function CertificateTable({
  certificates,
  onDetail,
}: {
  certificates: Certificate[];
  onDetail: (c: Certificate) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Nomor sertifikat' },
        { label: 'Pemegang' },
        { label: 'Program' },
        { label: 'Status' },
        { label: 'Diterbitkan' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={['10rem', '1fr', '1fr', '6rem', '9rem', '6rem']}
      mobile={certificates.map((c) => (
        <CertificateCard key={c.id} certificate={c} onDetail={() => onDetail(c)} />
      ))}
    >
      {certificates.map((c) => (
        <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
          <td className="px-4 py-3">
            <p className="font-mono text-xs font-semibold text-slate-950">
              {c.certificateNumber}
            </p>
          </td>
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-950">{c.holderName}</p>
            <p className="mt-0.5 text-xs text-slate-500">{c.batchName}</p>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600">{c.programName}</td>
          <td className="px-4 py-3">
            <StatusBadge tone={certificateStatusTone(c.status)}>
              {certificateStatusLabel(c.status)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm text-slate-500">
            {formatDate(c.issuedAt)}
          </td>
          <StickyActionCell>
            <CertificateActions
              certificate={c}
              onDetail={() => onDetail(c)}
            />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function CertificateCard({
  certificate,
  onDetail,
}: {
  certificate: Certificate;
  onDetail: () => void;
}) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-950">{certificate.holderName}</p>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {certificate.certificateNumber}
          </p>
        </div>
        <StatusBadge tone={certificateStatusTone(certificate.status)}>
          {certificateStatusLabel(certificate.status)}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Program</p>
          <p className="mt-0.5 text-slate-700">{certificate.programName}</p>
        </div>
        <div>
          <p className="text-slate-400">Diterbitkan</p>
          <p className="mt-0.5 text-slate-700">
            {formatDate(certificate.issuedAt)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <ActionButton onClick={onDetail}>Detail</ActionButton>
        <CertificateActions certificate={certificate} onDetail={onDetail} />
      </div>
    </div>
  );
}

function CertificateActions({
  certificate,
  onDetail,
}: {
  certificate: Certificate;
  onDetail: () => void;
}) {
  return (
    <ActionGroup>
      <ActionButton onClick={onDetail}>Detail</ActionButton>
      <RevokeCertificateAction certificate={certificate} />
    </ActionGroup>
  );
}

function RevokeCertificateAction({ certificate }: { certificate: Certificate }) {
  const [, action, isPending] = useActionState(
    revokeCertificateAction,
    { ok: true, message: null },
  );
  if (certificate.status !== 'ISSUED') return null;
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm('Cabut sertifikat ini? Sertifikat akan ditandai tidak valid untuk verifikasi publik.'))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={certificate.id} />
      <input type="hidden" name="reason" value="Dicabut oleh operator" />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {isPending ? 'Memproses...' : 'Revoke'}
      </button>
    </form>
  );
}

function CertificateDetailDrawer({
  certificate,
  onClose,
}: {
  certificate: Certificate;
  onClose: () => void;
}) {
  return (
    <EnterpriseDrawer
      eyebrow="Sertifikat / Detail"
      title={certificate.holderName}
      description={certificate.certificateNumber}
      onClose={onClose}
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
            Informasi sertifikat
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Nomor sertifikat</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-950 break-all">
                  {certificate.certificateNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <StatusBadge tone={certificateStatusTone(certificate.status)}>
                  {certificateStatusLabel(certificate.status)}
                </StatusBadge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Pemegang</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {certificate.holderName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Diterbitkan</p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDateTime(certificate.issuedAt)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Program</p>
                <p className="mt-1 text-sm text-slate-700">
                  {certificate.programName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Angkatan</p>
                <p className="mt-1 text-sm text-slate-700">
                  {certificate.batchName}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Template</p>
              <p className="mt-1 text-sm text-slate-700">
                {certificate.templateName}{' '}
                <span className="text-slate-400">
                  (v{certificate.templateVersion})
                </span>
              </p>
            </div>
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

function certificateHref({
  status,
  page,
  limit,
}: {
  status?: CertificateStatus;
  page: number;
  limit: number;
}): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/sertifikat?${params.toString()}`;
}