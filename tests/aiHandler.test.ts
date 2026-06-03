import { beforeEach, describe, expect, it } from 'vitest';
import handler from '../api/ai';
import { createJsonResponse } from './testUtils';

describe('/api/ai', () => {
  beforeEach(() => {
    process.env.API_KEY = '';
    process.env.GOOGLE_API_KEY = '';
  });

  it('rate limits repeated requests from the same client bucket', async () => {
    let lastResponse = createJsonResponse();

    for (let index = 0; index < 21; index += 1) {
      lastResponse = createJsonResponse();
      await handler({
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.42' },
        body: { action: 'generateEducationalContent' },
      } as any, lastResponse.res as any);
    }

    expect(lastResponse.statusCode).toBe(429);
    expect(lastResponse.json()).toEqual({ error: 'Too many requests.' });
  });
});
