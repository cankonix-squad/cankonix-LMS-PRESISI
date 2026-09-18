import { createApiClient } from '@lms/api-client';

export type AdminApiClient = ReturnType<typeof createAdminApiClient>;

export function createAdminApiClient() {
  return createApiClient(getApiBaseUrl(), {
    getAccessToken: () => process.env.ADMIN_API_TOKEN,
  });
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
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
