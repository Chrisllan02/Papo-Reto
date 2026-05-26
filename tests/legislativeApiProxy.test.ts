import { describe, expect, it } from 'vitest';
import { getLegislativeApiUrl } from '../utils/legislativeApiProxy';

describe('getLegislativeApiUrl', () => {
  it('keeps local development calls direct by default', () => {
    const url = 'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1';
    expect(getLegislativeApiUrl(url)).toBe(url);
  });

  it('does not proxy unsupported hosts', () => {
    const url = 'https://example.com/api';
    expect(getLegislativeApiUrl(url)).toBe(url);
  });

  it('returns invalid URLs unchanged', () => {
    expect(getLegislativeApiUrl('not a url')).toBe('not a url');
  });
});
