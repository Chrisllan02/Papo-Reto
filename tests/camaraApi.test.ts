import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CACHE_PREFIX,
  calculateProgress,
  cleanText,
  enrichPoliticianData,
  fetchDeputados,
  fetchEventDetails,
  fetchGlobalVotacoes,
  fetchAPI,
  fetchPartidos,
  formatPersonName,
  prefetchPoliticianProfile,
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
    expect(calculateProgress('Arquivada')).toEqual({ progress: 0, label: 'Arquivada', closed: true });
    expect(calculateProgress('Transformado em Norma Jurídica')).toMatchObject({ progress: 100 });
    expect(calculateProgress('Aguardando Designação de Relator')).toMatchObject({ progress: 30, label: 'Comissões' });
    expect(calculateProgress('Pronta para Pauta no Plenário')).toMatchObject({ progress: 60 });
    expect(calculateProgress('Aguardando Apreciação pelo Senado Federal')).toMatchObject({ progress: 80 });
    expect(calculateProgress('Aguardando Sanção')).toMatchObject({ progress: 90 });
  });

  it('pronta para pauta na comissão não vira plenário', () => {
    expect(calculateProgress('Pronta para Pauta na Comissão de Constituição e Justiça e de Cidadania (CCJC)')).toMatchObject({ progress: 30, label: 'Comissões' });
  });

  it('situações terminais não ganham progresso falso de tramitação', () => {
    expect(calculateProgress('Retirado pelo(a) Autor(a)')).toEqual({ progress: 0, label: 'Retirada pelo autor', closed: true });
    expect(calculateProgress('Perdeu a Eficácia')).toMatchObject({ progress: 0, closed: true });
    expect(calculateProgress('Prejudicada')).toMatchObject({ progress: 0, closed: true });
  });

  it('não inventa andamento quando não há situação', () => {
    expect(calculateProgress('')).toMatchObject({ progress: 0 });
  });
});

