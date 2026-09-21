'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const roles = [
  { value: 'admin-pusat', label: 'Admin Pusat' },
  { value: 'admin-satdik', label: 'Admin Satdik' },
  { value: 'pengelola-akademik', label: 'Pengelola Akademik' },
  { value: 'admin-ti', label: 'Admin TI' },
];

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '').trim();

    if (!username || !password) {
      setMessage('NRP/NIP/email dan kata sandi wajib diisi.');
      return;
    }

    setMessage(null);
    router.push('/');
  }

  return (
    <form
      onSubmit={submit}
      className="relative w-full max-w-[455px] rounded-3xl border border-[#d6dce5]/80 bg-[#fbfbfc] px-5 py-7 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:px-8"
      noValidate
    >
      <div className="mb-6 flex items-center gap-3 lg:hidden">
        <Image
          src="/login/logo-lemdiklat-polri.png"
          alt="Logo Lemdiklat Polri"
          width={43}
          height={52}
          className="object-contain"
        />
        <span className="text-[11px] font-black leading-5 tracking-[0.08em] text-[#0a254a]">
          LMS PRESISI
          <br />
          LEMDIKLAT POLRI
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-[13px] bg-[#eaf2ff]">
          <Image
            src="/login/logo-lemdiklat-polri.png"
            alt="Logo Lemdiklat Polri"
            width={34}
            height={38}
            className="object-contain drop-shadow-sm"
          />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-[#1c2d46]">
            Selamat datang
          </h1>
          <p className="mt-1 text-[10px] font-semibold text-[#667085]">
            Masuk ke LMS PRESISI Lemdiklat Polri
          </p>
        </div>
      </div>

      <p className="mb-6 text-xs leading-5 text-[#667085]">
        Gunakan identitas pengguna admin untuk mengakses ruang kerja pengelolaan
        LMS.
      </p>

      <div className="space-y-3">
        <label className="block text-[11px] font-bold text-[#344054]">
          NRP / NIP / Email
          <span className="mt-2 flex items-center rounded-xl border border-[#d6dce5] bg-white transition focus-within:border-[#d8ad57] focus-within:shadow-[0_0_0_3px_rgba(216,173,87,0.17)]">
            <UserIcon />
            <input
              name="username"
              autoComplete="username"
              defaultValue="demo.presisi"
              placeholder="Masukkan NRP, NIP, atau email"
              className="min-h-11 w-full rounded-xl bg-transparent px-3 py-2 text-xs text-[#25344d] outline-none"
            />
          </span>
        </label>

        <label className="block text-[11px] font-bold text-[#344054]">
          Kata sandi
          <span className="mt-2 flex items-center rounded-xl border border-[#d6dce5] bg-white transition focus-within:border-[#d8ad57] focus-within:shadow-[0_0_0_3px_rgba(216,173,87,0.17)]">
            <LockIcon />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              defaultValue="prototype"
              placeholder="Masukkan kata sandi"
              className="min-h-11 w-full rounded-xl bg-transparent px-3 py-2 text-xs text-[#25344d] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="self-stretch rounded-r-xl px-3 text-[10px] font-extrabold text-[#123a70]"
            >
              {showPassword ? 'Tutup' : 'Lihat'}
            </button>
          </span>
        </label>

        <label className="block text-[11px] font-bold text-[#344054]">
          Pilih peran
          <span className="mt-2 flex items-center rounded-xl border border-[#d6dce5] bg-white transition focus-within:border-[#d8ad57] focus-within:shadow-[0_0_0_3px_rgba(216,173,87,0.17)]">
            <RoleIcon />
            <select
              name="role"
              defaultValue="admin-pusat"
              className="min-h-11 w-full rounded-xl bg-transparent px-3 py-2 text-xs text-[#25344d] outline-none"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <div className="my-4 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[10px] text-[#586579]">
          <input type="checkbox" defaultChecked className="accent-[#123a70]" />
          <span>Ingat perangkat ini</span>
        </label>
        <button
          type="button"
          className="text-[10px] font-extrabold text-[#123a70]"
          title="Fitur tersedia setelah integrasi Keycloak"
        >
          Lupa kata sandi?
        </button>
      </div>

      {message ? (
        <p className="mb-3 rounded-lg bg-[#fdeaea] px-3 py-2 text-[10px] text-[#9f1d1d]">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[linear-gradient(100deg,#0a254a,#123a70)] px-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(18,58,112,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_24px_rgba(18,58,112,0.25)]"
      >
        <span>Masuk ke Admin LMS PRESISI</span>
        <span aria-hidden="true" className="text-xl font-normal">
          →
        </span>
      </button>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-[#d8e6fb] bg-[#eaf2ff] p-3 text-[#53657c]">
        <InfoIcon />
        <div className="flex flex-col gap-1">
          <b className="text-[10px] text-[#123a70]">Mode prototipe admin</b>
          <span className="text-[9px] leading-4">
            Tombol masuk membuka dashboard admin lokal. Validasi login produksi
            tetap memakai Keycloak dan token Bearer dari backend.
          </span>
        </div>
      </div>
    </form>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="ml-3 h-[18px] w-[18px] shrink-0 fill-none stroke-[#778399] stroke-[1.7]"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="ml-3 h-[18px] w-[18px] shrink-0 fill-none stroke-[#778399] stroke-[1.7]"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function RoleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="ml-3 h-[18px] w-[18px] shrink-0 fill-none stroke-[#778399] stroke-[1.7]"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20a6 6 0 0 1 12 0m0-5a5 5 0 0 1 6 5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px] fill-none stroke-[#123a70] stroke-[1.7]"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </svg>
  );
}
