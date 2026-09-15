import type { HealthResponse } from '@lms/types';

function isHealthResponse(body: unknown): body is HealthResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === 'ok'
  );
}

export function createApiClient(baseUrl: string) {
  return {
    async health(): Promise<HealthResponse> {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/api/v1/health`,
      );
      if (!response.ok)
        throw new Error(`Health request failed: ${response.status}`);
      const body: unknown = await response.json();
      if (!isHealthResponse(body)) throw new Error('Invalid health response');
      return { status: 'ok' };
    },
  };
}
