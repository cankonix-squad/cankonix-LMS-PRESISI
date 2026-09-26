export default function AuditLoading() {
  return (
    <div className="space-y-4 p-5" aria-label="Memuat audit" role="status">
      <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-14 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-[420px] animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}
