import { zipSync, strToU8 } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import numbersHandler from '../api/numbers';
import {
  buildCongressNumbers,
  createPresenceBuilder,
  createQuotaBuilder,
  parseCsv,
  quotaLabel,
} from '../api/lib/congressNumbers';
import { clearServerCacheForTests, writeServerCache } from '../api/lib/serverCache';
import { createJsonResponse } from './testUtils';

const presenceFrom = (votings: string, votes: string) => {
  const builder = createPresenceBuilder();
  parseCsv(votings).forEach((r) => builder.addVoting(r));
  parseCsv(votes).forEach((r) => builder.addVote(r));
  return builder.build(2026);
};

describe('parseCsv', () => {
  it('handles BOM, quoted separators, escaped quotes and newlines inside quotes', () => {
    const rows = parseCsv('\uFEFF"id";"descricao";"x"\r\n"1";"a;b ""c""\nlinha";"z"\r\n2;;\r\n');
    expect(rows).toEqual([
      { id: '1', descricao: 'a;b "c"\nlinha', x: 'z' },
      { id: '2', descricao: '', x: '' },
    ]);
  });
});

describe('presence aggregation', () => {
  const votings = [
    '"id";"data";"siglaOrgao"',
    '"v1";"2026-02-10";"PLEN"',
    '"v2";"2026-02-11";"PLEN"',
    '"v3";"2026-03-05";"PLEN"',
    '"c1";"2026-03-06";"CCJC"',
    '"v4";"2026-03-07";"PLEN"',
  ].join('\n');
  const vote = (id: string, n: number) => Array.from({ length: n }, (_, i) => `"${id}";"${i + 1}"`).join('\n');
  const votes = ['"idVotacao";"deputado_id"', vote('v1', 400), vote('v2', 300), vote('v3', 513), vote('c1', 500)].join('\n');

  it('ignores committee votings and votings without votes, and averages per voting and per month', () => {
    const result = presenceFrom(votings, votes)!;
    expect(result.votes).toBe(3);
    expect(result.averagePct).toBe(78.8);
    expect(result.lastDate).toBe('2026-03-05');
    expect(result.months).toEqual([
      { month: '2026-02', votes: 2, pct: 68.2 },
      { month: '2026-03', votes: 1, pct: 100 },
    ]);
  });

  it('returns null when no plenary voting has votes', () => {
    expect(presenceFrom(votings, '"idVotacao";"deputado_id"\n"c1";"1"')).toBeNull();
  });
});

describe('quota aggregation', () => {
  const header = 'txtDescricao;vlrLiquido;numMes;nuDeputadoId;sgUF';
  const csv = [
    header,
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.;600.50;1;10;SP',
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.;100;3;11;RJ',
    'COMBUSTÍVEIS E LUBRIFICANTES.;200;2;10;SP',
    'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES;100;2;11;RJ',
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.;9999;2;;NA',
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.;5000;2;12;NA',
    'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO;"50,50";3;10;SP',
  ].join('\n');

  it('sums only deputies, derives months and ranks categories with percentages', () => {
    const builder = createQuotaBuilder();
    parseCsv(csv).forEach((r) => builder.add(r));
    const result = builder.build(2026)!;
    expect(result.total).toBe(1051);
    expect(result.firstMonth).toBe('2026-01');
    expect(result.lastMonth).toBe('2026-03');
    expect(result.perSeatMonthly).toBe(0.68);
    expect(result.topCategories.map((c) => [c.label, c.value, c.pct])).toEqual([
      ['Divulgação', 700.5, 66.7],
      ['Combustível', 200, 19],
      ['Carros', 100, 9.5],
      ['Serviço de táxi, pedágio e estacionamento', 50.5, 4.8],
    ]);
  });

  it('keeps aircraft rental out of the Carros label', () => {
    expect(quotaLabel('LOCAÇÃO OU FRETAMENTO DE AERONAVES')).toBe('Locação ou fretamento de aeronaves');
  });
});

describe('buildCongressNumbers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('still returns the quota when the votes download fails, with a warning', async () => {
    const zip = zipSync({ 'Ano-2026.csv': strToU8('txtDescricao;vlrLiquido;numMes;nuDeputadoId;sgUF\nHOSPEDAGEM;100;1;5;GO\n') });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).endsWith('.zip')) return new Response(zip, { status: 200 });
      return new Response('nope', { status: 500 });
    }));

    const result = await buildCongressNumbers();

    expect(result.presence).toBeNull();
    expect(result.quota?.total).toBe(100);
    expect(result.quota?.topCategories[0]).toMatchObject({ label: 'Hospedagem', pct: 100 });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/^presence:/);
  });
});

describe('/api/numbers', () => {
  beforeEach(() => {
    clearServerCacheForTests();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('returns 503 without computing anything when the cache is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createJsonResponse();

    await numbersHandler({ method: 'GET', headers: { 'x-forwarded-for': '10.0.0.1' } } as any, response.res as any);

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'Dados ainda não disponíveis.' });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('serves the cached payload with public cache headers', async () => {
    await writeServerCache('congress-numbers-v1', { generatedAt: 'x', presence: null, quota: null, warnings: [] });
    const response = createJsonResponse();

    await numbersHandler({ method: 'GET', headers: { 'x-forwarded-for': '10.0.0.2' } } as any, response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(response.json()).toMatchObject({ generatedAt: 'x' });
  });

  it('rejects non-GET methods with 405', async () => {
    const response = createJsonResponse();
    await numbersHandler({ method: 'POST', headers: {} } as any, response.res as any);
    expect(response.statusCode).toBe(405);
  });
});
