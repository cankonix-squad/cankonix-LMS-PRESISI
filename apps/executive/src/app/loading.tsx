export default function ExecutiveLoading() {
  return (
    <main
      className="min-h-screen bg-[#061524] p-4 text-slate-100 sm:p-6 lg:p-8"
      aria-busy="true"
      aria-label="Memuat portal executive"
    >
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-16 rounded-lg border border-[#1e3146] bg-[#0a1a2e]" />
        <div className="h-28 rounded-lg border border-[#1e3146] bg-[#0a1a2e]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-32 rounded-lg border border-[#1e3146] bg-[#0a1a2e]"
            />
          ))}
        </div>
        <div className="h-64 rounded-lg border border-[#1e3146] bg-[#0a1a2e]" />
        <div className="h-80 rounded-lg border border-[#1e3146] bg-[#0a1a2e]" />
      </div>
    </main>
  );
}
