import type { ReactNode } from 'react';

export function EnterpriseDrawer({
  eyebrow,
  title,
  description,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
      <button
        type="button"
        aria-label="Tutup panel"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {title}
              </h2>
              {description ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-lg leading-none text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </aside>
    </div>
  );
}
