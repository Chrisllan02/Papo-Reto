import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiUnavailableError, chatWithGemini, fetchDailyNews, generateEducationalContent, getNewsHistory } from '../services/ai';

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => body });
const GENERATED = 'data:image/png;base64,AAAA';

const installFetch = (opts: { ai?: unknown; events?: unknown[]; brokenProposicoes?: boolean } = {}) => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes('/api/ai')) {
      const action = JSON.parse(String(init?.body)).action;
      if (action === 'generateNewsImage') return json({ data: { imageDataUrl: GENERATED } });
      return json({ data: opts.ai ?? null }, opts.ai !== undefined);
    }
    if (decoded.includes('/votacoes')) {
      return json({ dados: [{ id: '2367475-47', siglaOrgao: 'CCJC', descricao: 'Aprovado o requerimento de urgência', dataHoraRegistro: '2024-05-09T22:30:00' }] });
    }
    if (decoded.includes('/proposicoes')) {
      if (opts.brokenProposicoes) return { ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } };
      return json({ dados: [{ id: 2400000, ementa: 'Institui o dia nacional do teste', dataApresentacao: undefined }] });
    }
    if (decoded.includes('/eventos')) return json({ dados: opts.events ?? [] });
    return json({ dados: [] });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const imageCalls = (fetchMock: ReturnType<typeof installFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => String(init?.body || '').includes('generateNewsImage')).length;

describe('ai: notícias e conteúdo', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('não espera nem regera a imagem a cada atualização e não persiste base64', async () => {
    const fetchMock = installFetch();
    const first = await fetchDailyNews();
    expect(first[0].imageUrl).not.toBe(GENERATED);

    await vi.waitFor(async () => expect((await fetchDailyNews())[0].imageUrl).toBe(GENERATED));
    await fetchDailyNews();

    expect(imageCalls(fetchMock)).toBe(1);
    const stored = Object.keys(localStorage).map(key => localStorage.getItem(key) || '').join('');
    expect(stored).not.toContain('data:image');
    expect(getNewsHistory().every(item => !item.imageUrl?.startsWith('data:'))).toBe(true);
  });

  it('item sem data não vira NaN nem "hoje"', async () => {
    installFetch();
    const news = await fetchDailyNews();
    const undated = news.find(item => item.url.includes('2400000'))!;

    expect(undated.timestamp).toBeUndefined();
    expect(undated.time).toBe('');
    expect(JSON.stringify(news)).not.toContain('NaN');
  });

  it('notícias diferentes com o mesmo título genérico não se fundem', async () => {
    installFetch({ events: [
      { id: 1, descricaoTipo: 'Audiência Pública', descricao: 'Audiência pública', dataHoraInicio: '2024-05-09T10:00:00' },
      { id: 2, descricaoTipo: 'Audiência Pública', descricao: 'Audiência pública', dataHoraInicio: '2024-05-09T14:00:00' },
    ] });
    const news = await fetchDailyNews();

    expect(news.filter(item => item.url.includes('/evento/')).map(item => item.url)).toEqual(expect.arrayContaining([
      'https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/1',
      'https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/2',
    ]));
  });

  it('votação usa o órgão real como fonte e JSON inválido de uma fonte não derruba as outras', async () => {
    installFetch({ brokenProposicoes: true });
    const news = await fetchDailyNews();

    expect(news.find(item => item.id === '2367475-47')?.source).toBe('CCJC');
  });

  it('não cacheia o conteúdo estático quando a IA falha', async () => {
    installFetch();
    const content = await generateEducationalContent();

    expect(content.isFallback).toBe(true);
    expect(content.articles[0]).toMatchObject({ title: 'O Orçamento Público', legislation: 'Art. 165 da Constituição Federal' });
    expect(localStorage.getItem('paporeto_education_articles_v1')).toBeNull();
  });

  it('descarta artigo sem título ou texto vindo da IA', async () => {
    installFetch({ ai: [{ title: 'Ok', text: 'Conteúdo', topic: 'x' }, { title: 'Sem texto' }, null] });
    const content = await generateEducationalContent();

    expect(content).toEqual({ articles: [{ title: 'Ok', text: 'Conteúdo', topic: 'x' }], isFallback: false });
  });

  it('chat com a IA fora devolve erro distinguível, não uma resposta', async () => {
    installFetch();
    await expect(chatWithGemini('oi', 'fast')).rejects.toBeInstanceOf(AiUnavailableError);
  });
});
