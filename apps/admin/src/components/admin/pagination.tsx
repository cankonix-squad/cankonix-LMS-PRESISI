import Link from 'next/link';

export function PaginationBar({
  page,
  limit,
  total,
  totalPages,
  itemLabel,
  hrefFor,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  itemLabel: string;
  hrefFor: (next: { page: number; limit: number }) => string;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Menampilkan{' '}
        <span className="font-semibold text-slate-950">{start}</span>
        {' - '}
        <span className="font-semibold text-slate-950">{end}</span> dari{' '}
        <span className="font-semibold text-slate-950">{total}</span>{' '}
        {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Jumlah data per halaman"
          defaultValue={limit}
          onChange={(event) => {
            window.location.href = hrefFor({
              limit: Number(event.target.value),
              page: 1,
            });
          }}
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
        >
          <option value="10">10 / halaman</option>
          <option value="25">25 / halaman</option>
          <option value="50">50 / halaman</option>
        </select>
        <Link
          href={hrefFor({ page: Math.max(1, page - 1), limit })}
          aria-disabled={!hasPrevious}
          className={
            hasPrevious
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 font-medium text-slate-400'
          }
        >
          Sebelumnya
        </Link>
        <span className="px-2 text-slate-500">
          {page} / {totalPages}
        </span>
        <Link
          href={hrefFor({ page: page + 1, limit })}
          aria-disabled={!hasNext}
          className={
            hasNext
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 font-medium text-slate-400'
          }
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
