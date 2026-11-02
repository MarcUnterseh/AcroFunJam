import { describe, expect, it } from 'vitest';
import { createApiClient } from './client';

describe('createApiClient', () => {
  it('should call the API on the configured base URL when a request is sent', async () => {
    const requests: Request[] = [];
    const fakeFetch = async (request: Request) => {
      requests.push(request);
      return new Response(null, { status: 200 });
    };
    const client = createApiClient({ baseUrl: 'http://api.test', fetch: fakeFetch });

    const { response } = await client.GET('/health');

    expect(response.status).toBe(200);
    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual(['GET http://api.test/health']);
  });
});
