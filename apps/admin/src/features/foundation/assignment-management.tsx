'use client';

import type { Role, RoleAssignment, UserAccount } from '@lms/api-client';
import { useActionState } from 'react';
import {
  addAssignmentScopeAction,
  createRoleAssignmentAction,
  removeAssignmentScopeAction,
  updateAssignmentStatusAction,
} from './actions';

const scopeTypes = [
  'ORGANIZATION',
  'PROGRAM',
  'BATCH',
  'CLASS',
  'CLASS_SUBJECT',
] as const;

const assignmentStatuses = ['ACTIVE', 'INACTIVE', 'REVOKED'] as const;

export function AssignmentManagement({
  roles,
  accounts,
  assignments,
}: {
  roles: Role[];
  accounts: UserAccount[];
  assignments: RoleAssignment[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createRoleAssignmentAction,
    { ok: false, message: null },
  );
  const [scopeState, scopeAction, scopePending] = useActionState(
    addAssignmentScopeAction,
    { ok: false, message: null },
  );
  const [statusState, statusAction, statusPending] = useActionState(
    updateAssignmentStatusAction,
    { ok: false, message: null },
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeAssignmentScopeAction,
    { ok: false, message: null },
  );

  return (
    <div className="space-y-5">
      <form
        action={createAction}
        className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 md:grid-cols-2"
      >
        <label className="text-sm text-slate-300">
          UserAccount
          <select
            name="userAccountId"
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          >
            <option value="">Pilih UserAccount</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.username ?? account.email ?? account.id}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Role
          <select
            name="roleId"
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          >
            <option value="">Pilih role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} ({role.code})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Berlaku mulai
          <input
            name="validFrom"
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </label>
        <label className="text-sm text-slate-300">
          Berlaku sampai
          <input
            name="validUntil"
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </label>
        <ScopeFields />
        <ActionFooter
          pending={createPending}
          message={createState.message}
          ok={createState.ok}
          submitLabel="Buat assignment"
          pendingLabel="Membuat..."
        />
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          action={scopeAction}
          className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4"
        >
          <AssignmentSelect assignments={assignments} />
          <ScopeFields />
          <ActionFooter
            pending={scopePending}
            message={scopeState.message}
            ok={scopeState.ok}
            submitLabel="Tambah scope"
            pendingLabel="Menambah..."
          />
        </form>

        <form
          action={statusAction}
          className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4"
        >
          <AssignmentSelect assignments={assignments} />
          <label className="text-sm text-slate-300">
            Status
            <select
              name="status"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              {assignmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <ActionFooter
            pending={statusPending}
            message={statusState.message}
            ok={statusState.ok}
            submitLabel="Ubah status"
            pendingLabel="Mengubah..."
          />
        </form>
      </div>

      <form
        action={removeAction}
        className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <AssignmentSelect assignments={assignments} />
        <label className="text-sm text-slate-300">
          Scope
          <select
            name="scopeRecordId"
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          >
            <option value="">Pilih scope</option>
            {assignments.flatMap((assignment) =>
              assignment.scopes.map((scope) => (
                <option key={scope.id} value={scope.id}>
                  {assignment.role?.name ?? assignment.roleId} -{' '}
                  {scope.scopeType}: {scope.scopeId}
                </option>
              )),
            )}
          </select>
        </label>
        <ActionFooter
          pending={removePending}
          message={removeState.message}
          ok={removeState.ok}
          submitLabel="Hapus scope"
          pendingLabel="Menghapus..."
        />
      </form>
    </div>
  );
}

function AssignmentSelect({ assignments }: { assignments: RoleAssignment[] }) {
  return (
    <label className="text-sm text-slate-300">
      Assignment
      <select
        name="assignmentId"
        required
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
      >
        <option value="">Pilih assignment</option>
        {assignments.map((assignment) => (
          <option key={assignment.id} value={assignment.id}>
            {assignment.role?.name ?? assignment.roleId} -{' '}
            {assignment.userAccountId}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScopeFields() {
  return (
    <>
      <label className="text-sm text-slate-300">
        Scope type
        <select
          name="scopeType"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        >
          <option value="">Tanpa scope</option>
          {scopeTypes.map((scopeType) => (
            <option key={scopeType} value={scopeType}>
              {scopeType}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-300">
        Scope ID
        <input
          name="scopeId"
          placeholder="UUID organisasi/program/batch/class"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
    </>
  );
}

function ActionFooter({
  pending,
  message,
  ok,
  submitLabel,
  pendingLabel,
}: {
  pending: boolean;
  message: string | null;
  ok: boolean;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
      <p className="text-xs leading-5 text-slate-500">
        Scope kosong berarti assignment tidak dibatasi oleh scope pada baris
        tersebut. Backend tetap memvalidasi target scope.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
      {message ? (
        <p
          className={
            ok
              ? 'md:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'
              : 'md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100'
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
