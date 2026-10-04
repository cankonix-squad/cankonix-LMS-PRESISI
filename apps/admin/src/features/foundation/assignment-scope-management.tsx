'use client';

import type {
  ApiListResponse,
  Organization,
  Person,
  Role,
  RoleAssignment,
  UserAccount,
} from '@lms/api-client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
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
  PageHeader,
  PaginationBar,
  PrimaryActionButton,
  StatusBadge,
  StickyActionCell,
  enterpriseInputClass,
} from '@/components/admin';
import {
  assignmentStatusLabel,
  assignmentStatusTone,
} from './display';
import {
  addAssignmentScopeAction,
  createRoleAssignmentAction,
  removeAssignmentScopeAction,
  updateAssignmentStatusAction,
} from './actions';

type Result<T> = { data: T | null; error: string | null };
type Filters = {
  search?: string;
  status?: RoleAssignment['status'];
  roleId?: string;
  scopeType?: string;
  page: number;
  limit: number;
};
type AccountRow = { account: UserAccount; person: Person | null };
const scopeTypes = [
  'ORGANIZATION',
  'PROGRAM',
  'BATCH',
  'CLASS',
  'CLASS_SUBJECT',
] as const;
const statuses = ['ACTIVE', 'INACTIVE', 'REVOKED'] as const;

