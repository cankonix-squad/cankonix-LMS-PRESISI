'use client';

import type {
  Assessment,
  AssessmentList,
  AssessmentType,
  ClassSubject,
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
  changeAssessmentStatusAction,
  createAssessmentAction,
  updateAssessmentAction,
} from './assessment-actions';
import { statusLabel, statusBadgeTone } from './assessment-labels';

type Filters = {
  search?: string;
  status?: Assessment['status'];
  assessmentTypeId?: string;
  page: number;
  limit: number;
};
type Result = {
  data: AssessmentList | null;
  error: string | null;
};
type Drawer =
  | { mode: 'create' }
  | { mode: 'edit'; assessment: Assessment }
  | null;

export function AssessmentWorkspace({
  result,
  assessmentTypes,
  classSubjects,
  filters,
}: {
  result: Result;
  assessmentTypes: AssessmentType[];
  classSubjects: ClassSubject[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const assessments = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const typeNames = new Map(assessmentTypes.map((t) => [t.id, t.name]));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Ujian & Penilaian / Assessment"
        title="Kelola assessment kelas"
        description={
          result.error
            ? 'Data assessment belum dapat dimuat.'
            : `${total} assessment ditemukan. Gunakan filter untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Tambah assessment
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <AssessmentToolbar
          filters={filters}
          assessmentTypes={assessmentTypes}
        />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : assessments.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada assessment yang cocok.
            </p>
            <p className="mt-2">
              Assessment dikaitkan dengan class subject. Coba ubah pencarian atau filter status.
            </p>
            <Link
              href="/assessment"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <AssessmentTable
            assessments={assessments}
            typeNames={typeNames}
            onEdit={(assessment) => setDrawer({ mode: 'edit', assessment })}
          />
        )}
        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="assessment"
            hrefFor={({ page, limit }) =>
              assessmentHref({ ...filters, page, limit })
            }
          />
        ) : null}
      </div>

      {drawer ? (
        <AssessmentDrawer
          drawer={drawer}
          assessmentTypes={assessmentTypes}
          classSubjects={classSubjects}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function AssessmentToolbar({
  filters,
  assessmentTypes,
}: {
  filters: Filters;
  assessmentTypes: AssessmentType[];
}) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Draft', value: 'DRAFT' as const },
    { label: 'Dipublikasikan', value: 'PUBLISHED' as const },
    { label: 'Ditutup', value: 'CLOSED' as const },
    { label: 'Diarsipkan', value: 'ARCHIVED' as const },
  ];
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((s) => ({
            label: s.label,
            href: assessmentHref({
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
        action="/assessment"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <select
          name="assessmentTypeId"
          defaultValue={filters.assessmentTypeId ?? ''}
          aria-label="Filter tipe assessment"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-56"
        >
          <option value="">Semua tipe</option>
          {assessmentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} ({type.code})
            </option>
          ))}
        </select>
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari judul assessment"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/assessment"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function AssessmentTable({
  assessments,
  typeNames,
  onEdit,
}: {
  assessments: Assessment[];
  typeNames: Map<string, string>;
  onEdit: (assessment: Assessment) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Judul' },
        { label: 'Tipe' },
        { label: 'Skor maksimal' },
        { label: 'Status' },
        { label: 'Diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={880}
      colWidths={['28%', '14%', '12%', '14%', '18%', '14%']}
      mobile={
        <>
          {assessments.map((item) => (
            <AssessmentCard
              key={item.id}
              assessment={item}
              typeNames={typeNames}
              onEdit={onEdit}
            />
          ))}
        </>
      }
    >
      {assessments.map((item) => (
        <tr key={item.id} className="group hover:bg-slate-50/80">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-950">{item.title}</p>
            {item.description ? (
              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                {item.description}
              </p>
            ) : null}
          </td>
          <td className="px-4 py-3 text-slate-600">
            {typeNames.get(item.assessmentTypeId) ?? `Tipe ${item.assessmentTypeId}`}
          </td>
          <td className="px-4 py-3 font-medium text-slate-700">
            {item.maxScore}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={statusBadgeTone(item.status)}>
              {statusLabel(item.status)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-slate-600">
            {formatDate(item.updatedAt)}
          </td>
          <StickyActionCell>
            <AssessmentActions
              assessment={item}
              onEdit={() => onEdit(item)}
            />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function AssessmentCard({
  assessment,
  typeNames,
  onEdit,
}: {
  assessment: Assessment;
  typeNames: Map<string, string>;
  onEdit: (assessment: Assessment) => void;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">
            {assessment.title}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {typeNames.get(assessment.assessmentTypeId) ?? 'Tidak terbaca'}
          </p>
        </div>
        <StatusBadge tone={statusBadgeTone(assessment.status)}>
          {statusLabel(assessment.status)}
        </StatusBadge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Skor maks.</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {assessment.maxScore}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Diubah</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(assessment.updatedAt)}
          </dd>
        </div>
      </dl>
      <AssessmentActions
        assessment={assessment}
        onEdit={() => onEdit(assessment)}
      />
    </article>
  );
}

function AssessmentActions({
  assessment,
  onEdit,
}: {
  assessment: Assessment;
  onEdit: () => void;
}) {
  const [state, action, isPending] = useActionState(
    changeAssessmentStatusAction,
    { ok: false, message: null },
  );
  const lifecycleActions: { label: string; status: Assessment['status']; tone: 'default' | 'warning' }[] = [];
  switch (assessment.status) {
    case 'DRAFT':
      lifecycleActions.push({ label: 'Publikasikan', status: 'PUBLISHED', tone: 'default' });
      break;
    case 'PUBLISHED':
      lifecycleActions.push({ label: 'Tutup', status: 'CLOSED', tone: 'warning' });
      lifecycleActions.push({ label: 'Kembali Draft', status: 'DRAFT', tone: 'warning' });
      break;
    case 'CLOSED':
      lifecycleActions.push({ label: 'Arsipkan', status: 'ARCHIVED', tone: 'warning' });
      break;
    default:
      break;
  }
  return (
    <div className="flex flex-col gap-2">
      <ActionGroup>
        <ActionButton onClick={onEdit}>Edit</ActionButton>
        {lifecycleActions.map((act) => (
          <form
            key={act.status}
            action={action}
            onSubmit={(event) => {
              if (
                act.status !== 'PUBLISHED' &&
                !window.confirm(
                  `Ubah status assessment menjadi ${statusLabel(act.status)}?`,
                )
              )
                event.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={assessment.id} />
            <input type="hidden" name="status" value={act.status} />
            <button
              type="submit"
              disabled={isPending}
              className={`inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-semibold transition disabled:opacity-60 ${
                act.tone === 'warning'
                  ? 'border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-700'
                  : 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              {isPending ? 'Memproses...' : act.label}
            </button>
          </form>
        ))}
      </ActionGroup>
      {state.message ? <ActionMessage state={state} /> : null}
    </div>
  );
}

