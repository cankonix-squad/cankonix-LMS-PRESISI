import type { Metadata } from 'next';
import { PORTAL_DENIAL_MESSAGES, toDenialReason } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Akses Ditolak — Admin LMS PRESISI',
};

/**
 * Explicit access-denied screen.
 *
 * Deliberately rendered OUTSIDE `AdminShell` and without the portal gate: an
 * operator who is signed in but not authorized must not need Admin navigation
 * (which is itself Admin UI) to understand why they were refused, and gating
 * this page would loop.
 *
 * The copy is chosen by the reason the LMS (or the missing session) produced, so
 * "your token expired" is never confused with "you are not an Admin".
 */
export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reason = toDenialReason(params?.reason);
  const copy = PORTAL_DENIAL_MESSAGES[reason];
  const canRetrySignIn = reason === 'NO_SESSION' || reason === 'UNAUTHENTICATED';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 text-slate-950">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-600">
          Portal Admin · Akses Ditolak
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {copy.title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {copy.description}
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
          Keputusan otorisasi dibuat oleh backend LMS memakai model Permission +
          Scope. Portal Admin hanya menampilkan status sesi dan tidak pernah
          menjadi batas keamanan utama.
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {canRetrySignIn ? (
            <a
              href="/api/auth/login"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Masuk dengan SSO
            </a>
          ) : null}
          <a
            href="/api/auth/logout"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            {canRetrySignIn ? 'Kembali ke Halaman Login' : 'Keluar dari Sesi Ini'}
          </a>
        </div>
      </section>
    </main>
  );
}
