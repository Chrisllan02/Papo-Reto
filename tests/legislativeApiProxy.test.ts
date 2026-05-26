import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLegislativeApiUrl } from '../utils/legislativeApiProxy';

describe('getLegislativeApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps local development calls direct by default', () => {
    const url = 'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1';
    expect(getLegislativeApiUrl(url)).toBe(url);
  });

  it('uses the production API origin when local bootstrap points to production', () => {
    vi.stubEnv('VITE_BOOTSTRAP_ENDPOINT', 'https://papo-reto-beige.vercel.app/api/bootstrap');
    const url = 'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1';
    expect(getLegislativeApiUrl(url)).toBe(`https://papo-reto-beige.vercel.app/api/camara?url=${encodeURIComponent(url)}`);
  });

  it('does not proxy unsupported hosts', () => {
    const url = 'https://example.com/api';
    expect(getLegislativeApiUrl(url)).toBe(url);
  });

  it('returns invalid URLs unchanged', () => {
    expect(getLegislativeApiUrl('not a url')).toBe('not a url');
  });
});
