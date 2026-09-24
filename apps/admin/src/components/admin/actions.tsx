import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ActionTone = 'default' | 'muted' | 'warning';

export function ActionGroup({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export function actionButtonClass(tone: ActionTone = 'default') {
  const tones: Record<ActionTone, string> = {
    default:
      'border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700',
    muted: 'border-slate-200 bg-slate-50 text-slate-400',
    warning:
      'border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-700',
  };

  return cn(
    'inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
    tones[tone],
  );
}

export function ActionButton({
  children,
  disabled,
  onClick,
  title,
  tone = 'default',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  tone?: ActionTone;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={actionButtonClass(disabled ? 'muted' : tone)}
    >
      {children}
    </button>
  );
}
