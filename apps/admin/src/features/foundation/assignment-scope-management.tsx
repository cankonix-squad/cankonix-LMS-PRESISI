'use client';

import type {
  ApiListResponse,
  Person,
  Role,
  RoleAssignment,
  UserAccount,
} from '@lms/api-client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { DataTable, StatusBadge } from '@/components/admin-design-system';
import { EmptyState, ErrorState } from '@/components/data-state';
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
  filters,
}: {
  result: Result<ApiListResponse<RoleAssignment>>;
  roles: Role[];
  accounts: AccountRow[];
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
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Foundation / Authorization
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Assignment & scope
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Kelola assignment role dan batas scope secara operasional. Validasi
            akses tetap berada di backend.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ kind: 'create' })}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
        >
          + Buat assignment
        </button>
      </header>
      <AssignmentToolbar filters={filters} roles={roles} />
      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : items.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Tidak ada assignment yang cocok.
            </p>
            <p className="mt-2">
              Coba ubah pencarian atau filter status, role, dan scope.
            </p>
            <Link
              href="/assignments"
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
          accountMap={accountMap}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </div>
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
    <div className="mx-5 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex flex-wrap gap-2">
        <FilterLink
          label="Semua"
          filters={{ ...filters, status: undefined, page: 1 }}
          active={!filters.status}
        />
        <FilterLink
          label="Aktif"
          filters={{ ...filters, status: 'ACTIVE', page: 1 }}
          active={filters.status === 'ACTIVE'}
        />
        <FilterLink
          label="Nonaktif"
          filters={{ ...filters, status: 'INACTIVE', page: 1 }}
          active={filters.status === 'INACTIVE'}
        />
        <FilterLink
          label="Dicabut"
          filters={{ ...filters, status: 'REVOKED', page: 1 }}
          active={filters.status === 'REVOKED'}
        />
      </div>
      <form
        action="/assignments"
        className="flex w-full flex-wrap gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="roleId" value={filters.roleId ?? ''} />
        <input type="hidden" name="scopeType" value={filters.scopeType ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari user, person, akun, atau role"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-80"
        />
        <button
          type="submit"
          className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          Cari
        </button>
        <Link
          href="/assignments"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700"
        >
          Reset
        </Link>
      </form>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter role"
          defaultValue={filters.roleId ?? ''}
          onChange={(event) => {
            window.location.href = assignmentHref({
              ...filters,
              roleId: event.target.value || undefined,
              page: 1,
            });
          }}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Semua role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter tipe scope"
          defaultValue={filters.scopeType ?? ''}
          onChange={(event) => {
            window.location.href = assignmentHref({
              ...filters,
              scopeType: event.target.value || undefined,
              page: 1,
            });
          }}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Semua scope</option>
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

function FilterLink({
  label,
  filters,
  active,
}: {
  label: string;
  filters: Filters;
  active: boolean;
}) {
  return (
    <Link
      href={assignmentHref(filters)}
      className={
        active
          ? 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white'
          : 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:border-sky-300'
      }
    >
      {label}
    </Link>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <DataTable
          columns={[
            'User / akun',
            'Role',
            'Scope',
            'Status',
            'Diperbarui',
            'Aksi',
          ]}
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
        </DataTable>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {items.map((assignment) => (
          <article key={assignment.id} className="space-y-3 p-4">
            <div className="flex justify-between gap-3">
              <UserCell account={accountMap.get(assignment.userAccountId)} />
              <StatusBadge
                tone={assignment.status === 'ACTIVE' ? 'green' : 'red'}
              >
                {assignment.status}
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
      </div>
    </div>
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
    <tr className="hover:bg-slate-50/80">
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
        <StatusBadge tone={assignment.status === 'ACTIVE' ? 'green' : 'red'}>
          {assignment.status}
        </StatusBadge>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {formatDate(assignment.updatedAt)}
      </td>
      <td className="px-4 py-3">
        <AssignmentActions
          assignment={assignment}
          onDetail={onDetail}
          onScope={onScope}
          onStatus={onStatus}
        />
      </td>
    </tr>
  );
}

function UserCell({ account }: { account?: AccountRow }) {
  return (
    <div>
      <p className="font-semibold text-slate-950">
        {account?.person?.fullName ?? 'UserAccount tidak terpetakan'}
      </p>
      <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
        {account?.account.username ??
          account?.account.email ??
          'Account ID tidak terbaca'}
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
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onDetail(assignment)}
        className="text-xs font-semibold text-sky-700"
      >
        Detail
      </button>
      <button
        type="button"
        onClick={() => onScope(assignment)}
        className="text-xs font-semibold text-sky-700"
      >
        Kelola scope
      </button>
      <button
        type="button"
        onClick={() => onStatus(assignment)}
        className="text-xs font-semibold text-sky-700"
      >
        Status
      </button>
      <button
        type="button"
        disabled
        title="Endpoint edit assignment belum tersedia"
        className="cursor-not-allowed text-xs text-slate-400"
      >
        Edit
      </button>
    </div>
  );
}

function AssignmentDrawer({
  drawer,
  roles,
  accounts,
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
  accountMap: Map<string, AccountRow>;
  onClose: () => void;
}) {
  const assignment = drawer.kind === 'create' ? null : drawer.assignment;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Tutup drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              Assignment & scope
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {drawer.kind === 'create'
                ? 'Buat assignment'
                : drawer.kind === 'detail'
                  ? 'Detail assignment'
                  : drawer.kind === 'scope'
                    ? 'Kelola scope'
                    : 'Ubah status'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Tutup
          </button>
        </div>
        <div className="space-y-5 py-5">
          {drawer.kind === 'create' ? (
            <CreateAssignmentForm roles={roles} accounts={accounts} />
          ) : drawer.kind === 'detail' ? (
            <AssignmentDetail
              assignment={assignment!}
              account={accountMap.get(assignment!.userAccountId)}
            />
          ) : drawer.kind === 'scope' ? (
            <ScopeForm assignment={assignment!} />
          ) : (
            <StatusForm assignment={assignment!} />
          )}
        </div>
      </aside>
    </div>
  );
}

function CreateAssignmentForm({
  roles,
  accounts,
}: {
  roles: Role[];
  accounts: AccountRow[];
}) {
  const [state, action, pending] = useActionState(createRoleAssignmentAction, {
    ok: false,
    message: null,
  });
  return (
    <form action={action} className="space-y-4">
      <SelectField
        label="User / person"
        name="userAccountId"
        options={accounts.map(({ account, person }) => ({
          value: account.id,
          label: `${person?.fullName ?? 'Person tidak terbaca'} — ${account.username ?? account.email ?? account.id}`,
        }))}
      />
      <SelectField
        label="Role"
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
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Berlaku sampai
          <input
            name="validUntil"
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <ScopeFields />
      <FormFooter pending={pending} state={state} label="Simpan assignment" />
    </form>
  );
}
function ScopeForm({ assignment }: { assignment: RoleAssignment }) {
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
        <p className="mb-2 text-sm font-semibold text-slate-950">Scope aktif</p>
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
            <EmptyState>Assignment ini belum memiliki scope.</EmptyState>
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
        <ScopeFields />
        <FormFooter
          pending={addPending}
          state={addState}
          label="Tambah scope"
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
        label="Status assignment"
        name="status"
        options={statuses.map((status) => ({ value: status, label: status }))}
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
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
function ScopeFields() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label="Tipe scope"
        name="scopeType"
        options={scopeTypes.map((scope) => ({ value: scope, label: scope }))}
      />
      <label className="text-sm font-medium text-slate-700">
        Target scope
        <input
          required
          name="scopeId"
          placeholder="UUID target scope"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Daftar target belum tersedia dari kontrak API; masukkan ID target yang
          sudah diverifikasi.
        </span>
      </label>
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
      {state.message ? (
        <p
          className={
            state.ok
              ? 'rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700'
              : 'rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700'
          }
        >
          {state.message}
        </p>
      ) : null}
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
        <Info label="Person">
          {account?.person?.fullName ?? 'Tidak terbaca'}
        </Info>
        <Info label="Akun">
          {account?.account.username ??
            account?.account.email ??
            assignment.userAccountId}
        </Info>
        <Info label="Role">{assignment.role?.name ?? assignment.roleId}</Info>
        <Info label="Status">
          <StatusBadge tone={assignment.status === 'ACTIVE' ? 'green' : 'red'}>
            {assignment.status}
          </StatusBadge>
        </Info>
      </div>
      <Info label="Scope aktif">
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
  if (totalPages <= 1 && total <= filters.limit)
    return (
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} assignment</span>
        <RowsPerPage filters={filters} />
      </div>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">
        Halaman {filters.page} dari {totalPages} · {total} assignment
      </span>
      <div className="flex gap-2">
        <Link
          className={
            filters.page <= 1
              ? 'pointer-events-none rounded-md border px-3 py-2 text-slate-400'
              : 'rounded-md border px-3 py-2 text-slate-700'
          }
          href={assignmentHref({
            ...filters,
            page: Math.max(1, filters.page - 1),
          })}
        >
          Sebelumnya
        </Link>
        <Link
          className={
            filters.page >= totalPages
              ? 'pointer-events-none rounded-md border px-3 py-2 text-slate-400'
              : 'rounded-md border px-3 py-2 text-slate-700'
          }
          href={assignmentHref({
            ...filters,
            page: Math.min(totalPages, filters.page + 1),
          })}
        >
          Berikutnya
        </Link>
      </div>
      <RowsPerPage filters={filters} />
    </div>
  );
}
function RowsPerPage({ filters }: { filters: Filters }) {
  return (
    <select
      aria-label="Baris per halaman"
      defaultValue={String(filters.limit)}
      onChange={(event) => {
        window.location.href = assignmentHref({
          ...filters,
          limit: Number(event.target.value),
          page: 1,
        });
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
    >
      <option value="10">10 baris</option>
      <option value="25">25 baris</option>
      <option value="50">50 baris</option>
    </select>
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
  return `/assignments?${params.toString()}`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
