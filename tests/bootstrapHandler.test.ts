import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/bootstrap';
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
      data: { politicians: any[]; feedItems: any[]; parties: any[]; partial: boolean; warnings: string[] };
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
    expect(payload.data.parties).toHaveLength(1);
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

    const payload = response.json<{ ok: boolean; data: { feedItems: any[] } }>();
    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.feedItems).toHaveLength(1);
    expect(payload.data.feedItems[0].id).toBe(101);
    expect(payload.data.feedItems[0].title).toContain('Instituto Nacional do Câncer');
    expect(payload.data.feedItems[0].summary).toContain('Audiência Pública');
    expect(payload.data.feedItems[0].whyItMatters).toContain('pressão política');
    expect(payload.data.feedItems[0].nextStep).toContain('Acompanhar');
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
});
