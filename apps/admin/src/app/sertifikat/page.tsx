import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { CertificateWorkspace } from '@/features/graduation/certificate-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import type { CertificateStatus } from '@lms/api-client';

export const metadata = {
  title: 'Sertifikat — Admin LMS PRESISI',
};

export default async function SertifikatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const status = certStatusFilter(params.status);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);

  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.certificates.list({ status, page, limit }),
  );

  return (
    <AdminShell>
      <CertificateWorkspace
        result={result}
        filters={{ status, page, limit }}
      />
    </AdminShell>
  );
}

function certStatusFilter(
  input: string | string[] | undefined,
): CertificateStatus | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed = ['ISSUED', 'REVOKED'];
  return allowed.includes(input)
    ? (input as CertificateStatus)
    : undefined;
}

function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}