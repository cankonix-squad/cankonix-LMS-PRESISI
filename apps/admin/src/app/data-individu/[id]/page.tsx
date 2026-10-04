import { AdminShell } from '@/components/admin-shell';
import {
  PROVISIONING_STATUS_LABEL,
  accountStatusLabel,
  accountStatusTone,
  formatDate,
  formatDateTime,
  personStatusLabel,
  placementLabel,
} from '@/features/foundation/display';
import {
  AdminPage,
  EmptyState,
  EnterpriseTable,
  ErrorState,
  PageHeader,
  Pill,
} from '@/components/admin';
import {
  createAdminApiClient,
  getOrEmpty,
  requireAdminPortalAccess,
} from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Detail Data Individu — Admin LMS PRESISI',
};

export default async function DataIndividuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPortalAccess();
  const { id } = await params;
  const api = createAdminApiClient();
  const person = await getOrEmpty(() => api.persons.get(id));
  if (person.status === 404) notFound();
  const [account, placements, keycloak] = await Promise.all([
    getOrEmpty(() => api.persons.getAccount(id)),
    getOrEmpty(() => api.persons.listOrganizations(id)),
    getOrEmpty(() => api.persons.getKeycloakProvisioning(id)),
  ]);
  const row = person.data;
  const accountError = account.error
    ? { message: account.error, status: account.status }
    : null;

  return (
    <AdminShell>
      <AdminPage>
        <PageHeader
          eyebrow="Data Induk / Data Individu"
          title={row ? row.fullName : 'Data individu tidak ditemukan'}
          description={
            row
              ? `Identitas orang, terpisah dari akun pengguna. NRP/NIP ${row.personnelNumber}.`
              : 'Data individu tidak dapat dimuat.'
          }
          actions={
            <Link
              href="/data-individu"
              className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Kembali ke daftar
            </Link>
          }
        />
        <div className="px-5 pb-5">
          {!row ? (
            <ErrorState message={person.error ?? 'Data individu tidak ditemukan.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
                <h2 className="text-sm font-semibold text-slate-950">
                  Identitas orang
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['Nama lengkap', row.fullName],
                    ['NRP/NIP', row.personnelNumber],
                    ['Pangkat', row.rank || '-'],
                    ['Jabatan', row.title || '-'],
                    ['Email individu', row.email || '-'],
                    ['Telepon', row.phone || '-'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-slate-400">{label}</dt>
                      <dd className="mt-1 break-words font-medium text-slate-800">
                        {value}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-xs text-slate-400">Status individu</dt>
                    <dd className="mt-1">
                      <Pill tone={row.status === 'ACTIVE' ? 'green' : 'red'}>
                        {personStatusLabel(row.status)}
                      </Pill>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Terdaftar</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {formatDate(row.createdAt)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Status individu tidak mengubah status akun. Riwayat pendidikan,
                  penugasan, dan data akademik tetap tersimpan walau akun
                  dinonaktifkan.
                </p>
              </section>
              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-950">
                  Akun pengguna terhubung
                </h2>
                {accountError ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Akun tidak dapat dibaca: {accountError.message}
                  </p>
                ) : account.data ? (
                  <>
                    <dl className="mt-3 grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-400">Nama pengguna</dt>
                        <dd className="mt-1 font-medium text-slate-800">
                          {account.data.username || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Email login</dt>
                        <dd className="mt-1 break-words font-medium text-slate-800">
                          {account.data.email || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Status akun</dt>
                        <dd className="mt-1">
                          <Pill tone={accountStatusTone(account.data.status)}>
                            {accountStatusLabel(account.data.status)}
                          </Pill>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">
                          Login terakhir
                        </dt>
                        <dd className="mt-1 font-medium text-slate-800">
                          {account.data.lastLoginAt
                            ? formatDateTime(account.data.lastLoginAt)
                            : 'Belum pernah'}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={`/akun-pengguna${account.data.username ? `?search=${encodeURIComponent(account.data.username)}` : ''}`}
                      className="mt-4 inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
                    >
                      Buka Akun Pengguna
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Belum memiliki akun
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Individu ini tetap valid tanpa akun. Hubungkan akun hanya
                      bila orang tersebut perlu login ke LMS.
                    </p>
                    <Link
                      href="/akun-pengguna"
                      className="mt-4 inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
                    >
                      Hubungkan Akun Pengguna
                    </Link>
                  </>
                )}
              </section>
              <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
                <h2 className="text-sm font-semibold text-slate-950">
                  Penempatan organisasi
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Penempatan saat ini:{' '}
                  {placementLabel(placements.data ?? [])}
                </p>
                <div className="mt-4">
                  {(placements.data ?? []).length === 0 ? (
                    <EmptyState>
                      <p className="font-semibold text-slate-950">
                        Belum ada penempatan
                      </p>
                      <p className="mt-2">
                        Individu ini belum ditempatkan pada satuan kerja mana pun.
                      </p>
                    </EmptyState>
                  ) : (
                    <EnterpriseTable
                      minWidth={720}
                      columns={[
                        { label: 'Satuan kerja' },
                        { label: 'Jabatan' },
                        { label: 'Mulai' },
                        { label: 'Selesai' },
                        { label: 'Status' },
                      ]}
                      mobile={
                        <>
                          {(placements.data ?? []).map((placement) => (
                            <article
                              key={placement.id}
                              className="rounded-lg border border-slate-200 bg-white p-4"
                            >
                              <p className="font-medium text-slate-900">
                                {placement.organization?.name ||
                                  'Unit tidak terbaca'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {placement.positionName || 'Jabatan belum diisi'}
                              </p>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                  {formatDate(placement.startDate)} —{' '}
                                  {placement.endDate
                                    ? formatDate(placement.endDate)
                                    : 'sekarang'}
                                </span>
                                <Pill
                                  tone={placement.isActive ? 'green' : 'slate'}
                                >
                                  {placement.isActive ? 'Aktif' : 'Nonaktif'}
                                </Pill>
                              </div>
                            </article>
                          ))}
                        </>
                      }
                    >
                      {(placements.data ?? []).map((placement) => (
                        <tr key={placement.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {placement.organization?.name || 'Unit tidak terbaca'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {placement.positionName || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(placement.startDate)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {placement.endDate
                              ? formatDate(placement.endDate)
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Pill
                              tone={placement.isActive ? 'green' : 'slate'}
                            >
                              {placement.isActive ? 'Aktif' : 'Nonaktif'}
                            </Pill>
                          </td>
                        </tr>
                      ))}
                    </EnterpriseTable>
                  )}
                </div>
              </section>
              {account.data ? (
                <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Status login SSO
                  </h2>
                  {keycloak.data ? (
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-slate-400">Ringkasan</dt>
                        <dd className="mt-1 font-medium text-slate-800">
                          {keycloak.data.summary}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">
                          Siap login
                        </dt>
                        <dd className="mt-1 font-medium text-slate-800">
                          {keycloak.data.readyToLogin ? 'Ya' : 'Belum'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">
                          Status penghubungan
                        </dt>
                        <dd className="mt-1 font-medium text-slate-800">
                          {PROVISIONING_STATUS_LABEL[keycloak.data.status] ??
                            keycloak.data.status}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Status login SSO belum dapat dibaca saat ini.
                    </p>
                  )}
                </section>
              ) : null}
            </div>
          )}
        </div>
      </AdminPage>
    </AdminShell>
  );
}
