import { renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInitialData } from '../hooks/useCamaraData';

const { generateEducationalContent } = vi.hoisted(() => ({ generateEducationalContent: vi.fn() }));
vi.mock('../services/ai', () => ({ generateEducationalContent }));

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
    expect(localStorage.getItem('paporeto_bootstrap_v7')).toBeNull();
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
    localStorage.setItem('paporeto_bootstrap_v7', JSON.stringify({ data: cached, timestamp: Date.now() }));
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

  it('com conteúdo de reserva tenta a IA uma única vez e não troca nem grava os artigos', async () => {
    const cached = {
      politicians: [{ id: 1, name: 'A', party: 'PT', state: 'SP', sex: 'M', role: 'Deputado Federal', hasApiIntegration: true }],
      feedItems: [],
      parties: [],
    };
    localStorage.setItem('paporeto_bootstrap_v7', JSON.stringify({ data: cached, timestamp: Date.now() }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound));
    generateEducationalContent.mockResolvedValue({
      articles: [{ title: 'T', text: 'X', topic: 'Orçamento', legislation: 'L', impact: 'I' }],
      isFallback: true,
    });

    const { result } = renderHook(() => {
      const data = useInitialData();
      const { loadEducationalContent } = data;
      useEffect(() => {
        void loadEducationalContent();
      }, [loadEducationalContent]);
      return data;
    });

    await waitFor(() => expect(generateEducationalContent).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isEducationalContentLoading).toBe(false));
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(result.current.articles.some(a => a.title === 'T')).toBe(false);

    expect(generateEducationalContent).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('paporeto_bootstrap_v7') || '{}').data.articles).toBeUndefined();
  });

  it('grava carga sem senadores com validade curta e busca de novo depois de 10 minutos', async () => {
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
    const deputies = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, nome: `DEP ${i}`, siglaPartido: 'PT', siglaUf: 'SP', sexo: 'M' }));
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('legis.senado.leg.br')) return notFound;
      if (url.includes('/deputados?')) return ok({ dados: deputies });
      if (url.includes('/partidos?')) return ok({ dados: [{ id: 1, sigla: 'PT', nome: 'Partido' }] });
      if (url.includes('/proposicoes?')) return ok({ dados: [{ id: 9, siglaTipo: 'PL', numero: 1, ano: 2026, ementa: 'Texto' }] });
      return ok({ dados: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const first = renderHook(() => useInitialData());
    await waitFor(() => expect(first.result.current.isLoading).toBe(false), { timeout: 4000 });
    expect(localStorage.getItem('paporeto_bootstrap_v7')).not.toBeNull();
    first.unmount();

    const realNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(realNow + 11 * 60 * 1000);
    fetchMock.mockClear();
    const second = renderHook(() => useInitialData());
    expect(second.result.current.isLoading).toBe(true);
    await waitFor(() => expect(fetchMock.mock.calls.some(call => String(call[0]).includes('legis.senado.leg.br'))).toBe(true));
    second.unmount();
    nowSpy.mockRestore();
  });

  it('com as fontes oficiais fora usa o snapshot versionado e avisa a data dele', async () => {
    const snapshot = {
      version: 1,
      generatedAt: '2026-11-02T17:00:00.000Z',
      camara: { dados: [{ id: 204554, nome: 'ANA DEPUTADA', siglaPartido: 'PT', siglaUf: 'BA', urlFoto: '', email: null }] },
      senado: { ListaParlamentarEmExercicio: { Parlamentares: { Parlamentar: { IdentificacaoParlamentar: { CodigoParlamentar: '5672', NomeParlamentar: 'ALAN RICK', SiglaPartidoParlamentar: 'REPUBLICANOS', UfParlamentar: 'AC' } } } } },
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/snapshots/parlamentares.json'
      ? { ok: true, status: 200, json: async () => snapshot }
      : { ok: false, status: 503, json: async () => ({}), text: async () => '' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useInitialData());
    await waitFor(() => expect(result.current.politicians.map(p => p.id)).toEqual([204554, 5672]), { timeout: 15000 });

    expect(result.current.error).toContain('02/11/2026');
    expect(localStorage.getItem('paporeto_bootstrap_v7')).toBeNull();
  }, 20000);
});
