import { afterEach, describe, expect, it } from 'vitest';
import handler from '../api/health';
import { createJsonResponse } from './testUtils';

describe('/api/health', () => {
  afterEach(() => {
    delete process.env.API_KEY;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('reports integration flags from the environment without echoing their values', () => {
    process.env.API_KEY = 'super-secret-key-value';
    process.env.BLOB_READ_WRITE_TOKEN = 'super-secret-blob-token';
    const response = createJsonResponse();

    handler({ method: 'GET', headers: {} } as any, response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.json<{ integrations: Record<string, boolean> }>().integrations).toMatchObject({
      ai: true,
      profileBlobCache: true,
    });
    expect(response.body).not.toContain('super-secret');
  });

  it('reports disabled integrations when nothing is configured', () => {
    delete process.env.GOOGLE_API_KEY;
    const response = createJsonResponse();

    handler({ method: 'GET', headers: {} } as any, response.res as any);

    expect(response.json<{ integrations: Record<string, boolean> }>().integrations).toMatchObject({
      ai: false,
      profileBlobCache: false,
    });
  });

  it('rejects non-GET methods', () => {
    const response = createJsonResponse();

    handler({ method: 'POST', headers: {} } as any, response.res as any);

    expect(response.statusCode).toBe(405);
  });
});