function AssessmentDrawer({
  drawer,
  assessmentTypes,
  classSubjects,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  assessmentTypes: AssessmentType[];
  classSubjects: ClassSubject[];
  onClose: () => void;
}) {
  const isEdit = drawer.mode === 'edit';
  const assessment = isEdit ? drawer.assessment : null;
  const [state, action, isPending] = useActionState(
    isEdit ? updateAssessmentAction : createAssessmentAction,
    { ok: false, message: null },
  );
  return (
    <EnterpriseDrawer
      eyebrow={isEdit ? 'Ubah data' : 'Tambah data'}
      title={isEdit ? 'Ubah assessment' : 'Tambah assessment'}
      description="Pilih class subject dan tipe assessment, lalu isi judul dan skor maksimal."
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {assessment ? (
          <input type="hidden" name="id" value={assessment.id} />
        ) : null}
        <FormField label="Class subject" required>
          <select
            name="classSubjectId"
            defaultValue={assessment?.classSubjectId ?? ''}
            required
            className={enterpriseInputClass}
          >
            <option value="">Pilih class subject</option>
            {classSubjects.map((cs) => (
              <option key={cs.id} value={cs.id}>
                {cs.displayName ?? cs.code ?? cs.id}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tipe assessment" required>
          <select
            name="assessmentTypeId"
            defaultValue={assessment?.assessmentTypeId ?? ''}
            required
            className={enterpriseInputClass}
          >
            <option value="">Pilih tipe</option>
            {assessmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.code})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Judul" required>
          <input
            name="title"
            defaultValue={assessment?.title ?? ''}
            required
            maxLength={255}
            placeholder="Contoh: Ujian Tengah Semester"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Deskripsi">
          <textarea
            name="description"
            defaultValue={assessment?.description ?? ''}
            rows={3}
            maxLength={1000}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Skor maksimal" required>
          <input
            name="maxScore"
            type="number"
            defaultValue={assessment?.maxScore ?? 100}
            required
            min={1}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Bobot (%)">
          <input
            name="weight"
            type="number"
            min={0}
            max={100}
            defaultValue={assessment?.weight ?? ''}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Tersedia dari">
          <input
            name="availableFrom"
            type="datetime-local"
            defaultValue={
              assessment?.availableFrom
                ? toLocalDatetime(assessment.availableFrom)
                : ''
            }
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Tersedia sampai">
          <input
            name="availableUntil"
            type="datetime-local"
            defaultValue={
              assessment?.availableUntil
                ? toLocalDatetime(assessment.availableUntil)
                : ''
            }
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Status" required>
          <select
            name="status"
            defaultValue={assessment?.status ?? 'DRAFT'}
            className={enterpriseInputClass}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Dipublikasikan</option>
            <option value="CLOSED">Ditutup</option>
            <option value="ARCHIVED">Diarsipkan</option>
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

function assessmentHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.assessmentTypeId)
    params.set('assessmentTypeId', filters.assessmentTypeId);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/assessment?${query}` : '/assessment';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}