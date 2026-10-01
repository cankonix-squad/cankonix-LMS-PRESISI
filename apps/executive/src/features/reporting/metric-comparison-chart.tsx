import type { ExecutiveOverview } from '@lms/api-client';
import { formatPercent } from '@/lib/executive-labels';

type BreakdownItem = ExecutiveOverview['breakdown']['data'][number];

/** Compares API-provided percentages without re-aggregating source records. */
export function MetricComparisonChart({ items }: { items: BreakdownItem[] }) {
  const rows = items.slice(0, 6);

  return (
    <section
      aria-labelledby="metric-chart-title"
      className="rounded-lg border border-[#1e3146] bg-[#0a1a2e] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="metric-chart-title"
            className="text-sm font-semibold text-white"
          >
            Perbandingan indikator
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Progress pembelajaran dan kehadiran pada entri di halaman ini.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-3 text-xs text-slate-400"
          aria-hidden="true"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#c8a45d]" /> Progress
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Kehadiran
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Belum ada data untuk digambarkan.
        </p>
      ) : (
        <div
          className="mt-5 space-y-4"
          role="list"
          aria-label="Perbandingan KPI"
        >
          {rows.map((item) => (
            <div
              key={`${item.scopeType}-${item.scopeId}`}
              role="listitem"
              className="grid gap-2 sm:grid-cols-[minmax(8rem,0.7fr)_minmax(0,1.3fr)] sm:items-center sm:gap-4"
            >
              <p
                className="truncate text-sm text-slate-200"
                title={item.scopeName ?? item.scopeId}
              >
                {item.scopeName ?? item.scopeType}
              </p>
              <div className="space-y-2">
                <MetricBar
                  label="Progress"
                  value={item.metrics.averageProgressPercent}
                  color="bg-[#c8a45d]"
                />
                <MetricBar
                  label="Kehadiran"
                  value={item.metrics.attendancePercentage}
                  color="bg-emerald-400"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;

  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.25rem] items-center gap-2 text-xs">
      <span className="text-slate-400">{label}</span>
      <div
        className="h-2 overflow-hidden rounded-full bg-[#061524]"
        role="img"
        aria-label={`${label}: ${formatPercent(value)}`}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <span className="text-right tabular-nums text-slate-300">
        {formatPercent(value)}
      </span>
    </div>
  );
}
