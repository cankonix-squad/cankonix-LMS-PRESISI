import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'slate' | 'green' | 'red' | 'blue' | 'amber';

export function StatusBadge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const tones: Record<Tone, string> = {
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export { StatusBadge as Pill };

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const friendly = toFriendlyError(message);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">{friendly.title}</p>
      <p className="mt-1 leading-6 text-amber-800">{friendly.description}</p>
      {friendly.detail ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-amber-800">
          {friendly.detail}
        </p>
      ) : null}
    </div>
  );
}

export function ActionMessage({
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

function toFriendlyError(message: string) {
  if (message.toLowerCase().includes('access denied')) {
    const permission = message.match(/permission\s+([a-z0-9._:-]+)/i)?.[1];
    return {
      title: 'Akses belum tersedia untuk akun ini.',
      description:
        'Hubungi pengelola akses untuk menambahkan permission yang diperlukan, lalu muat ulang halaman setelah assignment aktif.',
      detail: permission ? `Permission diperlukan: ${permission}` : message,
    };
  }

  if (message.toLowerCase().includes('bearer access token is required')) {
    return {
      title: 'Sesi login belum aktif.',
      description:
        'Masuk ulang lewat SSO Admin agar dashboard dapat membaca data protected dari API.',
      detail: null,
    };
  }

  return {
    title: 'Data belum dapat dimuat.',
    description:
      'API belum mengembalikan data yang diminta. Coba muat ulang halaman atau lanjutkan dari menu lain bila pekerjaan mendesak.',
    detail: message,
  };
}
