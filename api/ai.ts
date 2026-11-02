import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { createRateLimiter, getClientBucket } from './lib/rateLimit.js';

type VercelRequest = IncomingMessage & { body?: any; method?: string; };

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (data: any) => void;
  setHeader: (name: string, value: string) => void;
};

type EducationalArticle = {
  title: string;
  text: string;
  topic: string;
  legislation?: string;
  impact?: string;
};

type ApiAction =
  | 'generateEducationalContent'
  | 'speakContent'
  | 'chatWithGemini';

class RequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const MAX_BODY_BYTES = 64 * 1024;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT = 20;
const isRateLimited = createRateLimiter(RATE_WINDOW_MS);
const MAX_TEXT_CHARS = 2000;
const MAX_SPEECH_CHARS = 3000;
const CHAT_MODES = ['fast', 'standard'] as const;
type ChatMode = typeof CHAT_MODES[number];
const SUPPORTED_ACTIONS: ApiAction[] = [
  'generateEducationalContent',
  'speakContent',
  'chatWithGemini'
];

const isApiAction = (value: unknown): value is ApiAction =>
  typeof value === 'string' && SUPPORTED_ACTIONS.includes(value as ApiAction);

const getApiKey = () => process.env.API_KEY || process.env.GOOGLE_API_KEY || '';

let aiClient: GoogleGenAI | null = null;

const getAi = () => {
  if (aiClient) return aiClient;
  const key = getApiKey();
  if (!key.trim()) return null;
  aiClient = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 25_000 } });
  return aiClient;
};

const jsonResponse = (res: VercelResponse, status: number, data: any) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

const getHeader = (req: VercelRequest, name: string) => {
  const value = req.headers?.[name];
  return (Array.isArray(value) ? value[0] : value) || '';
};

const isJsonContentType = (req: VercelRequest) =>
  getHeader(req, 'content-type').split(';')[0].trim().toLowerCase() === 'application/json';

const isCrossSiteRequest = (req: VercelRequest) => {
  if (getHeader(req, 'sec-fetch-site').toLowerCase() === 'cross-site') return true;
  const origin = getHeader(req, 'origin');
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() !== getHeader(req, 'host').toLowerCase();
  } catch {
    return true;
  }
};

const assertBodySize = (body: unknown) => {
  const size = typeof body === 'string' ? Buffer.byteLength(body, 'utf8') : Buffer.byteLength(JSON.stringify(body) || '', 'utf8');
  if (size > MAX_BODY_BYTES) {
    throw new RequestError(413, 'Payload too large.');
  }
};

const cleanText = (value: unknown, maxChars: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxChars) : '';

const AI_UNAVAILABLE_TEXT = 'A integração de IA não está configurada neste ambiente. Os dados legislativos e fontes oficiais continuam disponíveis.';

const CHAT_SYSTEM_INSTRUCTION = [
  'Você é o assistente do Papo Reto, plataforma de transparência política.',
  'Responda só sobre o Congresso Nacional, política pública brasileira e cidadania; para outros assuntos, explique educadamente que não pode ajudar.',
  'Escreva em português do Brasil, com linguagem simples e direta.',
  'Seja neutro: não declare preferência por partido, político ou ideologia e não faça campanha.',
  'Nunca invente fatos, números, votos ou leis; se não souber, diga que não sabe.',
  'Sempre que possível, recomende a fonte oficial (camara.leg.br, senado.leg.br, planalto.gov.br ou tse.jus.br).',
].join(' ');

const parseEducationalArticles = (raw: string): EducationalArticle[] => {
  const normalized = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!title || !text) return [];
    const topic = typeof item?.topic === 'string' ? item.topic.trim() : '';
    const impact = typeof item?.impact === 'string' ? item.impact.trim() : '';
    return [{ title, text, topic, ...(impact ? { impact } : {}) }];
  });
};

const readBody = async (req: VercelRequest) => {
  if (req.body && typeof req.body === 'object') {
    assertBodySize(req.body);
    return req.body;
  }

  if (typeof req.body === 'string') {
    assertBodySize(req.body);
    try {
      return JSON.parse(req.body);
    } catch {
      throw new RequestError(400, 'Invalid JSON body.');
    }
  }

  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new RequestError(413, 'Payload too large.');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new RequestError(413, 'Payload too large.');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400, 'Invalid JSON body.');
  }
};

