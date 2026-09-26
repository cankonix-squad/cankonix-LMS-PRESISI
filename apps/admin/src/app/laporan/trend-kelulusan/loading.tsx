export default function TrendKelulusanLoading() {
  return (
    <div
      className="space-y-4 p-5"
      aria-label="Memuat tren kelulusan"
      role="status"
    >
      <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg bg-slate-200"
          />
        ))}
      </div>
      <div className="h-14 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-[420px] animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}
