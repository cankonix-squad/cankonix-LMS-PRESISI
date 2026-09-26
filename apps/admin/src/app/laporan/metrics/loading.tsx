export default function MetricsLoading() {
  return (
    <div className="space-y-4 p-5" aria-label="Memuat metrik" role="status">
      <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-14 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-[420px] animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}
