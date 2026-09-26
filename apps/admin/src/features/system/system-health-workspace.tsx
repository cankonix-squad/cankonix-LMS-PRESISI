import Link from 'next/link';
import {
  AdminPage,
  EmptyState,
  PageHeader,
  StatusBadge,
  StatCard,
} from '@/components/admin';

type Result = {
  data: { status: 'ok' } | null;
  error: string | null;
};

/**
 * System Health read-only page.
 *
 * The backend only exposes `GET /api/v1/health` (public, `{ status: 'ok' }`) —
 * a process liveness probe, not an infrastructure readiness report. There are no
 * endpoints for Redis/PostgreSQL/MinIO/Keycloak dependency status, queue depth,
 * or config, so this page reports the honest limitation and renders the single
 * signal the API actually provides. No fake mutations and no secret/setting
 * surfaces (there are none to read).
 */
export function SystemHealthWorkspace({ result }: { result: Result }) {
  const healthy = result.data?.status === 'ok';

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Audit & System / System Health"
        title="Status Sistem"
        description="Pemantauan kesehatan layanan platform. Hanya menampilkan sinyal yang tersedia dari API resmi."
      />

      <div className="px-5 pt-1">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="API Process"
            value={healthy ? 'Operasional' : 'Tidak tersedia'}
            note={
              result.error
                ? 'Gagal menghubungi API'
                : 'Proses API berjalan normal'
            }
          />
          <StatCard
            label="Health Check"
            value={healthy ? 'OK' : '—'}
            note="Probe `/api/v1/health` · bukan readiness infra"
          />
          <StatCard
            label="Audit Trail"
            value="Aktif"
            note="Izin baca `audit.log.read` diberlakukan di backend"
          />
        </div>
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              Sinyal kesehatan belum dapat dimuat.
            </p>
            <p className="mt-1 leading-6 text-amber-800">
              API proses tidak merespons. Coba muat ulang halaman, atau
              lanjutkan ke Riwayat Audit untuk aktivitas yang terakhir tercatat.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Ketersediaan Layanan
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Sinyal yang bisa dibaca dari kontrak API saat ini.
                </p>
              </div>
              <StatusBadge tone={healthy ? 'green' : 'red'}>
                {healthy ? 'Healthy' : 'Unavailable'}
              </StatusBadge>
            </div>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status API
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {healthy ? 'ok' : 'tidak diketahui'}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Redis / Database / Storage
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  Belum tersedia di kontrak read API
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <EmptyState>
          <p className="font-semibold text-slate-950">
            Status infrastruktur lengkap belum tersedia.
          </p>
          <p className="mt-2">
            API saat ini hanya menyediakan liveness probe. Pemantauan Redis,
            PostgreSQL, MinIO, dan Keycloak akan tampil setelah kontrak read
            status tersedia dari backend.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/audit"
              className="inline-flex min-h-10 items-center rounded-md border border-sky-300 px-4 font-medium text-sky-700 hover:bg-sky-50"
            >
              Buka Riwayat Audit
            </Link>
          </div>
        </EmptyState>
      </div>
    </AdminPage>
  );
}
