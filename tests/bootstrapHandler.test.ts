import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { mergeWithPreviousBootstrap, refreshLegislativeBootstrap } from '../api/bootstrap';
import { buildLegislativeBootstrap } from '../api/lib/legislativeBootstrap';
import { clearServerCacheForTests } from '../api/lib/serverCache';
import { createJsonResponse } from './testUtils';

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

const xmlResponse = (body: string) => new Response(body, {
  status: 200,
  headers: { 'content-type': 'text/xml' },
});

describe('/api/bootstrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearServerCacheForTests();
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('proposição sai com tipo e id próprios, ementa sem perder siglas e nome em caixa de título', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/deputados?')) return jsonResponse({ dados: [{ id: 1, nome: 'MARIA DO ROSÁRIO', siglaPartido: 'PT', siglaUf: 'RS', sexo: 'F' }] });
      if (url.includes('/proposicoes?')) {
        return jsonResponse({ dados: [{ id: 2196833, siglaTipo: 'PEC', numero: 45, ano: 2019, ementa: 'Altera a PEC 45/2019 do SUS', dataApresentacao: '2026-05-20T10:00:00' }] });
      }
      return jsonResponse({ dados: [] });
    }));
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, response.res as any);

    const { data } = response.json<{ data: { politicians: any[]; feedItems: any[] } }>();
    const proposition = data.feedItems.find((item) => item.id === 2196833);
    expect(proposition).toMatchObject({ type: 'proposicao', propositionId: 2196833, description: 'Altera a PEC 45/2019 do SUS' });
    expect(proposition.candidateId).toBeUndefined();
    expect(data.politicians.find((politician) => politician.id === 1).name).toBe('Maria do Rosário');
  });

  it('builds and caches initial legislative data', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/deputados?')) {
        return jsonResponse({
          dados: [{
            id: 1,
            nome: 'MARIA TESTE',
            siglaPartido: 'PT',
            siglaUf: 'SP',
            urlFoto: 'https://example.com/maria.jpg',
            sexo: 'F',
            email: 'maria@example.com',
          }],
        });
      }

      if (url.includes('/partidos?')) {
        return jsonResponse({ dados: [{ id: 10, sigla: 'PT', nome: 'Partido dos Trabalhadores', uri: 'x' }] });
      }

      if (url.includes('/votacoes?')) {
        return jsonResponse({
          dados: [{
            id: '123',
            siglaOrgao: 'PLEN',
            uri: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/123',
            dataHoraRegistro: '2026-05-20T10:00:00',
            descricao: 'Votacao sobre saude publica',
            aprovacao: 1,
            uriEvento: 'https://dadosabertos.camara.leg.br/api/v2/eventos/77',
          }],
        });
      }

      if (url.includes('/proposicoes?')) {
        return jsonResponse({ dados: [] });
      }

      if (url.includes('/eventos?')) {
        return jsonResponse({ dados: [] });
      }

      if (url.includes('legis.senado.leg.br')) {
        return xmlResponse(`
          <ListaParlamentarEmExercicio>
            <Parlamentar>
              <CodigoParlamentar>99</CodigoParlamentar>
              <NomeParlamentar>JOAO SENADOR</NomeParlamentar>
              <SiglaPartidoParlamentar>MDB</SiglaPartidoParlamentar>
              <UfParlamentar>RJ</UfParlamentar>
              <SexoParlamentar>M</SexoParlamentar>
              <UrlFotoParlamentar>https://example.com/joao.jpg</UrlFotoParlamentar>
              <NomeCompletoParlamentar>JOAO DA SILVA</NomeCompletoParlamentar>
              <EmailParlamentar>joao@senado.leg.br</EmailParlamentar>
              <NumeroTelefone>3303-0000</NumeroTelefone>
              <UrlPaginaParlamentar>https://www25.senado.leg.br/web/senadores/senador/-/perfil/99</UrlPaginaParlamentar>
              <NomeBloco>BLOCO TESTE</NomeBloco>
              <MembroMesa>Sim</MembroMesa>
              <Mandato>
                <DescricaoParticipacao>Titular</DescricaoParticipacao>
                <DataInicio>2023-02-01</DataInicio>
                <DataFim>2031-01-31</DataFim>
                <Suplente>
                  <DescricaoParticipacao>1º Suplente</DescricaoParticipacao>
                  <NomeParlamentar>SUPLENTE TESTE</NomeParlamentar>
                </Suplente>
              </Mandato>
            </Parlamentar>
          </ListaParlamentarEmExercicio>
        `);
      }

      return jsonResponse({ dados: [] });
    });

    vi.stubGlobal('fetch', fetchMock);
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, response.res as any);

    const payload = response.json<{
      ok: boolean;
      partial: boolean;
      warnings: string[];
      data: { politicians: any[]; feedItems: any[]; parties: any[]; articles: any[]; partial: boolean; warnings: string[] };
    }>();
    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.partial).toBe(false);
    expect(payload.warnings).toEqual([]);
    expect(payload.data.politicians).toHaveLength(2);
    expect(payload.data.partial).toBe(false);
    expect(payload.data.feedItems).toHaveLength(1);
    expect(payload.data.feedItems[0].category).toBe('health');
    expect(payload.data.feedItems[0].summary).toContain('Movimentação de votação');
    expect(payload.data.feedItems[0].whyItMatters).toContain('andamento real da pauta');
    expect(payload.data.feedItems[0].approval).toBe(1);
    expect(payload.data.feedItems[0].eventUrl).toContain('/eventos/77');
    const senator = payload.data.politicians.find((politician) => politician.id === 99);
    expect(senator.email).toBe('joao@senado.leg.br');
    expect(senator.parliamentaryBlock).toBe('BLOCO TESTE');
    expect(senator.isBoardMember).toBe(true);
    expect(senator.suplentes).toEqual(['1º Suplente - SUPLENTE TESTE']);
    expect(payload.data.parties).toHaveLength(1);
    expect(payload.data.feedItems[0].sourceUrl).toMatch(/^https:\/\/www\.camara\.leg\.br\//);
    expect(payload.data.articles[0]).toMatchObject({ id: 1000, sourceUrl: payload.data.feedItems[0].sourceUrl });
  });

  it('enriches useful agenda events and drops generic agenda noise', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/deputados?')) {
        return jsonResponse({
          dados: [{
            id: 1,
            nome: 'MARIA TESTE',
            siglaPartido: 'PT',
            siglaUf: 'SP',
            urlFoto: 'https://example.com/maria.jpg',
            sexo: 'F',
            email: 'maria@example.com',
          }],
        });
      }

      if (url.includes('/partidos?')) {
        return jsonResponse({ dados: [{ id: 10, sigla: 'PT', nome: 'Partido dos Trabalhadores', uri: 'x' }] });
      }

      if (url.includes('/votacoes?') || url.includes('/proposicoes?')) {
        return jsonResponse({ dados: [] });
      }

      if (url.includes('/eventos?')) {
        return jsonResponse({
          dados: [
            {
              id: 100,
              descricaoTipo: 'Reunião Deliberativa',
              descricao: 'Discussão e votação de propostas legislativas',
              dataHoraInicio: '2026-06-09T10:00:00',
              situacao: 'Convocada',
              orgaos: [{ sigla: 'CCJC' }],
              localCamara: { nome: 'Plenário 01' },
            },
            {
              id: 101,
              descricaoTipo: 'Audiência Pública',
              descricao: 'Debater a situação do Instituto Nacional do Câncer INCA e de seus servidores\n\n1) CONVIDADO TESTE - Ministério da Saúde',
              dataHoraInicio: '2026-06-09T16:00:00',
              situacao: 'Convocada',
              orgaos: [{ sigla: 'CASP' }],
              localCamara: { nome: 'Plenário 08' },
              urlDocumentoPauta: 'https://example.com/pauta.pdf',
              urlRegistro: 'https://example.com/evento/101',
            },
          ],
        });
      }

      if (url.includes('legis.senado.leg.br')) {
        return xmlResponse(`
          <ListaParlamentarEmExercicio>
            <Parlamentar>
              <CodigoParlamentar>99</CodigoParlamentar>
              <NomeParlamentar>JOAO SENADOR</NomeParlamentar>
              <SiglaPartidoParlamentar>MDB</SiglaPartidoParlamentar>
              <UfParlamentar>RJ</UfParlamentar>
              <SexoParlamentar>M</SexoParlamentar>
            </Parlamentar>
          </ListaParlamentarEmExercicio>
        `);
      }

      return jsonResponse({ dados: [] });
    }));

    const response = createJsonResponse();
    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, response.res as any);

    const payload = response.json<{ ok: boolean; data: { feedItems: any[]; articles: any[] } }>();
    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.feedItems).toHaveLength(1);
    expect(payload.data.feedItems[0].id).toBe(101);
    expect(payload.data.feedItems[0].title).toContain('Instituto Nacional do Câncer');
    expect(payload.data.feedItems[0].summary).toContain('Audiência Pública');
    expect(payload.data.feedItems[0].whyItMatters).toContain('pressão política');
    expect(payload.data.feedItems[0].nextStep).toContain('Acompanhar');
    expect(payload.data.feedItems[0].agendaDocumentUrl).toBe('https://example.com/pauta.pdf');
    expect(payload.data.feedItems[0].eventUrl).toBe('https://example.com/evento/101');
    expect(payload.data.feedItems[0].eventOrgans).toEqual(['CASP']);
    expect(payload.data.articles.some(article => article.sourceTitle.includes('Instituto Nacional do Câncer'))).toBe(true);
  });

  it('hydrates deputy sex metadata from detail endpoint when list omits it', async () => {
    let detailAvailable = true;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/deputados?')) {
        return jsonResponse({
          dados: [{
            id: 42,
            nome: 'ANA DETALHE',
            siglaPartido: 'PSB',
            siglaUf: 'BA',
            urlFoto: 'https://example.com/ana.jpg',
            email: 'ana@example.com',
          }],
        });
      }

      if (url.includes('/deputados/42')) {
        return jsonResponse({ dados: detailAvailable ? { id: 42, sexo: 'F' } : { id: 42 } });
      }

      if (url.includes('/partidos?')) {
        return jsonResponse({ dados: [{ id: 10, sigla: 'PSB', nome: 'Partido Socialista Brasileiro', uri: 'x' }] });
      }

      if (url.includes('/votacoes?') || url.includes('/proposicoes?') || url.includes('/eventos?')) {
        return jsonResponse({ dados: [] });
      }

      if (url.includes('legis.senado.leg.br')) {
        return xmlResponse(`
          <ListaParlamentarEmExercicio>
            <Parlamentar>
              <CodigoParlamentar>99</CodigoParlamentar>
              <NomeParlamentar>JOAO SENADOR</NomeParlamentar>
              <SiglaPartidoParlamentar>MDB</SiglaPartidoParlamentar>
              <UfParlamentar>RJ</UfParlamentar>
              <SexoParlamentar>M</SexoParlamentar>
            </Parlamentar>
          </ListaParlamentarEmExercicio>
        `);
      }

      return jsonResponse({ dados: [] });
    });

    vi.stubGlobal('fetch', fetchMock);
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, response.res as any);

    const payload = response.json<{ ok: boolean; data: { politicians: any[] } }>();
    const deputy = payload.data.politicians.find((politician) => politician.id === 42);
    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(deputy.sex).toBe('F');
    expect(deputy.role).toBe('Deputada Federal');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dadosabertos.camara.leg.br/api/v2/deputados/42',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    detailAvailable = false;
    const cachedResponse = createJsonResponse();

    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, cachedResponse.res as any);

    const cachedPayload = cachedResponse.json<{ ok: boolean; data: { politicians: any[] } }>();
    const cachedDeputy = cachedPayload.data.politicians.find((politician) => politician.id === 42);
    expect(cachedResponse.statusCode).toBe(200);
    expect(cachedPayload.ok).toBe(true);
    expect(cachedDeputy.sex).toBe('F');
    expect(cachedDeputy.role).toBe('Deputada Federal');
  });

  it('marks bootstrap as partial when a legislative source is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/deputados?')) {
        return jsonResponse({
          dados: [{
            id: 1,
            nome: 'MARIA TESTE',
            siglaPartido: 'PT',
            siglaUf: 'SP',
            urlFoto: 'https://example.com/maria.jpg',
            sexo: 'F',
            email: 'maria@example.com',
          }],
        });
      }

      if (url.includes('/partidos?')) {
        return jsonResponse({ dados: [{ id: 10, sigla: 'PT', nome: 'Partido dos Trabalhadores', uri: 'x' }] });
      }

      if (url.includes('/votacoes?')) {
        return jsonResponse({ dados: [] });
      }

      if (url.includes('/proposicoes?')) {
        return jsonResponse({ dados: [] });
      }

      if (url.includes('/eventos?')) {
        return jsonResponse({ dados: [] });
      }

      if (url.includes('legis.senado.leg.br')) {
        return new Response('', { status: 503 });
      }

      return jsonResponse({ dados: [] });
    }));
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, response.res as any);

    const payload = response.json<{ ok: boolean; partial: boolean; warnings: string[]; data: { partial: boolean } }>();
    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.partial).toBe(true);
    expect(payload.data.partial).toBe(true);
    expect(payload.warnings).toContain('senado_senadores_unavailable');
    expect(payload.warnings).toContain('camara_feed_unavailable');
  });

  it('does not return success when no politicians are available', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ dados: [] })));
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, response.res as any);

    const payload = response.json<{ ok: boolean; error: string; warnings: string[] }>();
    expect(response.statusCode).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('Bootstrap did not return deputies.');
    expect(payload.warnings).toContain('camara_deputados_unavailable');
  });

  it('does not cache a senate-only bootstrap as a healthy response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('legis.senado.leg.br') || url.includes('/api/camara?url=')) {
        return xmlResponse(`
          <ListaParlamentarEmExercicio>
            <Parlamentar>
              <CodigoParlamentar>99</CodigoParlamentar>
              <NomeParlamentar>JOAO SENADOR</NomeParlamentar>
              <SiglaPartidoParlamentar>MDB</SiglaPartidoParlamentar>
              <UfParlamentar>RJ</UfParlamentar>
              <SexoParlamentar>M</SexoParlamentar>
            </Parlamentar>
          </ListaParlamentarEmExercicio>
        `);
      }
      return jsonResponse({ dados: [] });
    }));
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {}, query: { refresh: '1' } } as any, response.res as any);

    const payload = response.json<{ ok: boolean; error: string; sources: any }>();
    expect(response.statusCode).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('Bootstrap did not return deputies.');
    expect(payload.sources.senadoSenadores.count).toBe(1);
    expect(payload.sources.camaraDeputados.ok).toBe(false);
  });

  describe('refresh authorization and cache safety', () => {
    const senateXml = (code: string) => xmlResponse(`
      <ListaParlamentarEmExercicio>
        <Parlamentar>
          ${code}
          <NomeParlamentar>JOAO SENADOR</NomeParlamentar>
          <SiglaPartidoParlamentar>MDB</SiglaPartidoParlamentar>
          <UfParlamentar>RJ</UfParlamentar>
          <SexoParlamentar>M</SexoParlamentar>
        </Parlamentar>
      </ListaParlamentarEmExercicio>
    `);

    const createUpstream = (options: { senate?: 'ok' | 'down' | 'no-code'; feed?: boolean } = {}) => {
      const { senate = 'ok', feed = true } = options;
      return vi.fn(async (url: string) => {
        if (url.includes('/deputados?')) {
          return jsonResponse({ dados: [{ id: 1, nome: 'MARIA TESTE', siglaPartido: 'PT', siglaUf: 'SP', sexo: 'F' }] });
        }
        if (url.includes('/partidos?')) {
          return jsonResponse({ dados: [{ id: 10, sigla: 'PT', nome: 'Partido dos Trabalhadores', uri: 'x' }] });
        }
        if (url.includes('/votacoes?') && feed) {
          return jsonResponse({
            dados: [{ id: '123', siglaOrgao: 'PLEN', uri: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/123', dataHoraRegistro: '2026-05-20T10:00:00', descricao: 'Votacao sobre saude publica' }],
          });
        }
        if (url.includes('legis.senado.leg.br')) {
          if (senate === 'down') return new Response('', { status: 503 });
          return senateXml(senate === 'ok' ? '<CodigoParlamentar>99</CodigoParlamentar>' : '');
        }
        return jsonResponse({ dados: [] });
      });
    };

    const get = async (query: Record<string, string> = {}, authorization?: string) => {
      const response = createJsonResponse();
      await handler({ method: 'GET', headers: authorization ? { authorization } : {}, query } as any, response.res as any);
      return response;
    };

    const upstreamCalls = (fetchMock: ReturnType<typeof createUpstream>) =>
      fetchMock.mock.calls.filter(([url]) => String(url).includes('/deputados?')).length;

    it('ignores ?refresh=1 without a valid bearer token and serves the cache', async () => {
      process.env.CRON_SECRET = 'cron-secret';
      const fetchMock = createUpstream();
      vi.stubGlobal('fetch', fetchMock);

      const seeded = await get({ refresh: '1' }, 'Bearer cron-secret');
      expect(seeded.json<{ source: string }>().source).toBe('refresh:memory');
      expect(upstreamCalls(fetchMock)).toBe(1);

      for (const authorization of [undefined, 'Bearer wrong', 'Bearer cron-secret-extra']) {
        const response = await get({ refresh: '1' }, authorization);
        expect(response.statusCode).toBe(200);
        expect(response.json<{ source: string }>().source).toBe('cache');
      }
      expect(upstreamCalls(fetchMock)).toBe(1);
    });

    it('rebuilds with a valid bearer token even when the cache is fresh', async () => {
      process.env.CRON_SECRET = 'cron-secret';
      const fetchMock = createUpstream();
      vi.stubGlobal('fetch', fetchMock);

      await get({ refresh: '1' }, 'Bearer cron-secret');
      const response = await get({ refresh: '1' }, 'Bearer cron-secret');

      expect(response.json<{ source: string }>().source).toBe('refresh:memory');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(upstreamCalls(fetchMock)).toBe(2);
    });

    it('keeps the previous senate and feed when a refresh returns them empty', async () => {
      vi.stubGlobal('fetch', createUpstream());
      await get({ refresh: '1' });

      vi.stubGlobal('fetch', createUpstream({ senate: 'down', feed: false }));
      const refreshed = await get({ refresh: '1' });
      const payload = refreshed.json<{ warnings: string[]; sources: any; data: { politicians: any[]; feedItems: any[] } }>();

      expect(refreshed.statusCode).toBe(200);
      expect(payload.data.politicians.some((politician) => politician.id === 99)).toBe(true);
      expect(payload.data.feedItems).toHaveLength(1);
      expect(payload.warnings).not.toContain('senado_senadores_unavailable');
      expect(payload.warnings).not.toContain('camara_feed_unavailable');
      expect(payload.warnings).toEqual(expect.arrayContaining(['senado_from_previous_cache', 'feed_from_previous_cache']));
      expect((refreshed.json<{ partial: boolean }>()).partial).toBe(false);

      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('cache should be used'); }));
      const cached = await get();
      const cachedPayload = cached.json<{ source: string; data: { politicians: any[]; feedItems: any[] } }>();
      expect(cachedPayload.source).toBe('cache');
      expect(cachedPayload.data.politicians.some((politician) => politician.id === 99)).toBe(true);
      expect(cachedPayload.data.feedItems).toHaveLength(1);
    });

    it('does not mask a genuinely partial first build', async () => {
      vi.stubGlobal('fetch', createUpstream({ senate: 'down' }));
      const response = await get({ refresh: '1' });

      expect(response.json<{ warnings: string[] }>().warnings).toContain('senado_senadores_unavailable');
    });

    it('prefers fresh upstream parts over the previous ones when they are healthy', () => {
      const previous: any = {
        politicians: [{ id: 1, role: 'Deputado Federal', hasApiIntegration: true }, { id: 99, role: 'Senador' }],
        feedItems: [{ id: 1 }], articles: [], parties: [], warnings: [], partial: false,
        sources: { senadoSenadores: { ok: true, count: 1 }, camaraFeed: { ok: true, count: 1 } },
      };
      const next: any = {
        ...previous,
        politicians: [{ id: 1, role: 'Deputado Federal', hasApiIntegration: true }, { id: 100, role: 'Senador' }],
        feedItems: [{ id: 2 }],
      };

      expect(mergeWithPreviousBootstrap(next, previous)).toBe(next);
    });

    it('drops senators without an official code instead of inventing ids', async () => {
      vi.stubGlobal('fetch', createUpstream({ senate: 'no-code' }));
      const response = await get({ refresh: '1' });
      const payload = response.json<{ sources: any; data: { politicians: any[] } }>();

      expect(payload.data.politicians.filter((politician) => /^Senador/.test(politician.role))).toHaveLength(0);
      expect(payload.sources.senadoSenadores.ok).toBe(false);
    });

    it('serves the expired cache immediately and starts a single background rebuild', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-06-01T10:00:00Z'));
      const fetchMock = createUpstream();
      vi.stubGlobal('fetch', fetchMock);
      await get({ refresh: '1' });
      expect(upstreamCalls(fetchMock)).toBe(1);

      vi.setSystemTime(new Date('2026-06-01T10:30:00Z'));
      const [first, second] = await Promise.all([get(), get()]);

      expect(first.json<{ source: string }>().source).toBe('stale-cache');
      expect(second.json<{ source: string }>().source).toBe('stale-cache');
      await vi.waitFor(() => expect(upstreamCalls(fetchMock)).toBe(2));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(upstreamCalls(fetchMock)).toBe(2);
    });

    it('uses stable negative ids, approval status and no invented dates or mandate', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/deputados?')) {
          return jsonResponse({ dados: [{ id: 1, nome: 'MARIA TESTE', siglaPartido: 'PT', siglaUf: 'SP', sexo: 'F' }] });
        }
        if (url.includes('/partidos?')) return jsonResponse({ dados: [{ id: 10, sigla: 'PT', nome: 'PT', uri: 'x' }] });
        if (url.includes('/votacoes?')) {
          return jsonResponse({ dados: [
            { id: '2367475-47', siglaOrgao: 'PLEN', uri: 'x/votacoes/2367475-47', dataHoraRegistro: '2026-05-20T10:00:00', descricao: 'Votacao A', aprovacao: 1 },
            { id: '2367475-48', siglaOrgao: 'PLEN', uri: 'x/votacoes/2367475-48', dataHoraRegistro: '2026-05-20T11:00:00', descricao: 'Votacao B', aprovacao: 0 },
            { id: '2367475-49', siglaOrgao: 'PLEN', uri: 'x/votacoes/2367475-49', descricao: 'Votacao C' },
          ] });
        }
        if (url.includes('/proposicoes?')) {
          return jsonResponse({ dados: [{ id: 2367475, siglaTipo: 'PL', numero: 1, ano: 2026, ementa: 'Ementa sem data' }] });
        }
        if (url.includes('legis.senado.leg.br')) return senateXml('<CodigoParlamentar>99</CodigoParlamentar>');
        return jsonResponse({ dados: [] });
      });
      vi.stubGlobal('fetch', fetchMock);

      const response = await get({ refresh: '1' });
      const { data } = response.json<{ data: { feedItems: any[]; politicians: any[] } }>();
      const votes = data.feedItems.filter((item) => item.title.startsWith('PLEN'));
      const proposition = data.feedItems.find((item) => item.title === 'PL 1/2026');

      expect(votes).toHaveLength(3);
      expect(votes.every((item) => item.id < 0)).toBe(true);
      expect(new Set(votes.map((item) => item.id)).size).toBe(3);
      expect(votes.find((item) => /votacao a/i.test(item.description)).status).toBe('Aprovado');
      expect(votes.find((item) => /votacao b/i.test(item.description)).status).toBe('Rejeitado');
      expect(votes.find((item) => /votacao c/i.test(item.description)).status).toBeUndefined();
      expect(votes.find((item) => /votacao c/i.test(item.description)).date).toBeUndefined();
      expect(proposition.id).toBe(2367475);
      expect(proposition.date).toBeUndefined();
      expect(data.politicians.find((politician) => politician.id === 99).mandate).toEqual({ start: '', end: '' });
    });

    it('shares a single in-flight rebuild between concurrent callers', async () => {
      const fetchMock = createUpstream();
      vi.stubGlobal('fetch', fetchMock);

      await Promise.all([refreshLegislativeBootstrap(), refreshLegislativeBootstrap(), refreshLegislativeBootstrap()]);

      expect(upstreamCalls(fetchMock)).toBe(1);
    });

    it('keeps the previous official parties when the party fetch fell back to the fixed list', () => {
      const previous: any = {
        politicians: [], feedItems: [], articles: [], warnings: [], partial: false,
        parties: [{ id: 36844, sigla: 'PT', nome: 'Partido dos Trabalhadores', uri: 'x' }],
        sources: { camaraParties: { ok: true, count: 1, fallback: false } },
      };
      const next: any = {
        ...previous,
        parties: [{ id: 1000, sigla: 'PT', nome: 'Partido dos Trabalhadores', uri: '' }],
        warnings: ['camara_parties_using_fallback'],
        partial: true,
        sources: { camaraParties: { ok: false, count: 1, fallback: true } },
      };

      const merged = mergeWithPreviousBootstrap(next, previous);

      expect(merged.parties).toEqual(previous.parties);
      expect(merged.warnings).toEqual(['parties_from_previous_cache']);
      expect(merged.partial).toBe(false);
    });

    it('builds official data without inventing labels, dates or categories', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-29T01:30:00Z'));
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/deputados?')) {
          return jsonResponse({ dados: [{ id: 1, nome: 'ALEX TESTE', siglaPartido: 'NOVOPART', siglaUf: 'SP', idLegislatura: 57 }] });
        }
        if (url.endsWith('/legislaturas/57')) return jsonResponse({ dados: { id: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' } });
        if (url.includes('/partidos?')) return jsonResponse({ dados: [{ id: 10, sigla: 'NOVOPART', nome: 'Novo Partido', uri: 'x' }] });
        if (url.includes('/votacoes?')) {
          return jsonResponse({ dados: [{ id: '1', siglaOrgao: 'PLEN', uri: 'x/votacoes/1', descricao: 'Aprovado apenas o requerimento sobre a eleicao e a suspensao da sessao' }] });
        }
        if (url.includes('/proposicoes?')) return jsonResponse({ dados: [] });
        if (url.includes('/eventos?')) return new Response('', { status: 500 });
        if (url.includes('legis.senado.leg.br')) {
          return xmlResponse('<L><Parlamentar><CodigoParlamentar>99</CodigoParlamentar><NomeParlamentar>ANA</NomeParlamentar><SiglaPartidoParlamentar>MDB</SiglaPartidoParlamentar><UfParlamentar>RJ</UfParlamentar></Parlamentar></L>');
        }
        return new Response('', { status: 404 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const data = await buildLegislativeBootstrap();
      const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));

      expect(calledUrls.some((url) => url.includes('/proposicoes?') && url.includes('dataApresentacaoInicio=2026-10-21&'))).toBe(true);
      expect(calledUrls.some((url) => url.includes('/votacoes?') && url.includes('dataInicio=2026-09-28&'))).toBe(true);
      expect(data.feedItems[0].category).toBe('activity');
      expect(data.warnings).toContain('camara_events_unavailable');
      expect(data.partial).toBe(true);
      expect(data.parties[0].ideology).toBeUndefined();
      const deputy = data.politicians.find((politician) => politician.id === 1)!;
      expect(deputy.role).toBe('Deputado(a) Federal');
      expect(deputy.mandate).toEqual({ start: '2023-02-01', end: '2027-01-31' });
      expect(data.politicians.find((politician) => politician.id === 99)!.role).toBe('Senador(a)');
    });
  });
});
