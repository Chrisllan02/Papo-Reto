import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDailyNews, generateEducationalContent, getEmergencyNews, getNewsHistory } from '../services/ai';

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => body });
const GENERATED = 'data:image/png;base64,AAAA';

const installFetch = (opts: { ai?: unknown } = {}) => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes('/api/ai')) {
      const action = JSON.parse(String(init?.body)).action;
      if (action === 'generateNewsImage') return json({ data: { imageDataUrl: GENERATED } });
      return json({ data: opts.ai ?? null }, opts.ai !== undefined);
    }
    if (decoded.includes('/votacoes')) {
      return json({ dados: [{ id: '2367475-47', descricao: 'Aprovado o requerimento de urgência', dataHoraRegistro: '2024-05-09T22:30:00' }] });
    }
    if (decoded.includes('/proposicoes')) {
      return json({ dados: [{ id: 2400000, ementa: 'Institui o dia nacional do teste', dataApresentacao: undefined }] });
    }
    return json({ dados: [] });
  }));
};

describe('ai: notícias e conteúdo', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('não inventa notícias de emergência', () => {
    expect(getEmergencyNews()).toEqual([]);
  });

  it('não persiste imagem gerada (base64) no cache nem no histórico', async () => {
    installFetch();
    const news = await fetchDailyNews();

    expect(news[0].imageUrl).toBe(GENERATED);
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

  it('não cacheia o conteúdo estático quando a IA falha', async () => {
    installFetch();
    const content = await generateEducationalContent();

    expect(content.length).toBeGreaterThan(0);
    expect(localStorage.getItem('paporeto_education_articles_v1')).toBeNull();
  });
});
