export function PortalShell({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm tracking-widest text-slate-400">
          LEMDIKLAT POLRI
        </p>
        <h1 className="mt-6 text-4xl font-semibold">{title}</h1>
        <p className="mt-4 text-slate-300">Learning Management System</p>
      </div>
    </main>
  );
}
