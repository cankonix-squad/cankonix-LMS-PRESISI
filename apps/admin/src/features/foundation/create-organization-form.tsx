'use client';

import { useActionState } from 'react';
import { createOrganizationAction } from './actions';

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganizationAction,
    { ok: false, message: null },
  );

  return (
    <form
      action={formAction}
      className="mb-5 grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 sm:grid-cols-2"
    >
      <label className="text-sm text-slate-300">
        Kode organisasi
        <input
          name="code"
          placeholder="LEMDIKLAT"
          required
          maxLength={64}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Nama organisasi
        <input
          name="name"
          placeholder="Lemdiklat Polri"
          required
          maxLength={255}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Tipe organisasi
        <input
          name="organizationType"
          placeholder="national / satdik"
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Parent ID
        <input
          name="parentId"
          placeholder="UUID parent bila ada"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Validasi client hanya tambahan; normalisasi kode, parent validation,
          dan cycle prevention tetap dilakukan backend.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Menyimpan...' : 'Buat organisasi'}
        </button>
      </div>
      {state.message ? (
        <p
          className={
            state.ok
              ? 'sm:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'
              : 'sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100'
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