describe('formatação de texto', () => {
  it('nomes em caixa de título, partículas em minúsculo', () => {
    expect(formatPersonName('ALAN RICK')).toBe('Alan Rick');
    expect(formatPersonName('MARIA DO ROSÁRIO')).toBe('Maria do Rosário');
    expect(formatPersonName('JOSÉ  DE  ABREU-LIMA')).toBe('José de Abreu-Lima');
  });

  it('ementa preserva siglas', () => {
    expect(cleanText('  Altera a  PEC 45/2019 ')).toBe('Altera a PEC 45/2019');
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
        return jsonResponse({ dados: [
          { id: '2367475-47', uri: 'x/votacoes/2367475-47', siglaOrgao: 'PLEN', descricao: 'Votação sem proposição', dataHoraRegistro: '2024-05-09T22:30:00', aprovacao: 1 },
          { id: '9-1', uri: 'x/votacoes/9-1', siglaOrgao: 'CCJC', descricao: 'Aprovada a PEC 45/2019', uriProposicaoObjeto: 'x/proposicoes/2196833', dataHoraRegistro: '2024-05-08T10:00:00', aprovacao: 1 },
        ] });
      }
      if (decoded.includes('/proposicoes')) {
        return jsonResponse({ dados: [{ id: 2367475, siglaTipo: 'PL', numero: 1, ano: 2024, ementa: 'Ementa', dataApresentacao: undefined }] });
      }
      return jsonResponse({}, false);
    }));

    const feed = await fetchGlobalVotacoes();
    const vote = feed.find(item => item.title.startsWith('PLEN'))!;
    const proposition = feed.find(item => item.title === 'PL 1/2024')!;

    expect(proposition.type).toBe('proposicao');
    expect(proposition.propositionId).toBe(2367475);
    expect(vote.politicianId).toBeUndefined();

    expect(vote.id).not.toBe(2367475);
    expect(vote.id).toBeLessThan(0);
    expect(vote.date).toBe('09/05/2024');
    expect(vote.status).toBe('Aprovado');
    expect(proposition.id).toBe(2367475);
    expect(proposition.date).toBeUndefined();
    expect(feed.every(item => (item.status as string | undefined) !== 'Concluído')).toBe(true);

    const voteWithProposition = feed.find(item => item.title.startsWith('CCJC'))!;
    expect(voteWithProposition.propositionId).toBe(2196833);
    expect(voteWithProposition.politicianId).toBeUndefined();
    expect(voteWithProposition.description).toBe('Aprovada a PEC 45/2019');
  });

  it('em falha de rede devolve o cache vencido em vez de nada', async () => {
    const parties = [{ id: 1, sigla: 'PT', nome: 'Partido dos Trabalhadores' }];
    localStorage.setItem(`${CACHE_PREFIX}partidos_list`, JSON.stringify({ data: parties, timestamp: Date.now() - 1000 * 60 * 60 * 30 }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(fetchPartidos()).resolves.toEqual(parties);
  });

  it('deputado sem sexo informado recebe papel neutro e mandato sem datas inventadas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ dados: [{ id: 1, nome: 'ALAN RICK', siglaPartido: 'UNIÃO', siglaUf: 'AC' }] })));

    const [deputy] = await fetchDeputados();

    expect(deputy.name).toBe('Alan Rick');
    expect(deputy.role).toBe('Deputado(a) Federal');
    expect(deputy.mandate).toEqual({ start: '', end: '' });
  });

  it('senador: exercício em aberto fica sem fim e o mandato termina na última legislatura', async () => {
    const xml = `<ListaParlamentarEmExercicio><Parlamentares><Parlamentar>
      <IdentificacaoParlamentar><CodigoParlamentar>6001</CodigoParlamentar><NomeParlamentar>ANA</NomeParlamentar><SiglaPartidoParlamentar>PT</SiglaPartidoParlamentar><UfParlamentar>BA</UfParlamentar></IdentificacaoParlamentar>
      <Mandato>
        <PrimeiraLegislaturaDoMandato><DataInicio>2023-02-01</DataInicio><DataFim>2027-01-31</DataFim></PrimeiraLegislaturaDoMandato>
        <SegundaLegislaturaDoMandato><DataInicio>2027-02-01</DataInicio><DataFim>2031-01-31</DataFim></SegundaLegislaturaDoMandato>
        <Exercicios>
          <Exercicio><DataInicio>2023-02-01</DataInicio><DataFim>2023-06-01</DataFim></Exercicio>
          <Exercicio><DataInicio>2023-10-01</DataInicio></Exercicio>
        </Exercicios>
      </Mandato>
    </Parlamentar></Parlamentares></ListaParlamentarEmExercicio>`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => xml }));

    const [senator] = await fetchSenadores();

    expect(senator.mandate).toEqual({ start: '2023-02-01', end: '2031-01-31' });
    expect(senator.exerciseStart).toBe('2023-10-01');
    expect(senator.exerciseEnd).toBe('');
  });

  it('o limite de requisições (429) expira depois de 60 s', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(fetchAPI('https://dadosabertos.camara.leg.br/api/v2/deputados', 0)).rejects.toMatchObject({ status: 429 });
    expect(isApiRateLimited()).toBe(true);

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    expect(isApiRateLimited()).toBe(false);
  });

  it('evento: convidados só da lista oficial e falha de sub-requisição não vira "sem convidados" no cache', async () => {
    const event = { id: 555, descricao: 'Audiência. Convidados: Fulano de Tal, Ciclano', uriConvidados: 'https://dadosabertos.camara.leg.br/api/v2/eventos/555/convidados' };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const decoded = decodeURIComponent(String(url));
      if (decoded.includes('/convidados')) return { ok: false, status: 403, json: async () => ({}) };
      return jsonResponse({ dados: event });
    }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(fetchEventDetails(555)).rejects.toThrow();
    expect(localStorage.getItem(`${CACHE_PREFIX}event_details_555`)).toBeNull();

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const decoded = decodeURIComponent(String(url));
      if (decoded.includes('/convidados')) return jsonResponse({ dados: [{ nome: 'Beltrana' }] });
      return jsonResponse({ dados: event });
    }));
    await expect(fetchEventDetails(555)).resolves.toMatchObject({ guests: ['Beltrana'] });
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

    it('soma todas as páginas de despesas e calcula percentuais sem estorno negativo', async () => {
      const page = (dados: unknown[], next?: string) => jsonResponse({ dados, links: next ? [{ rel: 'next', href: next }] : [] });
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const decoded = decodeURIComponent(String(url));
        if (decoded.includes('profile-cache')) return jsonResponse({}, false);
        if (decoded.includes('/despesas') && decoded.includes('pagina=2')) {
          return page([{ valorLiquido: 50, tipoDespesa: 'Telefonia' }, { valorLiquido: -30, tipoDespesa: 'Passagens' }]);
        }
        if (decoded.includes('/despesas')) {
          return page([{ valorLiquido: 100, tipoDespesa: 'Combustíveis' }], 'https://dadosabertos.camara.leg.br/api/v2/deputados/78/despesas?pagina=2&itens=100');
        }
        return jsonResponse({ dados: [] });
      }));

      const result = await enrichPoliticianData({ ...basePolitician, id: 78 });

      expect(result.stats.spending).toBe(120);
      expect(result.detailedExpenses).toHaveLength(3);
      expect(result.expensesBreakdown!.every(e => e.percent >= 0 && e.percent <= 100)).toBe(true);
      expect(result.expensesBreakdown!.reduce((sum, e) => sum + e.percent, 0)).toBeCloseTo(100);
    });

    it('não apresenta total quando o teto de páginas é atingido', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const decoded = decodeURIComponent(String(url));
        if (decoded.includes('profile-cache')) return jsonResponse({}, false);
        if (decoded.includes('/despesas')) {
          return jsonResponse({ dados: [{ valorLiquido: 10, tipoDespesa: 'Combustíveis' }], links: [{ rel: 'next', href: 'https://dadosabertos.camara.leg.br/api/v2/deputados/79/despesas?pagina=n' }] });
        }
        return jsonResponse({ dados: [] });
      }));

      const result = await enrichPoliticianData({ ...basePolitician, id: 79 });

      expect(result.stats.spending).toBe(0);
      expect(localStorage.getItem(getFullProfileCacheKey(79))).toBeNull();
    });

    it('sub-chamada com falha não zera o campo nem marca o perfil como completo', async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const decoded = decodeURIComponent(String(url));
        if (decoded.includes('profile-cache')) return init?.method === 'POST' ? jsonResponse({}) : jsonResponse({}, false);
        if (decoded.includes('/despesas')) return { ok: false, status: 403, json: async () => ({}) };
        if (decoded.includes('/frentes')) return jsonResponse({ dados: Array.from({ length: 10 }, (_, id) => ({ id, titulo: `Frente ${id}` })) });
        return routes(url);
      });
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const stale = { ...basePolitician, id: 80, stats: { spending: 999, projects: 0 }, detailedExpenses: [{ id: 0, value: 999 }] };
      const staleTimestamp = Date.now() - 1000 * 60 * 60 * 30;
      localStorage.setItem(getFullProfileCacheKey(80), JSON.stringify({ data: stale, timestamp: staleTimestamp }));

      const result = await enrichPoliticianData({ ...basePolitician, id: 80 });

      expect(result.fronts).toHaveLength(10);
      expect(result.stats.spending).toBe(999);
      expect(result.detailedExpenses).toHaveLength(1);
      expect(JSON.parse(localStorage.getItem(getFullProfileCacheKey(80))!).timestamp).toBe(staleTimestamp);
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    });

    it('prefetch com falha não marca o perfil como pré-carregado', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const decoded = decodeURIComponent(String(url));
        if (decoded.includes('profile-cache')) return jsonResponse({}, false);
        return { ok: false, status: 403, json: async () => ({}) };
      }));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await prefetchPoliticianProfile({ ...basePolitician, id: 81 });

      expect(localStorage.getItem('paporeto_prefetched_profiles_v1')).toBeNull();
    });

    it('mesclar cache local vencido com o do servidor não rejuvenesce o timestamp', async () => {
      const staleTimestamp = Date.now() - 1000 * 60 * 60 * 30;
      localStorage.setItem(getFullProfileCacheKey(82), JSON.stringify({ data: { ...basePolitician, id: 82 }, timestamp: staleTimestamp }));
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const decoded = decodeURIComponent(String(url));
        if (decoded.includes('profile-cache')) {
          return jsonResponse({ id: 82, fronts: [{ id: 1, title: 'Frente' }], updatedAt: new Date().toISOString() });
        }
        return jsonResponse({ dados: [] });
      }));

      await enrichPoliticianData({ ...basePolitician, id: 82 });

      expect(JSON.parse(localStorage.getItem(getFullProfileCacheKey(82))!).timestamp).toBe(staleTimestamp);
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
