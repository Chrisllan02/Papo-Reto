import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInitialData } from '../hooks/useCamaraData';

const notFound = { ok: false, status: 404, json: async () => ({}), text: async () => '' };

describe('useInitialData', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('em falha total devolve feed vazio e não grava fallback no cache de bootstrap', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useInitialData());
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 4000 });

    expect(result.current.feedItems).toEqual([]);
    expect(result.current.error).not.toBeNull();
    expect(localStorage.getItem('paporeto_bootstrap_v6')).toBeNull();
  });

  it('hidrata o sexo só de quem falta, com um único setState e sem refazer quem já tem', async () => {
    const cached = {
      politicians: [
        { id: 1, name: 'A', party: 'PT', state: 'SP', sex: 'M', role: 'Deputado Federal', hasApiIntegration: true },
        { id: 2, name: 'B', party: 'PT', state: 'SP', role: 'Deputado Federal', hasApiIntegration: true },
      ],
      feedItems: [],
      parties: [],
    };
    localStorage.setItem('paporeto_bootstrap_v6', JSON.stringify({ data: cached, timestamp: Date.now() }));
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({ dados: { sexo: 'F' } }),
      text: async () => '',
      url,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useInitialData());
    await waitFor(() => expect(result.current.politicians.find(p => p.id === 2)?.sex).toBe('F'));

    const requested = fetchMock.mock.calls.map(call => String(call[0]));
    expect(requested).toHaveLength(1);
    expect(requested[0]).toContain('/deputados/2');
    expect(result.current.politicians.find(p => p.id === 2)?.role).toBe('Deputada Federal');
  });
});
