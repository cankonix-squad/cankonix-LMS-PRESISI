'use client';

import type { Organization } from '@lms/api-client';
import { useActionState, useId, useState } from 'react';
import {
  updateOrganizationAction,
  updateOrganizationStatusAction,
} from './actions';

export function OrganizationRowActions({
  organization,
}: {
  organization: Organization;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(
    updateOrganizationAction,
    { ok: false, message: null },
  );
  const [statusState, statusAction, statusPending] = useActionState(
    updateOrganizationStatusAction,
    { ok: false, message: null },
  );
  const panelId = useId();
  const targetStatus = organization.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <div className="flex min-w-56 flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          aria-expanded={isEditing}
          aria-controls={panelId}
          onClick={() => setIsEditing((current) => !current)}
          className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          {isEditing ? 'Tutup' : 'Edit'}
        </button>
        <form action={statusAction}>
          <input type="hidden" name="id" value={organization.id} />
          <input type="hidden" name="name" value={organization.name} />
          <input type="hidden" name="status" value={targetStatus} />
          <button
            type="submit"
            disabled={statusPending}
            className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusPending
              ? 'Memproses...'
              : organization.status === 'ACTIVE'
                ? 'Nonaktifkan'
                : 'Aktifkan'}
          </button>
        </form>
      </div>
      {statusState.message ? <ActionMessage state={statusState} /> : null}
      {isEditing ? (
        <form
          id={panelId}
          action={editAction}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left shadow-sm"
        >
          <input type="hidden" name="id" value={organization.id} />
          <div className="grid gap-3">
            <label className="text-xs font-semibold text-slate-600">
              Kode
              <input
                name="code"
                defaultValue={organization.code}
                required
                maxLength={64}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Nama
              <input
                name="name"
                defaultValue={organization.name}
                required
                maxLength={255}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Tipe
                <input
                  name="organizationType"
                  defaultValue={organization.organizationType ?? ''}
                  maxLength={100}
                  placeholder="national / satdik"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Status
                <select
                  name="status"
                  defaultValue={organization.status}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>
            <label className="text-xs font-semibold text-slate-600">
              Parent ID
              <input
                name="parentId"
                defaultValue={organization.parentId ?? ''}
                placeholder="UUID parent bila ada"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-slate-500">
                Hard delete belum tersedia di API; gunakan nonaktifkan untuk
                arsip operasional.
              </p>
              <button
                type="submit"
                disabled={editPending}
                className="inline-flex min-h-9 shrink-0 items-center rounded-md bg-sky-600 px-3 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
            {editState.message ? <ActionMessage state={editState} /> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ActionMessage({
  state,
}: {
  state: { ok: boolean; message: string | null };
}) {
  if (!state.message) return null;

  return (
    <p
      className={
        state.ok
          ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
          : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
      }
    >
      {state.message}
    </p>
  );
}
