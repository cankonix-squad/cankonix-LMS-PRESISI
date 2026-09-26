export default function SystemHealthLoading() {
  return (
    <div
      className="space-y-4 p-5"
      aria-label="Memuat status sistem"
      role="status"
    >
      <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg bg-slate-200"
          />
        ))}
      </div>
      <div className="h-[320px] animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}
