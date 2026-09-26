export default function KeputusanKelulusanLoading() {
  return (
    <div className="space-y-4 p-5" aria-label="Memuat data keputusan kelulusan" role="status">
      <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-[420px] animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}