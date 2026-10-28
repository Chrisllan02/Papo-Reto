import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CACHE_PREFIX,
  calculateProgress,
  enrichPoliticianData,
  fetchGlobalVotacoes,
  fetchAPI,
  fetchPartidos,
  isApiRateLimited,
  fetchSenadores,
  getBrazilDateString,
  getFullProfileCacheKey,
} from '../services/camaraApi';
import type { Politician } from '../types';

const jsonResponse = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => body, text: async () => JSON.stringify(body) });

const basePolitician = { id: 77, name: 'Fulano', party: 'PT', state: 'SP', role: 'Deputado Federal', hasApiIntegration: true, stats: { spending: 0, projects: 0 }, mandate: { start: '2023-02-01', end: '2027-01-31' } } as unknown as Politician;

describe('calculateProgress', () => {
  it('trata situações reais da Câmara', () => {
    expect(calculateProgress('Arquivada')).toEqual({ progress: 0, label: 'Arquivada' });
    expect(calculateProgress('Transformado em Norma Jurídica')).toMatchObject({ progress: 100 });
    expect(calculateProgress('Aguardando Designação de Relator')).toMatchObject({ progress: 30, label: 'Comissões' });
    expect(calculateProgress('Pronta para Pauta no Plenário')).toMatchObject({ progress: 60 });
    expect(calculateProgress('Aguardando Apreciação pelo Senado Federal')).toMatchObject({ progress: 80 });
    expect(calculateProgress('Aguardando Sanção')).toMatchObject({ progress: 90 });
  });

  it('não inventa andamento quando não há situação', () => {
    expect(calculateProgress('')).toMatchObject({ progress: 0 });
  });
});

describe('getBrazilDateString', () => {
  it('usa o fuso de Brasília perto da meia-noite UTC', () => {
    const afterUtcMidnight = new Date('2024-05-10T01:30:00Z');
    expect(afterUtcMidnight.toISOString().split('T')[0]).toBe('2024-05-10');
    expect(getBrazilDateString(0, afterUtcMidnight)).toBe('2024-05-09');
    expect(getBrazilDateString(7, afterUtcMidnight)).toBe('2024-05-02');
  });
});

