import Image from 'next/image';

const roleHints = [
  'Admin Pusat',
  'Admin Satdik',
  'Pengelola Akademik',
  'Admin TI',
];

export function LoginForm() {
  return (
    <section className="relative w-full max-w-[455px] rounded-3xl border border-[#d6dce5]/80 bg-[#fbfbfc] px-5 py-7 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:px-8">
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
          <h1 className="text-2xl font-bold tracking-normal text-[#1c2d46]">
            Selamat datang
          </h1>
          <p className="mt-1 text-[10px] font-semibold text-[#667085]">
            Masuk ke LMS PRESISI Lemdiklat Polri
          </p>
        </div>
      </div>

      <p className="mb-6 text-xs leading-5 text-[#667085]">
        Autentikasi admin produksi memakai Keycloak. Username, password, dan
        kebijakan akun diverifikasi di identity provider; portal Admin hanya
        menerima token bearer untuk mengakses API.
      </p>

      <a
        href="/api/auth/login"
        className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[linear-gradient(100deg,#0a254a,#123a70)] px-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(18,58,112,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_11px_24px_rgba(18,58,112,0.25)]"
      >
        <span>Masuk dengan Keycloak</span>
        <span aria-hidden="true" className="text-xl font-normal">
          →
        </span>
      </a>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-[#d8e6fb] bg-[#eaf2ff] p-3 text-[#53657c]">
        <InfoIcon />
        <div className="flex flex-col gap-2">
          <b className="text-[10px] text-[#123a70]">Akses operasional Admin</b>
          <span className="text-[9px] leading-4">
            Gunakan akun bootstrap atau akun Admin yang sudah terhubung ke
            Person dan UserAccount. Setelah login pertama, segera ubah password
            bootstrap dari Keycloak.
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#e4e8ef] bg-white/70 p-3">
        <p className="text-[10px] font-extrabold text-[#344054]">
          Portal ini dipakai oleh
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {roleHints.map((role) => (
            <span
              key={role}
              className="rounded-full border border-[#d6dce5] px-2.5 py-1 text-[9px] font-bold text-[#586579]"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </section>
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
