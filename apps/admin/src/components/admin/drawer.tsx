'use client';

import { useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { DrawerWorkflowContext } from './drawer-workflow';

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
  const workflow = useContext(DrawerWorkflowContext);
  const active = workflow?.active ?? true;
  const pending = workflow?.pending ?? false;
  const close = workflow?.close ?? onClose;
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab' && panel.current) {
        const controls = Array.from(
          panel.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          panel.current.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [active, close]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
      <button
        type="button"
        aria-label="Tutup panel"
        className="absolute inset-0 cursor-default"
        onClick={close}
        disabled={pending}
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={pending}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {eyebrow}
              </p>
              <h2
                id={titleId}
                className="mt-1 text-xl font-semibold text-slate-950"
              >
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
              onClick={close}
              disabled={pending}
              aria-label="Tutup"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-lg leading-none text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <fieldset
            disabled={pending}
            className="min-w-0"
            onReset={(event) => event.preventDefault()}
          >
            {children}
          </fieldset>
        </div>
      </aside>
    </div>
  );
}
