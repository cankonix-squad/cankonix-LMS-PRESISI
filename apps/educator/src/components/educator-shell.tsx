import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/kelas', label: 'Kelas Diampu' },
  { href: '/pertemuan', label: 'Pertemuan' },
  { href: '/aktivitas', label: 'Aktivitas' },
  { href: '/tugas', label: 'Tugas & Penilaian' },
  { href: '/kehadiran', label: 'Kehadiran' },
  { href: '/pemantauan', label: 'Pemantauan' },
];

export function EducatorShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">
              Lemdiklat Polri
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Portal Educator
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">
              Kelola pertemuan, materi, tugas, dan penilaian pada kelas yang
              menjadi tanggung jawab Anda. Aturan bisnis dan otorisasi tetap
              ditegakkan API.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}

export function SectionCard({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20',
        className,
      )}
    >
      <div className="mb-5 border-b border-slate-800 pb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}
