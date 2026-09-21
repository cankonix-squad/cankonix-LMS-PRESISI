import { createApiClient } from '@lms/api-client';
import { cookies } from 'next/headers';

export type AdminApiClient = ReturnType<typeof createAdminApiClient>;

export function createAdminApiClient() {
  return createApiClient(getApiBaseUrl(), {
    getAccessToken: async () => (await cookies()).get('lms_access_token')?.value,
  });
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
}

export async function getAdminAccessToken() {
  return (await cookies()).get('lms_access_token')?.value ?? null;
}

export async function hasAdminSession() {
  return Boolean(await getAdminAccessToken());
}

export async function getOrEmpty<T>(loader: () => Promise<T>): Promise<{
  data: T | null;
  error: string | null;
}> {
  try {
    return { data: await loader(), error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Tidak dapat memuat data API',
    };
  }
}
