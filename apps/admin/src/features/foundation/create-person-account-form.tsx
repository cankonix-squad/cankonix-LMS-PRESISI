'use client';

import { useActionState, useState } from 'react';
import { createPersonWithAccountAction } from './actions';

const labelClass = 'text-sm font-medium text-slate-700';
const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100';

export function CreatePersonAccountForm() {
  const [state, formAction, isPending] = useActionState(
    createPersonWithAccountAction,
    { ok: false, message: null },
  );
  const [createAccount, setCreateAccount] = useState(true);

  return (
    <form
      action={formAction}
      className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2"
    >
      <label className={labelClass}>
        NRP / NIP
        <input
          name="personnelNumber"
          placeholder="BOOTSTRAP-002"
          required
          maxLength={64}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Nama lengkap
        <input
          name="fullName"
          placeholder="Nama Personel"
          required
          maxLength={255}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Pangkat
        <input
          name="rank"
          placeholder="AKP"
          maxLength={100}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Jabatan
        <input
          name="title"
          placeholder="Admin Satdik"
          maxLength={150}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Email personel
        <input
          name="email"
          type="email"
          placeholder="nama@polri.go.id"
          maxLength={255}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Telepon
        <input
          name="phone"
          placeholder="+628..."
          maxLength={50}
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:col-span-2">
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
          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-5 text-sky-900 md:col-span-2">
            <p className="font-semibold">Akun login tetap dikelola SSO.</p>
            <p className="mt-1">
              Username dan email membuat UserAccount LMS. User Keycloak dapat
              dihubungkan nanti; peran Admin, Pengajar, Pimpinan, atau Peserta
              diberikan dari Assignment & Scope.
            </p>
          </div>
          <label className={labelClass}>
            Username akun
            <input
              name="username"
              placeholder="admin.satdik"
              maxLength={150}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Email akun
            <input
              name="accountEmail"
              type="email"
              placeholder="admin.satdik@polri.go.id"
              maxLength={255}
              className={inputClass}
            />
          </label>
          <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 md:col-span-2">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Opsi lanjutan: hubungkan user Keycloak
            </summary>
            <label className={`${labelClass} mt-3 block`}>
              ID User Keycloak
              <input
                name="externalAuthId"
                placeholder="Kosongkan bila user Keycloak belum dibuat"
                maxLength={255}
                className={inputClass}
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Isi hanya dengan nilai <code>sub</code> dari Keycloak. Ini bukan
              email, username, atau pilihan role.
            </p>
          </details>
        </>
      ) : null}

      <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Password tidak dibuat di LMS. Agar bisa login, user harus ada di
          Keycloak dan aksesnya diberikan dari Assignment & Scope.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Menyimpan...' : 'Buat person'}
        </button>
      </div>
      {state.message ? (
        <p
          className={
            state.ok
              ? 'md:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
              : 'md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
