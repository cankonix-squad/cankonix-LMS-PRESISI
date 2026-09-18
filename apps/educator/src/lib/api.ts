import { createApiClient } from '@lms/api-client';

export type EducatorApiClient = ReturnType<typeof createEducatorApiClient>;

/**
 * Server-side API client for the educator portal.
 *
 * The token is read from the server environment only, so it never reaches the
 * browser bundle. Authorization itself remains the API's job.
 */
export function createEducatorApiClient() {
  return createApiClient(getApiBaseUrl(), {
    getAccessToken: () => process.env.EDUCATOR_API_TOKEN,
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
 * Lives here rather than inline in a component because reading the clock is
 * impure; the React purity lint rule (correctly) forbids calling `Date.now()`
 * during render. Components receive the value as a prop so their output stays a
 * function of their inputs.
 */
export function currentTimeMs(): number {
  return new Date().getTime();
}
