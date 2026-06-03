import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/profile-cache';
import { createJsonResponse } from './testUtils';
import { put } from '@vercel/blob';

vi.mock('@vercel/blob', () => ({
  list: vi.fn(async () => ({ blobs: [] })),
  put: vi.fn(async () => ({ url: 'https://blob.example/politicians/1.json' })),
}));

describe('/api/profile-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PROFILE_CACHE_WRITE_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';
  });

  it('rejects production writes when no write secret is configured', async () => {
    process.env.VERCEL = '1';
    const response = createJsonResponse();

    await handler({
      method: 'PUT',
      headers: { 'x-forwarded-for': '10.0.0.1' },
      query: { type: 'politician', id: '1' },
      body: { name: 'Maria' },
    } as any, response.res as any);

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'Profile cache writes are not configured.' });
  });

  it('rejects writes with an invalid bearer token', async () => {
    process.env.PROFILE_CACHE_WRITE_SECRET = 'write-secret';
    const response = createJsonResponse();

    await handler({
      method: 'PUT',
      headers: { authorization: 'Bearer wrong', 'x-forwarded-for': '10.0.0.2' },
      query: { type: 'politician', id: '1' },
      body: { name: 'Maria' },
    } as any, response.res as any);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('allows writes with the configured bearer token', async () => {
    process.env.PROFILE_CACHE_WRITE_SECRET = 'write-secret';
    const response = createJsonResponse();

    await handler({
      method: 'PUT',
      headers: { authorization: 'Bearer write-secret', 'x-forwarded-for': '10.0.0.3' },
      query: { type: 'politician', id: '1' },
      body: { name: 'Maria' },
    } as any, response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(put).toHaveBeenCalledWith(
      'politicians/1.json',
      expect.stringContaining('"name": "Maria"'),
      expect.objectContaining({ access: 'public', addRandomSuffix: false })
    );
  });
});
