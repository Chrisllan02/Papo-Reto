import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/bootstrap';
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
              <SiglaUfParlamentar>RJ</SiglaUfParlamentar>
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
    expect(payload.data.parties).toHaveLength(1);
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
});
