import type {
  GraduationTrendGranularity,
  ReportingScopeType,
} from '@lms/api-client';

// ---------------------------------------------------------------------------
// Executive reporting labels & formatters (read-only, Bahasa Indonesia).
// Reused across the dashboard, drill-down, KPI detail and trend pages.
// ---------------------------------------------------------------------------

/** Scope type label (Bahasa Indonesia, natural). */
export const scopeTypeLabel = (scope: ReportingScopeType): string => {
  const map: Record<ReportingScopeType, string> = {
    ORGANIZATION: 'Lembaga',
    PROGRAM: 'Program',
    BATCH: 'Angkatan',
    CLASS: 'Kelas',
    CLASS_SUBJECT: 'Mata Pelajaran',
    ENROLLMENT: 'Peserta',
  };
  return map[scope] ?? scope;
};

/** Access level label for the resolved executive scope. */
export const accessLevelLabel = (level: 'NATIONAL' | 'SCOPED'): string =>
  level === 'NATIONAL' ? 'Nasional' : 'Terbatas';

/** Drill-down / hierarchy level label. */
export const drilldownLevelLabel = (level: ReportingScopeType): string =>
  scopeTypeLabel(level);

/** Granularity label for graduation trends. */
export const granularityLabel = (g: GraduationTrendGranularity): string => {
  const map: Record<GraduationTrendGranularity, string> = {
    COHORT: 'Cohort',
    YEAR: 'Tahun',
    QUARTER: 'Triwulan',
    MONTH: 'Bulan',
  };
  return map[g] ?? g;
};

/** Formats a 0-100 percentage for display, keeping one decimal when needed. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('id-ID')}%`;
}

/** Formats a numeric count without false precision. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('id-ID');
}

/** Formats a date-time string into a compact Indonesian date. */
export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Formats a period string like `2026-Q3` into a friendlier label. */
export function formatPeriod(value: string): string {
  // Periods may be `2026`, `2026-Q3`, `2026-09`, or a cohort code. Return
  // as-is when no structural match exists.
  const quarter = /^(\d{4})-Q([1-4])$/.exec(value);
  if (quarter) return `Triwulan ${quarter[2]} ${quarter[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) {
    const date = new Date(`${month[1]}-${month[2]}-01T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
      }).format(date);
    }
  }
  return value;
}
