'use client';

import { useActionState } from 'react';
import { createOrganizationAction } from './actions';

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganizationAction,
    { ok: false, message: null },
  );

  return (
    <form action={formAction} className="grid gap-4">
      <label className="text-sm font-medium text-slate-700">
        Kode organisasi
        <input
          name="code"
          placeholder="LEMDIKLAT"
          required
          maxLength={64}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Nama organisasi
        <input
          name="name"
          placeholder="Lemdiklat Polri"
          required
          maxLength={255}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Tipe organisasi
        <input
          name="organizationType"
          placeholder="national / satdik"
          maxLength={100}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Parent ID
        <input
          name="parentId"
          placeholder="UUID parent bila ada"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-5 text-slate-500">
          Validasi client hanya tambahan; normalisasi kode, parent validation,
          dan cycle prevention tetap dilakukan backend.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Menyimpan...' : 'Buat organisasi'}
        </button>
      </div>
      {state.message ? (
        <p
          className={
            state.ok
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
              : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