describe('camaraApi com fetch simulado', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('não cacheia lista vazia de partidos por 24h', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ dados: [] })));
    await expect(fetchPartidos()).resolves.toEqual([]);
    expect(localStorage.getItem(`${CACHE_PREFIX}partidos_list`)).toBeNull();
  });

  it('descarta senador sem código em vez de inventar id', async () => {
    const xml = `<ListaParlamentarEmExercicio><Parlamentares>
      <Parlamentar><IdentificacaoParlamentar><CodigoParlamentar>5012</CodigoParlamentar><NomeParlamentar>ANA</NomeParlamentar><SiglaPartidoParlamentar>PT</SiglaPartidoParlamentar><UfParlamentar>BA</UfParlamentar></IdentificacaoParlamentar></Parlamentar>
      <Parlamentar><IdentificacaoParlamentar><NomeParlamentar>SEM CODIGO</NomeParlamentar><SiglaPartidoParlamentar>PL</SiglaPartidoParlamentar><UfParlamentar>SP</UfParlamentar></IdentificacaoParlamentar></Parlamentar>
    </Parlamentares></ListaParlamentarEmExercicio>`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => xml }));

    const senators = await fetchSenadores();
    expect(senators.map(s => s.id)).toEqual([5012]);
    expect(senators[0].mandate.end).toBe('');
    expect((fetch as any).mock.calls[0][1].headers.Accept).toBe('text/xml');
  });

  it('não repete a chamada em 429 e marca o limite da sessão', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchAPI('https://dadosabertos.camara.leg.br/api/v2/deputados', 3, true, 1)).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isApiRateLimited()).toBe(true);
  });

  it('feed: isola falhas, usa ids de votação sem colisão e não inventa data/status', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const decoded = decodeURIComponent(String(url));
      if (decoded.includes('/votacoes')) {
        return jsonResponse({ dados: [{ id: '2367475-47', uri: 'x/votacoes/2367475-47', siglaOrgao: 'PLEN', descricao: 'Votação sem proposição', dataHoraRegistro: '2024-05-09T22:30:00', aprovacao: 1 }] });
      }
      if (decoded.includes('/proposicoes')) {
        return jsonResponse({ dados: [{ id: 2367475, siglaTipo: 'PL', numero: 1, ano: 2024, ementa: 'Ementa', dataApresentacao: undefined }] });
      }
      return jsonResponse({}, false);
    }));

    const feed = await fetchGlobalVotacoes();
    const vote = feed.find(item => item.title.startsWith('PLEN'))!;
    const proposition = feed.find(item => item.title === 'PL 1/2024')!;

    expect(vote.id).not.toBe(2367475);
    expect(vote.id).toBeLessThan(0);
    expect(vote.date).toBe('09/05/2024');
    expect(vote.status).toBe('Aprovado');
    expect(proposition.id).toBe(2367475);
    expect(proposition.date).toBeUndefined();
    expect(feed.every(item => (item.status as string | undefined) !== 'Concluído')).toBe(true);
  });

  it('feed: quando as três chamadas falham, devolve vazio e não grava cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchGlobalVotacoes()).resolves.toEqual([]);
    expect(localStorage.getItem(`${CACHE_PREFIX}global_feed_hybrid_v2`)).toBeNull();
  });

  describe('enrichPoliticianData com cota estourada', () => {
    const routes = (url: string) => {
      const decoded = decodeURIComponent(String(url));
      if (decoded.includes('profile-cache')) return jsonResponse({}, false);
      if (decoded.includes('/despesas')) return jsonResponse({ dados: [{ valorLiquido: 100, valorDocumento: 100, tipoDespesa: 'Combustíveis', nomeFornecedor: 'Posto', mes: 1, ano: 2024 }] });
      if (decoded.includes('/discursos')) return jsonResponse({ dados: [{ dataHoraInicio: '2024-01-01T10:00', transcricao: 'T'.repeat(5000), tipoDiscurso: 'Discurso' }] });
      return jsonResponse({ dados: [] });
    };

    it('devolve o perfil baixado mesmo quando o setItem falha', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: string) => routes(url)));
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });

      const result = await enrichPoliticianData(basePolitician);

      expect(result.detailedExpenses).toHaveLength(1);
      expect(result.stats.spending).toBe(100);
    });

    it('libera cache antigo para gravar o perfil e não guarda a transcrição integral', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: string) => routes(url)));
      const oldKey = `${CACHE_PREFIX}old_entry`;
      localStorage.setItem(oldKey, JSON.stringify({ data: 'y'.repeat(3000), timestamp: 1 }));

      const realSet = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
        if (this.getItem(oldKey) && key !== oldKey) throw new DOMException('full', 'QuotaExceededError');
        realSet.call(this, key, value);
      });

      const result = await enrichPoliticianData(basePolitician);

      expect(result.speeches?.[0].transcription).toHaveLength(5000);
      expect(localStorage.getItem(oldKey)).toBeNull();
      const stored = JSON.parse(localStorage.getItem(getFullProfileCacheKey(77))!);
      expect(stored.data.detailedExpenses).toHaveLength(1);
      expect(stored.data.speeches[0].transcription).toBeUndefined();
    });

    it('não renova o timestamp de um perfil antigo mais completo', async () => {
      const staleTimestamp = Date.now() - 1000 * 60 * 60 * 30;
      const richProfile = { ...basePolitician, detailedExpenses: Array.from({ length: 20 }, (_, id) => ({ id, value: 1 })) };
      localStorage.setItem(getFullProfileCacheKey(77), JSON.stringify({ data: richProfile, timestamp: staleTimestamp }));
      vi.stubGlobal('fetch', vi.fn(async (url: string) => routes(url)));

      const result = await enrichPoliticianData(basePolitician);

      expect(result.detailedExpenses).toHaveLength(20);
      expect(JSON.parse(localStorage.getItem(getFullProfileCacheKey(77))!).timestamp).toBe(staleTimestamp);
    });
  });
});