export function AssignmentWorkspace({
  result,
  roles,
  accounts,
  organizations,
  filters,
}: {
  result: Result<ApiListResponse<RoleAssignment>>;
  roles: Role[];
  accounts: AccountRow[];
  organizations: Organization[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<
    | { kind: 'create' }
    | { kind: 'detail'; assignment: RoleAssignment }
    | { kind: 'scope'; assignment: RoleAssignment }
    | { kind: 'status'; assignment: RoleAssignment }
    | null
  >(null);
  const accountMap = useMemo(
    () => new Map(accounts.map((row) => [row.account.id, row])),
    [accounts],
  );
  const allItems = result.data?.data ?? [];
  const filtered = allItems.filter((assignment) => {
    const row = accountMap.get(assignment.userAccountId);
    const search = filters.search?.toLowerCase();
    const haystack = [
      row?.person?.fullName,
      row?.person?.personnelNumber,
      row?.account.username,
      row?.account.email,
      assignment.role?.name,
      assignment.role?.code,
      assignment.userAccountId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (
      (!search || haystack.includes(search)) &&
      (!filters.roleId || assignment.roleId === filters.roleId) &&
      (!filters.scopeType ||
        assignment.scopes.some(
          (scope) => scope.scopeType === filters.scopeType,
        ))
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / filters.limit));
  const page = Math.min(filters.page, totalPages);
  const items = filtered.slice(
    (page - 1) * filters.limit,
    page * filters.limit,
  );

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Manajemen Akses / Penugasan"
        title="Penugasan & Cakupan"
        description="Kelola penugasan peran dan batas cakupan kewenangan secara operasional. Validasi akses tetap berada di backend."
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ kind: 'create' })}>
            + Buat assignment
          </PrimaryActionButton>
        }
      />
      <AssignmentToolbar filters={filters} roles={roles} />
      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : items.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Tidak ada penugasan yang cocok.
            </p>
            <p className="mt-2">
              Coba ubah pencarian atau filter status, peran, dan cakupan.
            </p>
            <Link
              href="/penugasan"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <AssignmentTable
            items={items}
            accountMap={accountMap}
            onDetail={(assignment) => setDrawer({ kind: 'detail', assignment })}
            onScope={(assignment) => setDrawer({ kind: 'scope', assignment })}
            onStatus={(assignment) => setDrawer({ kind: 'status', assignment })}
          />
        )}
        {!result.error ? (
          <Pagination
            filters={{ ...filters, page }}
            total={filtered.length}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      {drawer ? (
        <AssignmentDrawer
          drawer={drawer}
          roles={roles}
          accounts={accounts}
          organizations={organizations}
          accountMap={accountMap}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function AssignmentToolbar({
  filters,
  roles,
}: {
  filters: Filters;
  roles: Role[];
}) {
  return (
    <div className="mx-5 space-y-3">
      <FilterToolbar
        label="Filter penugasan"
        filters={
          <FilterTabs
            tabs={[
              {
                label: 'Semua',
                href: assignmentHref({
                  ...filters,
                  status: undefined,
                  page: 1,
                }),
                active: !filters.status,
              },
              {
                label: 'Aktif',
                href: assignmentHref({ ...filters, status: 'ACTIVE', page: 1 }),
                active: filters.status === 'ACTIVE',
              },
              {
                label: 'Nonaktif',
                href: assignmentHref({
                  ...filters,
                  status: 'INACTIVE',
                  page: 1,
                }),
                active: filters.status === 'INACTIVE',
              },
              {
                label: 'Dicabut',
                href: assignmentHref({
                  ...filters,
                  status: 'REVOKED',
                  page: 1,
                }),
                active: filters.status === 'REVOKED',
              },
            ]}
          />
        }
      >
        <form
          action="/penugasan"
          className="flex w-full flex-wrap gap-2 xl:w-auto"
        >
          <input type="hidden" name="status" value={filters.status ?? ''} />
          <input type="hidden" name="roleId" value={filters.roleId ?? ''} />
          <input
            type="hidden"
            name="scopeType"
            value={filters.scopeType ?? ''}
          />
          <input type="hidden" name="limit" value={filters.limit} />
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder="Cari akun pengguna, data individu, atau peran"
            className={`${enterpriseInputClass} sm:w-80`}
          />
          <button
            type="submit"
            className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Cari
          </button>
          <Link
            href="/penugasan"
            className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700"
          >
            Reset
          </Link>
        </form>
      </FilterToolbar>
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <select
          aria-label="Filter peran"
          defaultValue={filters.roleId ?? ''}
          onChange={(event) => {
            window.location.href = assignmentHref({
              ...filters,
              roleId: event.target.value || undefined,
              page: 1,
            });
          }}
          className={`${enterpriseInputClass} w-auto`}
        >
          <option value="">Semua peran</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter tipe cakupan"
          defaultValue={filters.scopeType ?? ''}
          onChange={(event) => {
            window.location.href = assignmentHref({
              ...filters,
              scopeType: event.target.value || undefined,
              page: 1,
            });
          }}
          className={`${enterpriseInputClass} w-auto`}
        >
          <option value="">Semua cakupan</option>
          {scopeTypes.map((scope) => (
            <option key={scope} value={scope}>
              {scope}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AssignmentTable({
  items,
  accountMap,
  onDetail,
  onScope,
  onStatus,
}: {
  items: RoleAssignment[];
  accountMap: Map<string, AccountRow>;
  onDetail: (assignment: RoleAssignment) => void;
  onScope: (assignment: RoleAssignment) => void;
  onStatus: (assignment: RoleAssignment) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Akun Pengguna' },
        { label: 'Peran' },
        { label: 'Cakupan' },
        { label: 'Status' },
        { label: 'Diperbarui' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={['22%', '18%', '20%', '12%', '14%', '14%']}
      minWidth={1100}
      mobile={
        <>
          {items.map((assignment) => (
            <article key={assignment.id} className="space-y-3 p-4">
              <div className="flex justify-between gap-3">
                <UserCell account={accountMap.get(assignment.userAccountId)} />
                <StatusBadge
                  tone={assignmentStatusTone(assignment.status)}
                >
                  {assignmentStatusLabel(assignment.status)}
                </StatusBadge>
              </div>
              <p className="font-semibold text-slate-900">
                {assignment.role?.name ?? assignment.roleId}
              </p>
              <ScopeBadges assignment={assignment} />
              <AssignmentActions
                assignment={assignment}
                onDetail={onDetail}
                onScope={onScope}
                onStatus={onStatus}
              />
            </article>
          ))}
        </>
      }
    >
      {items.map((assignment) => (
        <AssignmentRow
          key={assignment.id}
          assignment={assignment}
          account={accountMap.get(assignment.userAccountId)}
          onDetail={onDetail}
          onScope={onScope}
          onStatus={onStatus}
        />
      ))}
    </EnterpriseTable>
  );
}

function AssignmentRow({
  assignment,
  account,
  onDetail,
  onScope,
  onStatus,
}: {
  assignment: RoleAssignment;
  account?: AccountRow;
  onDetail: (assignment: RoleAssignment) => void;
  onScope: (assignment: RoleAssignment) => void;
  onStatus: (assignment: RoleAssignment) => void;
}) {
  return (
    <tr className="group hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <UserCell account={account} />
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-950">
          {assignment.role?.name ?? assignment.roleId}
        </p>
        <p className="text-xs text-slate-500">{assignment.role?.code ?? '-'}</p>
      </td>
      <td className="px-4 py-3">
        <ScopeBadges assignment={assignment} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge tone={assignmentStatusTone(assignment.status)}>
          {assignmentStatusLabel(assignment.status)}
        </StatusBadge>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {formatDate(assignment.updatedAt)}
      </td>
      <StickyActionCell>
        <AssignmentActions
          assignment={assignment}
          onDetail={onDetail}
          onScope={onScope}
          onStatus={onStatus}
        />
      </StickyActionCell>
    </tr>
  );
}

function UserCell({ account }: { account?: AccountRow }) {
  return (
    <div>
      <p className="font-semibold text-slate-950">
        {account?.person?.fullName ?? 'Akun pengguna tidak terpetakan'}
      </p>
      <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
        {account?.account.username ??
          account?.account.email ??
          'ID akun tidak terbaca'}
      </p>
    </div>
  );
}
function ScopeBadges({ assignment }: { assignment: RoleAssignment }) {
  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {assignment.scopes.length ? (
        assignment.scopes.map((scope) => (
          <StatusBadge key={scope.id} tone="blue">
            {scope.scopeType}
          </StatusBadge>
        ))
      ) : (
        <span className="text-xs text-slate-500">Tanpa scope</span>
      )}
    </div>
  );
}
function AssignmentActions({
  assignment,
  onDetail,
  onScope,
  onStatus,
}: {
  assignment: RoleAssignment;
  onDetail: (assignment: RoleAssignment) => void;
  onScope: (assignment: RoleAssignment) => void;
  onStatus: (assignment: RoleAssignment) => void;
}) {
  return (
    <ActionGroup>
      <ActionButton onClick={() => onDetail(assignment)}>Detail</ActionButton>
      <ActionButton onClick={() => onScope(assignment)}>
        Kelola scope
      </ActionButton>
      <ActionButton onClick={() => onStatus(assignment)}>Status</ActionButton>
      <ActionButton disabled title="Ubah penugasan belum tersedia">
        Edit
      </ActionButton>
    </ActionGroup>
  );
}

function AssignmentDrawer({
  drawer,
  roles,
  accounts,
  organizations,
  accountMap,
  onClose,
}: {
  drawer:
    | { kind: 'create' }
    | { kind: 'detail'; assignment: RoleAssignment }
    | { kind: 'scope'; assignment: RoleAssignment }
    | { kind: 'status'; assignment: RoleAssignment };
  roles: Role[];
  accounts: AccountRow[];
  organizations: Organization[];
  accountMap: Map<string, AccountRow>;
  onClose: () => void;
}) {
  const assignment = drawer.kind === 'create' ? null : drawer.assignment;
  return (
    <EnterpriseDrawer
      eyebrow="Penugasan & Cakupan"
      title={
        drawer.kind === 'create'
          ? 'Buat penugasan'
          : drawer.kind === 'detail'
            ? 'Detail penugasan'
            : drawer.kind === 'scope'
              ? 'Kelola cakupan'
              : 'Ubah status'
      }
      description="Penugasan peran dan cakupan efektif tetap divalidasi oleh backend."
      onClose={onClose}
    >
      <div className="space-y-5">
        {drawer.kind === 'create' ? (
          <CreateAssignmentForm
            roles={roles}
            accounts={accounts}
            organizations={organizations}
          />
        ) : drawer.kind === 'detail' ? (
          <AssignmentDetail
            assignment={assignment!}
            account={accountMap.get(assignment!.userAccountId)}
          />
        ) : drawer.kind === 'scope' ? (
          <ScopeForm assignment={assignment!} organizations={organizations} />
        ) : (
          <StatusForm assignment={assignment!} />
        )}
      </div>
    </EnterpriseDrawer>
  );
}

function CreateAssignmentForm({
  roles,
  accounts,
  organizations,
}: {
  roles: Role[];
  accounts: AccountRow[];
  organizations: Organization[];
}) {
  const [state, action, pending] = useActionState(createRoleAssignmentAction, {
    ok: false,
    message: null,
  });
  return (
    <form action={action} className="space-y-4">
      <SelectField
        label="Akun pengguna / data individu"
        name="userAccountId"
        options={accounts.map(({ account, person }) => ({
          value: account.id,
          label: `${person?.fullName ?? 'Data individu tidak terbaca'} — ${account.username ?? account.email ?? account.id}`,
        }))}
      />
      <SelectField
        label="Peran"
        name="roleId"
        options={roles
          .filter((role) => role.status === 'ACTIVE')
          .map((role) => ({
            value: role.id,
            label: `${role.name} (${role.code})`,
          }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Berlaku mulai
          <input
            name="validFrom"
            type="datetime-local"
            className={enterpriseInputClass}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Berlaku sampai
          <input
            name="validUntil"
            type="datetime-local"
            className={enterpriseInputClass}
          />
        </label>
      </div>
      <ScopeFields organizations={organizations} />
      <FormFooter pending={pending} state={state} label="Simpan Penugasan" />
    </form>
  );
}
function ScopeForm({
  assignment,
  organizations,
}: {
  assignment: RoleAssignment;
  organizations: Organization[];
}) {
  const [addState, addAction, addPending] = useActionState(
    addAssignmentScopeAction,
    { ok: false, message: null },
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeAssignmentScopeAction,
    { ok: false, message: null },
  );
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-950">Cakupan aktif</p>
        <div className="space-y-2">
          {assignment.scopes.length ? (
            assignment.scopes.map((scope) => (
              <div
                key={scope.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div>
                  <StatusBadge tone="blue">{scope.scopeType}</StatusBadge>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    {scope.scopeId}
                  </p>
                </div>
                <form action={removeAction}>
                  <input
                    type="hidden"
                    name="assignmentId"
                    value={assignment.id}
                  />
                  <input type="hidden" name="scopeRecordId" value={scope.id} />
                  <button
                    type="submit"
                    disabled={removePending}
                    className="text-xs font-semibold text-rose-700 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </form>
              </div>
            ))
          ) : (
            <EmptyState>Penugasan ini belum memiliki cakupan.</EmptyState>
          )}
        </div>
        {removeState.message ? (
          <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {removeState.message}
          </p>
        ) : null}
      </div>
      <form
        action={addAction}
        className="space-y-3 border-t border-slate-200 pt-5"
      >
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <ScopeFields organizations={organizations} />
        <FormFooter
          pending={addPending}
          state={addState}
          label="Tambah cakupan"
        />
      </form>
    </div>
  );
}
function StatusForm({ assignment }: { assignment: RoleAssignment }) {
  const [state, action, pending] = useActionState(
    updateAssignmentStatusAction,
    { ok: false, message: null },
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <SelectField
        label="Status penugasan"
        name="status"
        options={statuses.map((status) => ({
          value: status,
          label: assignmentStatusLabel(status),
        }))}
        defaultValue={assignment.status}
      />
      <FormFooter pending={pending} state={state} label="Simpan status" />
    </form>
  );
}
function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        required
        name={name}
        defaultValue={defaultValue}
        className={enterpriseInputClass}
      >
        <option value="">Pilih {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function ScopeFields({ organizations }: { organizations: Organization[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="scopeType" value="ORGANIZATION" />
      <SelectField
        label="Organisasi"
        name="scopeId"
        options={organizations.map((organization) => ({
          value: organization.id,
          label: `${organization.name} (${organization.code})`,
        }))}
      />
    </div>
  );
}
function FormFooter({
  pending,
  state,
  label,
}: {
  pending: boolean;
  state: { ok: boolean; message: string | null };
  label: string;
}) {
  return (
    <div className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Menyimpan...' : label}
      </button>
      <ActionMessage state={state} />
    </div>
  );
}
function AssignmentDetail({
  assignment,
  account,
}: {
  assignment: RoleAssignment;
  account?: AccountRow;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Data Individu">
          {account?.person?.fullName ?? 'Tidak terbaca'}
        </Info>
        <Info label="Akun Pengguna">
          {account?.account.username ??
            account?.account.email ??
            assignment.userAccountId}
        </Info>
        <Info label="Peran">{assignment.role?.name ?? assignment.roleId}</Info>
        <Info label="Status">
          <StatusBadge tone={assignmentStatusTone(assignment.status)}>
            {assignmentStatusLabel(assignment.status)}
          </StatusBadge>
        </Info>
      </div>
      <Info label="Cakupan aktif">
        <div className="space-y-2">
          {assignment.scopes.length ? (
            assignment.scopes.map((scope) => (
              <div
                key={scope.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <StatusBadge tone="blue">{scope.scopeType}</StatusBadge>
                <p className="mt-1 font-mono text-xs text-slate-600">
                  {scope.scopeId}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Tanpa scope.</p>
          )}
        </div>
      </Info>
      <Info label="Informasi pencatatan">
        <p className="text-sm text-slate-600">
          Diperbarui {formatDate(assignment.updatedAt)} · Dibuat{' '}
          {formatDate(assignment.createdAt)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Audit perubahan tetap dicatat dan ditegakkan oleh backend.
        </p>
      </Info>
    </div>
  );
}
function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}
function Pagination({
  filters,
  total,
  totalPages,
}: {
  filters: Filters;
  total: number;
  totalPages: number;
}) {
  return (
    <PaginationBar
      page={filters.page}
      limit={filters.limit}
      total={total}
      totalPages={totalPages}
      itemLabel="penugasan"
      hrefFor={({ page, limit }) => assignmentHref({ ...filters, page, limit })}
    />
  );
}
function assignmentHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.roleId) params.set('roleId', filters.roleId);
  if (filters.scopeType) params.set('scopeType', filters.scopeType);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return `/penugasan?${params.toString()}`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
