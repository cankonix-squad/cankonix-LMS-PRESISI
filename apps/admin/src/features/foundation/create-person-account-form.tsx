'use client';

import { useActionState, useState } from 'react';
import { createPersonWithAccountAction } from './actions';

export function CreatePersonAccountForm() {
  const [state, formAction, isPending] = useActionState(
    createPersonWithAccountAction,
    { ok: false, message: null },
  );
  const [createAccount, setCreateAccount] = useState(true);

  return (
    <form
      action={formAction}
      className="mb-5 grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 md:grid-cols-2"
    >
      <label className="text-sm text-slate-300">
        NRP / NIP
        <input
          name="personnelNumber"
          placeholder="BOOTSTRAP-002"
          required
          maxLength={64}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Nama lengkap
        <input
          name="fullName"
          placeholder="Nama Personel"
          required
          maxLength={255}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Pangkat
        <input
          name="rank"
          placeholder="AKP"
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Jabatan
        <input
          name="title"
          placeholder="Admin Satdik"
          maxLength={150}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Email personel
        <input
          name="email"
          type="email"
          placeholder="nama@polri.go.id"
          maxLength={255}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>
      <label className="text-sm text-slate-300">
        Telepon
        <input
          name="phone"
          placeholder="+628..."
          maxLength={50}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </label>

      <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 md:col-span-2">
        <input
          name="createAccount"
          type="checkbox"
          checked={createAccount}
          onChange={(event) => setCreateAccount(event.target.checked)}
          className="accent-sky-500"
        />
        Buat UserAccount untuk person ini
      </label>

      {createAccount ? (
        <>
          <label className="text-sm text-slate-300">
            Username akun
            <input
              name="username"
              placeholder="admin.satdik"
              maxLength={150}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </label>
          <label className="text-sm text-slate-300">
            Email akun
            <input
              name="accountEmail"
              type="email"
              placeholder="admin.satdik@polri.go.id"
              maxLength={255}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Keycloak subject
            <input
              name="externalAuthId"
              placeholder="UUID/sub dari akun Keycloak bila sudah ada"
              maxLength={255}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </label>
        </>
      ) : null}

      <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Password tidak dibuat di LMS. Kredensial tetap dikelola oleh SSO
          LMS PRESISI; field Keycloak subject dipakai untuk menghubungkan token
          SSO ke UserAccount.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Menyimpan...' : 'Buat person'}
        </button>
      </div>
      {state.message ? (
        <p
          className={
            state.ok
              ? 'md:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'
              : 'md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100'
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
