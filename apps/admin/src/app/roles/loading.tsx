export default function RolesLoading() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="Memuat role dan permission"
    >
      <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
      <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="h-12 animate-pulse bg-slate-50" />
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-md bg-slate-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
