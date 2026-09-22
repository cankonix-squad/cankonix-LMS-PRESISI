import type { ReactNode } from 'react';

export function ErrorState({ message }: { message: string }) {
  const friendly = toFriendlyError(message);

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-medium">{friendly.title}</p>
      <p className="mt-1 leading-6 text-amber-100/85">{friendly.description}</p>
      {friendly.detail ? (
        <p className="mt-3 rounded-md border border-amber-500/20 bg-slate-950/40 px-3 py-2 font-mono text-xs text-amber-100/70">
          {friendly.detail}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'red' | 'blue';
}) {
  const tones = {
    slate: 'border-slate-700 bg-slate-800 text-slate-200',
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    red: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    blue: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>
      {children}
    </span>
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
