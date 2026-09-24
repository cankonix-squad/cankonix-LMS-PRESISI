export default function Loading() {
  return (
    <div
      className="space-y-4 p-5"
      aria-busy="true"
      aria-label="Memuat aktivitas"
    >
      <div className="h-28 animate-pulse rounded-lg bg-white" />
      <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-96 animate-pulse rounded-lg bg-white" />
    </div>
  );
}
