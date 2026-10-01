import Link from 'next/link';

export const metadata = {
  title: 'Masuk — Portal Executive LMS PRESISI',
  description:
    'Masuk ke portal executive LMS PRESISI Lemdiklat Polri melalui SSO.',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#061b34] px-6 text-slate-100">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#1e3146] bg-[#0a1a2e] p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#c8a45d] text-xs font-bold text-[#071d38]">
              LP
            </span>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">
                LMS PRESISI
              </p>
              <p className="text-xs text-[#c8a45d]">LEMDIKLAT POLRI</p>
            </div>
          </div>

          <h1 className="mt-8 text-2xl font-bold tracking-tight text-white">
            Portal Executive
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Pantau capaian, laporan, dan analitik pendidikan dari data reporting
            LMS PRESISI. Akses masuk menggunakan SSO resmi.
          </p>

          <Link
            href="/api/auth/login"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#c8a45d] px-6 text-sm font-bold text-[#071d38] transition hover:bg-[#e0b963]"
          >
            Masuk via SSO
          </Link>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Akses bersifat read-only dan dibatasi oleh permission + scope yang
            dikelola backend.
          </p>
        </div>
      </div>
    </main>
  );
}
