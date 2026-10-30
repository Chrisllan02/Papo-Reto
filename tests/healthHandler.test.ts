import { afterEach, describe, expect, it } from 'vitest';
import handler from '../api/health';
import { createJsonResponse } from './testUtils';

describe('/api/health', () => {
  afterEach(() => {
    delete process.env.API_KEY;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('does not reveal which secrets are configured', () => {
    process.env.API_KEY = 'super-secret-key-value';
    process.env.BLOB_READ_WRITE_TOKEN = 'super-secret-blob-token';
    const response = createJsonResponse();

    handler({ method: 'GET', headers: {} } as any, response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.json<{ integrations: Record<string, boolean> }>().integrations).toEqual({ legislativeProxy: true });
    expect(response.body).not.toContain('super-secret');
  });

  it('rejects non-GET methods', () => {
    const response = createJsonResponse();

    handler({ method: 'POST', headers: {} } as any, response.res as any);

    expect(response.statusCode).toBe(405);
  });
});
