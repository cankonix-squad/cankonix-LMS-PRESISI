import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { CertificateTemplateWorkspace } from '@/features/graduation/certificate-template-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import type { CertificateTemplateStatus } from '@lms/api-client';

export const metadata = {
  title: 'Template Sertifikat — Admin LMS PRESISI',
};

export default async function TemplateSertifikatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const code = value(params.code);
  const status = templateStatusFilter(params.status);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);

  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.certificateTemplates.list({ code, status, page, limit }),
  );

  return (
    <AdminShell>
      <CertificateTemplateWorkspace
        result={result}
        filters={{ code, status, page, limit }}
      />
    </AdminShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function templateStatusFilter(
  input: string | string[] | undefined,
): CertificateTemplateStatus | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
  return allowed.includes(input)
    ? (input as CertificateTemplateStatus)
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