const staticEducationalContent: EducationalArticle[] = [
  {
    title: 'O Orçamento Público',
    text: 'O Orçamento Público estima as receitas e fixa as despesas do governo para um ano. É a lei que define onde seu dinheiro será gasto: saúde, educação, segurança.',
    topic: 'Orçamento',
    legislation: 'Art. 165 da Constituição Federal',
    impact: 'Define a qualidade dos serviços públicos que você usa.'
  },
  {
    title: 'PEC vs Projeto de Lei',
    text: 'PEC altera a Constituição e exige 3/5 dos votos. PL cria leis comuns e exige maioria simples. PECs mudam as regras do jogo; PLs jogam o jogo.',
    topic: 'Legislação',
    legislation: 'Art. 59 a 69 da CF/88',
    impact: 'PECs geralmente trazem mudanças profundas e duradouras.'
  },
  {
    title: 'O Papel do STF',
    text: 'O STF é o guardião da Constituição. Ele não cria leis, mas julga se as leis criadas pelo Congresso e atos do Presidente respeitam a Constituição.',
    topic: 'Poder Judiciário',
    legislation: 'Art. 101 da CF/88',
    impact: 'Garante que seus direitos fundamentais não sejam violados.'
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'POST').toUpperCase();
  if (method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  if (isCrossSiteRequest(req)) {
    return jsonResponse(res, 403, { error: 'Forbidden.' });
  }

  if (!isJsonContentType(req)) {
    return jsonResponse(res, 415, { error: 'Unsupported media type.' });
  }

  if (isRateLimited(getClientBucket(req), RATE_LIMIT)) {
    return jsonResponse(res, 429, { error: 'Too many requests.' });
  }

  let body: Record<string, any>;
  try {
    body = await readBody(req);
  } catch (error: any) {
    return jsonResponse(res, error instanceof RequestError ? error.statusCode : 400, { error: error instanceof RequestError ? error.message : 'Invalid request.' });
  }

  if (!body || typeof body !== 'object' || !isApiAction(body?.action)) {
    return jsonResponse(res, 400, { error: body?.action ? 'Unsupported action.' : 'Missing action.' });
  }

  const action = body.action;
  const ai = getAi();

  if (!ai) {
    if (action === 'generateEducationalContent') {
      return jsonResponse(res, 200, { ok: true, data: staticEducationalContent, isFallback: true });
    }
    if (action === 'speakContent') {
      return jsonResponse(res, 200, { ok: true, data: { audioBase64: null } });
    }
    if (action === 'chatWithGemini') {
      return jsonResponse(res, 200, { ok: true, data: { text: AI_UNAVAILABLE_TEXT } });
    }
    return jsonResponse(res, 200, { ok: true, data: null });
  }

  try {
    switch (action) {
      case 'generateEducationalContent': {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Atue como um Professor de Direito Constitucional. Gere 3 artigos educativos curtos e diretos sobre política brasileira. Regras: Máximo 60 palavras, linguagem simples, JSON.',
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4000,
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  text: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ['title', 'text', 'topic']
              }
            }
          }
        });

        const raw = response.text?.trim();
        const articles = raw ? parseEducationalArticles(raw) : [];
        if (articles.length === 0) {
          return jsonResponse(res, 200, { ok: true, data: staticEducationalContent, isFallback: true });
        }
        return jsonResponse(res, 200, { ok: true, data: articles });
      }

      case 'speakContent': {
        const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
        if (!rawText) return jsonResponse(res, 400, { error: 'Missing text.' });
        const text = rawText.slice(0, MAX_SPEECH_CHARS);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{
            parts: [{
              text: [
                'Leia como uma locução curta de jornalismo cívico para o app PapoReto.',
                'Use ritmo natural, tom claro e conversado, sem soletrar palavras.',
                'Faça pausas leves entre frases e leia siglas legislativas pelo significado quando o texto já vier expandido.',
                `Roteiro: ${text}`
              ].join(' ')
            }]
          }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          }
        });
        const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        return jsonResponse(res, 200, { ok: true, data: { audioBase64 } });
      }

      case 'chatWithGemini': {
        const message = cleanText(body?.message, MAX_TEXT_CHARS);
        const mode: ChatMode = CHAT_MODES.includes(body?.mode) ? body.mode : 'standard';
        if (!message) return jsonResponse(res, 400, { error: 'Missing message.' });

        const model = mode === 'fast' ? 'gemini-flash-lite-latest' : 'gemini-3-pro-preview';
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: message }] }],
          config: { maxOutputTokens: 2048, systemInstruction: CHAT_SYSTEM_INSTRUCTION }
        });
        return jsonResponse(res, 200, { ok: true, data: { text: response.text || 'Sem resposta.' } });
      }

      default:
        return jsonResponse(res, 400, { error: 'Unsupported action.' });
    }
  } catch (error: any) {
    console.error('[api/ai] request failed', { action, name: error?.name, status: error?.status });
    return jsonResponse(res, 500, { error: 'Unexpected server error.' });
  }
}
