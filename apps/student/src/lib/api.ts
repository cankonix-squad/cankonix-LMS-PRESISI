import { createApiClient } from '@lms/api-client';
import { cookies } from 'next/headers';

export type StudentApiClient = ReturnType<typeof createStudentApiClient>;

/**
 * Server-side API client for the student portal.
 *
 * The token is read from the server environment only, so it never reaches the
 * browser bundle. Authorization itself remains the API's job.
 */
export function createStudentApiClient() {
  return createApiClient(getApiBaseUrl(), {
    getAccessToken: async () => (await cookies()).get('lms_access_token')?.value,
  });
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
}

export type LoadResult<T> = {
  data: T | null;
  error: string | null;
};

/**
 * Runs a loader and converts a thrown API error into a renderable message.
 *
 * Pages must render a useful state when the API is unreachable (which is the
 * normal condition in this environment, since no token is configured), so every
 * read goes through this instead of letting the error escape to the boundary.
 */
export async function getOrEmpty<T>(
  loader: () => Promise<T>,
): Promise<LoadResult<T>> {
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

/**
 * Current time as epoch milliseconds.
 *
 * Provided to components as a prop so that render remains a pure function.
 */
export function currentTimeMs(): number {
  return new Date().getTime();
}
