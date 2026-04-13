import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Modality, Type } from '@google/genai';

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
  | 'generateNewsImage'
  | 'speakContent'
  | 'getSearchContext'
  | 'chatWithGemini'
  | 'generateCampaignImage'
  | 'transcribeAudio';

const getApiKey = () => process.env.API_KEY || process.env.GOOGLE_API_KEY || '';

let aiClient: GoogleGenAI | null = null;

const getAi = () => {
  if (aiClient) return aiClient;
  const key = getApiKey();
  if (!key.trim()) return null;
  aiClient = new GoogleGenAI({ apiKey: key });
  return aiClient;
};

const jsonResponse = (res: VercelResponse, status: number, data: any) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

const readBody = async (req: VercelRequest) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
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

  const body = await readBody(req);
  const action = body?.action as ApiAction | undefined;
  const ai = getAi();

  if (!action) {
    return jsonResponse(res, 400, { error: 'Missing action.' });
  }

  if (!ai) {
    if (action === 'generateEducationalContent') {
      return jsonResponse(res, 200, { ok: true, data: staticEducationalContent });
    }
    return jsonResponse(res, 503, { error: 'AI key unavailable.' });
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
                  legislation: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ['title', 'text', 'topic']
              }
            }
          }
        });

        const raw = response.text?.trim();
        if (!raw) {
          return jsonResponse(res, 200, { ok: true, data: staticEducationalContent });
        }

        const normalized = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(normalized) as EducationalArticle[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return jsonResponse(res, 200, { ok: true, data: staticEducationalContent });
        }
        return jsonResponse(res, 200, { ok: true, data: parsed });
      }

      case 'generateNewsImage': {
        const headline = String(body?.headline || '').trim();
        if (!headline) return jsonResponse(res, 400, { error: 'Missing headline.' });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: `Create a high-quality abstract 3D isometric editorial illustration for a news article titled: "${headline}". Style: Minimalist, Corporate Memphis 3D, Political symbolism. Mandatory Constraints: NO TEXT, NO HUMAN FACES, NO REALISTIC PEOPLE, NO CROWDS. Colors: Professional palette inspired by Brazil (Deep Green, Navy Blue, Golden Yellow, White, Grey). Composition: Clean background, single central subject (e.g. 3D gavel, document, stylized building, chart, abstract shapes).` }] },
          config: { imageConfig: { aspectRatio: '16:9' } }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            return jsonResponse(res, 200, { ok: true, data: { imageDataUrl: `data:image/png;base64,${part.inlineData.data}` } });
          }
        }
        return jsonResponse(res, 200, { ok: true, data: { imageDataUrl: null } });
      }

      case 'speakContent': {
        const text = String(body?.text || '').trim();
        if (!text) return jsonResponse(res, 400, { error: 'Missing text.' });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: `Diga de forma clara e profissional: ${text}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          }
        });
        const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        return jsonResponse(res, 200, { ok: true, data: { audioBase64 } });
      }

      case 'getSearchContext': {
        const query = String(body?.query || '').trim();
        if (!query) return jsonResponse(res, 400, { error: 'Missing query.' });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Pesquise sobre: "${query}"...`,
          config: { tools: [{ googleSearch: {} }] }
        });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
          .map((chunk: any) => (chunk.web ? { web: { uri: chunk.web.uri, title: chunk.web.title } } : null))
          .filter(Boolean);
        return jsonResponse(res, 200, { ok: true, data: { text: response.text || 'Sem resumo.', sources } });
      }

      case 'chatWithGemini': {
        const message = String(body?.message || '').trim();
        const mode = (body?.mode || 'standard') as 'fast' | 'standard' | 'search' | 'location' | 'thinking';
        const history = Array.isArray(body?.history) ? body.history : [];
        if (!message) return jsonResponse(res, 400, { error: 'Missing message.' });

        let model = 'gemini-3-pro-preview';
        let tools: any[] = [];
        let config: any = {};
        switch (mode) {
          case 'fast': model = 'gemini-flash-lite-latest'; break;
          case 'search': model = 'gemini-3-flash-preview'; tools = [{ googleSearch: {} }]; break;
          case 'location': model = 'gemini-flash-latest'; tools = [{ googleMaps: {} }]; break;
          case 'thinking': model = 'gemini-3-pro-preview'; config = { thinkingConfig: { thinkingBudget: 32768 } }; break;
        }
        const contents = [...history, { role: 'user', parts: [{ text: message }] }];
        const response = await ai.models.generateContent({ model, contents, config: { ...config, tools: tools.length > 0 ? tools : undefined } });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const searchSources = groundingChunks.filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
        const mapSources = groundingChunks.filter((c: any) => c.maps).map((c: any) => ({ uri: c.maps.uri, title: c.maps.title, source: c.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.snippet || 'Localização' }));
        return jsonResponse(res, 200, { ok: true, data: { text: response.text || 'Sem resposta.', searchSources, mapSources } });
      }

      case 'generateCampaignImage': {
        const prompt = String(body?.prompt || '').trim();
        const aspectRatio = String(body?.aspectRatio || '1:1');
        if (!prompt) return jsonResponse(res, 400, { error: 'Missing prompt.' });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            return jsonResponse(res, 200, { ok: true, data: { imageDataUrl: `data:image/png;base64,${part.inlineData.data}` } });
          }
        }
        return jsonResponse(res, 200, { ok: true, data: { imageDataUrl: null } });
      }

      case 'transcribeAudio': {
        const base64Audio = String(body?.base64Audio || '').trim();
        const mimeType = String(body?.mimeType || 'audio/webm');
        if (!base64Audio) return jsonResponse(res, 400, { error: 'Missing audio.' });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: 'Transcreva o áudio.' }] }
        });
        return jsonResponse(res, 200, { ok: true, data: { text: response.text || '' } });
      }

      default:
        return jsonResponse(res, 400, { error: 'Unsupported action.' });
    }
  } catch (error: any) {
    return jsonResponse(res, 500, { error: error?.message || 'Unexpected server error.' });
  }
}
