'use client';

import type {
  GraduationDecision,
  GraduationDecisionList,
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
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
import {
  approveGraduationDecisionAction,
  revokeGraduationDecisionAction,
} from './graduation-actions';
import {
  decisionOutcomeLabel,
  decisionOutcomeTone,
  decisionStatusLabel,
  decisionStatusTone,
} from './graduation-labels';

type Filters = {
  status?: GraduationDecisionStatus;
  decision?: GraduationDecisionOutcome;
  page: number;
  limit: number;
};

type Result = {
  data: GraduationDecisionList | null;
  error: string | null;
};

type Drawer = { mode: 'detail'; decision: GraduationDecision } | null;

export function GraduationDecisionWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const decisions = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Kelulusan & Sertifikat / Keputusan Kelulusan"
        title="Keputusan kelulusan"
        description={
          result.error
            ? 'Data keputusan kelulusan belum dapat dimuat.'
            : `${total} keputusan kelulusan ditemukan. Keputusan dicatat dari hasil evaluasi, lalu disetujui sebagai status resmi.`
        }
      />

      <div className="px-5 pt-1">
        <DecisionToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : decisions.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada keputusan kelulusan yang cocok.
            </p>
            <p className="mt-2">
              Keputusan dicatat setelah evaluasi kelulusan dilakukan. Gunakan filter status untuk mempersempit daftar.
            </p>
            <Link
              href="/keputusan-kelulusan"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Reset filter
            </Link>
          </EmptyState>
        ) : (
          <>
            <DecisionTable
              decisions={decisions}
              onDetail={(d) => setDrawer({ mode: 'detail', decision: d })}
            />
            <PaginationBar
              page={filters.page}
              limit={filters.limit}
              total={total}
              totalPages={totalPages}
              itemLabel="keputusan kelulusan"
              hrefFor={(next) =>
                decisionHref({ ...filters, page: next.page, limit: next.limit })
              }
            />
          </>
        )}
      </div>

      {drawer ? (
        <DecisionDetailDrawer
          decision={drawer.decision}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function DecisionToolbar({ filters }: { filters: Filters }) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Draft', value: 'DRAFT' as const },
    { label: 'Disetujui', value: 'APPROVED' as const },
    { label: 'Dicabut', value: 'REVOKED' as const },
  ];
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((s) => ({
            label: s.label,
            href: decisionHref({
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
        action="/keputusan-kelulusan"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <select
          name="decision"
          defaultValue={filters.decision ?? ''}
          aria-label="Filter verdict"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-56"
        >
          <option value="">Semua verdict</option>
          <option value="PASS">Lulus</option>
          <option value="FAIL">Tidak Lulus</option>
          <option value="REMEDIAL">Remedial</option>
          <option value="WITHDRAWN">Mengundurkan Diri</option>
        </select>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Terapkan
        </button>
        <Link
          href="/keputusan-kelulusan"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function DecisionTable({
  decisions,
  onDetail,
}: {
  decisions: GraduationDecision[];
  onDetail: (d: GraduationDecision) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Keputusan' },
        { label: 'Evaluasi' },
        { label: 'Status keputusan' },
        { label: 'Dicatat pada' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={['1fr', '10rem', '8rem', '9rem', '10.5rem']}
      mobile={decisions.map((d) => (
        <DecisionCard key={d.id} decision={d} onDetail={() => onDetail(d)} />
      ))}
    >
      {decisions.map((d) => (
        <tr key={d.id} className="group hover:bg-slate-50 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <StatusBadge tone={decisionOutcomeTone(d.decision)}>
                {decisionOutcomeLabel(d.decision)}
              </StatusBadge>
              {d.note ? (
                <p className="max-w-[14rem] truncate text-xs text-slate-500">
                  {d.note}
                </p>
              ) : null}
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600">
            {d.evaluation
              ? d.evaluation.outcome === 'ELIGIBLE'
                ? 'Lulus'
                : d.evaluation.outcome === 'NOT_ELIGIBLE'
                  ? 'Tidak Lulus'
                  : d.evaluation.outcome
              : `Evaluasi ${d.graduationEvaluationId}`}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={decisionStatusTone(d.status)}>
              {decisionStatusLabel(d.status)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm text-slate-500">
            {formatDate(d.createdAt)}
          </td>
          <StickyActionCell>
            <DecisionActions decision={d} onDetail={() => onDetail(d)} />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function DecisionCard({
  decision,
  onDetail,
}: {
  decision: GraduationDecision;
  onDetail: () => void;
}) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <StatusBadge tone={decisionOutcomeTone(decision.decision)}>
          {decisionOutcomeLabel(decision.decision)}
        </StatusBadge>
        <StatusBadge tone={decisionStatusTone(decision.status)}>
          {decisionStatusLabel(decision.status)}
        </StatusBadge>
      </div>
      {decision.note ? (
        <p className="text-xs text-slate-500">{decision.note}</p>
      ) : null}
      <p className="text-xs text-slate-500">
        {formatDate(decision.createdAt)}
      </p>
      <div className="flex gap-2">
        <ActionButton onClick={onDetail}>Detail</ActionButton>
        <DecisionActions decision={decision} onDetail={onDetail} />
      </div>
    </div>
  );
}

function DecisionActions({
  decision,
  onDetail,
}: {
  decision: GraduationDecision;
  onDetail: () => void;
}) {
  return (
    <ActionGroup>
      <ActionButton onClick={onDetail}>Detail</ActionButton>
      <ApproveAction decision={decision} />
      <RevokeAction decision={decision} />
    </ActionGroup>
  );
}

function ApproveAction({ decision }: { decision: GraduationDecision }) {
  const [, action, isPending] = useActionState(
    approveGraduationDecisionAction,
    { ok: true, message: null },
  );
  if (decision.status !== 'DRAFT') return null;
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm('Setujui keputusan kelulusan ini? Keputusan akan berlaku resmi.'))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={decision.id} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
      >
        {isPending ? 'Memproses...' : 'Approve'}
      </button>
    </form>
  );
}

function RevokeAction({ decision }: { decision: GraduationDecision }) {
  const [, action, isPending] = useActionState(
    revokeGraduationDecisionAction,
    { ok: true, message: null },
  );
  if (decision.status !== 'APPROVED') return null;
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm('Cabut keputusan kelulusan ini? Status peserta akan kembali ke belum lulus.'))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={decision.id} />
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

function DecisionDetailDrawer({
  decision,
  onClose,
}: {
  decision: GraduationDecision;
  onClose: () => void;
}) {
  return (
    <EnterpriseDrawer
      eyebrow="Keputusan Kelulusan / Detail"
      title={decisionOutcomeLabel(decision.decision)}
      description={`Status: ${decisionStatusLabel(decision.status)}`}
      onClose={onClose}
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
            Informasi keputusan
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Verdict</p>
              <StatusBadge tone={decisionOutcomeTone(decision.decision)}>
                {decisionOutcomeLabel(decision.decision)}
              </StatusBadge>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <StatusBadge tone={decisionStatusTone(decision.status)}>
                {decisionStatusLabel(decision.status)}
              </StatusBadge>
            </div>
            {decision.note ? (
              <div>
                <p className="text-xs text-slate-500">Catatan</p>
                <p className="mt-1 text-sm text-slate-700">{decision.note}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Dicatat</p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDateTime(decision.createdAt)}
                </p>
              </div>
              {decision.approvedAt ? (
                <div>
                  <p className="text-xs text-slate-500">Disetujui</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatDateTime(decision.approvedAt)}
                  </p>
                </div>
              ) : null}
            </div>
            {decision.revokedReason ? (
              <div>
                <p className="text-xs text-slate-500">Alasan pencabutan</p>
                <p className="mt-1 text-sm text-rose-700">
                  {decision.revokedReason}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {decision.evaluation ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
              Evaluasi pendukung
            </h3>
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500">Outcome evaluasi</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {decision.evaluation.outcome}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dievaluasi pada</p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDateTime(decision.evaluation.evaluatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Snapshot</p>
                <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 font-mono">
                  {JSON.stringify(decision.evaluation.snapshot, null, 2)}
                </pre>
              </div>
            </div>
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

function decisionHref({
  status,
  decision: outcome,
  page,
  limit,
}: {
  status?: GraduationDecisionStatus;
  decision?: GraduationDecisionOutcome;
  page: number;
  limit: number;
}): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (outcome) params.set('decision', outcome);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `/keputusan-kelulusan?${params.toString()}`;
}