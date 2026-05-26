import { describe, expect, it } from 'vitest';
import handler from '../api/health';
import { createJsonResponse } from './testUtils';

describe('/api/health', () => {
  it('returns integration status without leaking secrets', () => {
    const response = createJsonResponse();

    handler({ method: 'GET', headers: {} } as any, response.res as any);

    const payload = response.json<{
      ok: boolean;
      service: string;
      integrations: Record<string, boolean>;
      API_KEY?: string;
    }>();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.service).toBe('paporeto');
    expect(payload.integrations).toHaveProperty('legislativeProxy', true);
    expect(payload).not.toHaveProperty('API_KEY');
  });
});
