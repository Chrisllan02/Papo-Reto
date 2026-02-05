
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsArticle } from '../types';

// --- CONFIGURAÇÃO SEGURA DO CLIENTE AI ---
let aiClient: GoogleGenAI | null = null;

const getAi = () => {
    if (aiClient) return aiClient;
    
    const key = process.env.API_KEY;
    if (!key || key.trim() === "") {
        console.warn("Aviso: API_KEY do Google Gemini não encontrada. Funcionalidades de IA usarão fallback.");
        return null;
    }
    
    try {
        aiClient = new GoogleGenAI({ apiKey: key });
        return aiClient;
    } catch (e) {
        console.error("Erro ao inicializar GoogleGenAI:", e);
        return null;
    }
};

// Cache Utils
const NEWS_CACHE_KEY = 'paporeto_news_v11_clean'; // Version Bump: v11 to purge old emojis
const NEWS_HISTORY_KEY = 'paporeto_news_history_v2'; // Version bump para limpar estrutura antiga
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 4; // 4 Horas

const getCache = (key: string, ttl: number) => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        const { data, timestamp } = JSON.parse(item);
        if (ttl > 0 && Date.now() - timestamp > ttl) return null;
        return data;
    } catch (e) {
        return null;
    }
};

const setCache = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
        console.warn('Cache full, clearing old keys');
        try {
            localStorage.removeItem('paporeto_img_cache_v2'); 
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch(err) {
            console.error("Critical storage error", err);
        }
    }
};

const STATIC_FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1541872703-74c5e4436bb7?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1575320181282-9afab399332c?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1555848962-6e79363ec58f?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1529101091760-6149d4c46b7d?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?q=80&w=800&auto=format&fit=crop"
];

export interface AIResponse {
    text: string;
    sources: { web?: { uri: string; title: string }; maps?: { uri: string; title: string; source: string } }[];
}

export interface GeneratedArticle {
    title: string; text: string; topic: string; legislation?: string; impact?: string;
}

// --- MOTOR DE TRADUÇÃO LEGISLATIVA (DETERMINÍSTICO) ---

// 1. Dicionário de Títulos (Manchetes)
const TITLE_TRANSLATION_MAP: Array<{ regex: RegExp, template: string }> = [
    { regex: /aprovado o requerimento de urgência/i, template: "Votação Acelerada: Urgência Aprovada" },
    { regex: /mantido o texto/i, template: "Veto Preservado: Texto Original Mantido" },
    { regex: /rejeitado o texto/i, template: "Veto Derrubado: Congresso Altera a Lei" },
    { regex: /encaminhada à publicação/i, template: "Projeto Protocolado Oficialmente" },
    { regex: /aprovada a redação final/i, template: "Texto Final Aprovado na Câmara" },
    { regex: /designado relator/i, template: "Relator Escolhido para o Projeto" },
    { regex: /novo despacho/i, template: "Atualização no Processo Legislativo" },
    { regex: /retirado de pauta/i, template: "Votação Adiada: Retirado de Pauta" },
    { regex: /rejeitado o requerimento/i, template: "Proposta Negada pelo Plenário" },
    { regex: /aprovado o projeto/i, template: "Aprovado: Projeto Segue Tramitação" },
    { regex: /transformado na lei/i, template: "Sanção: Nova Lei em Vigor" }
];

function generateJournalisticTitle(rawText: string): string {
    if (!rawText) return "Movimentação no Congresso";
    const text = rawText.trim();

    // 1. Tenta encontrar um padrão exato
    for (const rule of TITLE_TRANSLATION_MAP) {
        if (rule.regex.test(text)) {
            return rule.template;
        }
    }

    // 2. Se não achar, tenta limpar e formatar o texto bruto
    let cleaned = text
        .replace(/^(Votação|Discussão|Apreciação) (única )?(em \w+ turno )?(d[oa]s? )?/i, "")
        .replace(/^Aprovação d[oa] /i, "")
        .replace(/Projeto de Lei n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Proposta de Emenda à Constituição n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Medida Provisória n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Requerimento n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Parecer.*proferido.*/i, "")
        .replace(/ - \d{2}\/\d{2}\/\d{4}.*$/, "");

    // Extração do tema principal se possível
    const matchInstitui = cleaned.match(/(?:que|visando|para) (institui|cria|autoriza|obriga|concede|reconhece|altera|dispõe|regulamenta) (.*?)(?:;|\.|$)/i);
    if (matchInstitui) {
        cleaned = matchInstitui[2].trim();
    } else {
        cleaned = cleaned.split(/,|;/)[0]; // Pega até a primeira vírgula
    }

    // Capitalização e limite
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    if (cleaned.length > 55) cleaned = cleaned.substring(0, 52) + "...";

    return cleaned || "Atualização Legislativa";
}

// 2. Motor de Resumos (Contexto + Texto)
function generateStructuredSummary(rawText: string): { context: string, main: string } {
    const defaultResponse = {
        context: "Tramitação Legislativa",
        main: rawText || "Detalhes não disponíveis no momento."
    };

    if (!rawText) return defaultResponse;
    const lowerText = rawText.toLowerCase();

    // Extração do "Assunto" (Tenta limpar o juridiquês)
    let subject = rawText;
    const matchSubject = rawText.match(/(?:institui|cria|sobre|acerca d[eo]|referente [aà])\s+(.*?)(?:;|\.|,|$)/i);
    if (matchSubject && matchSubject[1]) {
        subject = matchSubject[1].trim();
    }
    
    // Limpeza final do assunto
    subject = subject
        .replace(/n\.º? ?\d+(\/\d+)?/g, "") // Remove números de lei
        .replace(/Dispõe sobre/i, "trata de")
        .replace(/Altera a Lei/i, "altera a legislação sobre");

    // Definição do Contexto (Bold Text)
    let context = "Em Análise";
    let explanation = `O texto trata de: ${subject}.`;

    if (lowerText.includes('urgência')) {
        context = "Regime de Urgência";
        explanation = `Os deputados aprovaram a aceleração deste projeto. Isso significa que a proposta sobre ${subject} pulará comissões e será votada diretamente no Plenário.`;
    } else if (lowerText.includes('medida provisória')) {
        context = "Medida Provisória";
        explanation = `O Congresso analisa uma norma do Presidente com força de lei imediata. O tema é: ${subject}.`;
    } else if (lowerText.includes('emenda à constituição') || lowerText.includes('pec')) {
        context = "Mudança na Constituição";
        explanation = `Uma das votações mais importantes. Tenta alterar a lei máxima do país sobre ${subject}. Exige 308 votos.`;
    } else if (lowerText.includes('redação final')) {
        context = "Revisão Final";
        explanation = `O mérito já foi aprovado. Agora, os deputados confirmam apenas a gramática e técnica jurídica do texto sobre ${subject} antes de enviar ao Senado ou Sanção.`;
    } else if (lowerText.includes('retirado')) {
        context = "Adiado";
        explanation = `A discussão sobre ${subject} foi removida da pauta de hoje e deve voltar em outra sessão.`;
    } else if (lowerText.includes('rejeitado')) {
        context = "Proposta Recusada";
        explanation = `A maioria dos parlamentares ou a Mesa Diretora negou o pedido ou projeto referente a ${subject}.`;
    } else if (lowerText.includes('aprovado')) {
        context = "Aprovado no Plenário";
        explanation = `Os deputados concordaram com a proposta. O texto sobre ${subject} segue para a próxima etapa legislativa.`;
    }

    // Garante que a explicação não fique gigante ou vazia
    if (explanation.length > 200) explanation = explanation.substring(0, 197) + "...";

    return {
        context: context,
        main: explanation
    };
}

// Persistência Inteligente (Evita Duplicatas)
const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getCache(NEWS_HISTORY_KEY, 0) as NewsArticle[] || [];
        
        // Cria um Set de assinaturas (título + data) para checagem rápida
        const existingSignatures = new Set(currentHistory.map(h => `${h.title}|${h.time}`));
        
        const uniqueNew = newArticles.filter(n => !existingSignatures.has(`${n.title}|${n.time}`));
        
        if (uniqueNew.length > 0) {
            // Adiciona novos no topo e limita a 50 itens
            const updatedHistory = [...uniqueNew, ...currentHistory].slice(0, 50);
            setCache(NEWS_HISTORY_KEY, updatedHistory);
        }
    } catch (e) { console.error("Erro ao salvar histórico", e); }
};

export const getNewsHistory = (): NewsArticle[] => getCache(NEWS_HISTORY_KEY, 0) || [];
export const getBestAvailableNews = (): NewsArticle[] | null => getCache(NEWS_CACHE_KEY, 0);

export function getEmergencyNews(): NewsArticle[] {
    return [
        { 
            title: "Sessão Deliberativa na Câmara", 
            source: "Agência Câmara", 
            url: "https://www.camara.leg.br", 
            time: "Hoje", 
            summary: {
                context: "Atividade em Plenário",
                main: "Deputados debatem pautas prioritárias para o país em sessão deliberativa. Acompanhe os resultados."
            },
            imageUrl: STATIC_FALLBACK_IMAGES[0] 
        },
        { 
            title: "Votações no Senado Federal", 
            source: "Agência Senado", 
            url: "https://www12.senado.leg.br", 
            time: "Hoje", 
            summary: {
                context: "Senado em Ação",
                main: "Senadores analisam medidas provisórias e projetos de lei em tramitação. Decisões impactam diretamente a legislação federal."
            },
            imageUrl: STATIC_FALLBACK_IMAGES[1] 
        }
    ];
}

// FETCH REAL API DATA
export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    // Tenta usar cache primeiro
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) return cachedNews;

    try {
        const response = await fetch('https://dadosabertos.camara.leg.br/api/v2/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=5', {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error("Falha na API da Câmara");

        const json = await response.json();
        
        if (!json.dados || json.dados.length === 0) {
            return getEmergencyNews();
        }

        const newsItems: NewsArticle[] = json.dados.map((item: any, index: number) => {
            const date = new Date(item.dataHoraRegistro).toLocaleDateString('pt-BR');
            const time = new Date(item.dataHoraRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Usando os novos motores determinísticos
            const title = generateJournalisticTitle(item.descricao);
            const summaryStructure = generateStructuredSummary(item.descricao);

            let sourceUrl = `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(item.descricao)}`;
            if (item.uriProposicaoObjeto) {
                const propId = item.uriProposicaoObjeto.split('/').pop();
                if (propId) sourceUrl = `https://www.camara.leg.br/propostas-legislativas/${propId}`;
            }

            return {
                title: title,
                source: "Câmara dos Deputados",
                url: sourceUrl,
                time: `${date} às ${time}`,
                summary: summaryStructure,
                imageUrl: STATIC_FALLBACK_IMAGES[index % STATIC_FALLBACK_IMAGES.length]
            };
        });

        if (newsItems.length > 0) {
            setCache(NEWS_CACHE_KEY, newsItems);
            saveToHistory(newsItems);
        }
        
        return newsItems;

    } catch (error: any) {
        console.warn("News Fetch Error:", error);
        return getEmergencyNews();
    }
};

export const speakContent = async (text: string): Promise<Uint8Array | null> => {
    const ai = getAi();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Diga de forma clara e profissional: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const generateNewsImage = async (headline: string): Promise<string | null> => {
    // Placeholder - Image Generation is expensive/slow for real-time tickers
    return null;
};

export const getSearchContext = async (query: string): Promise<AIResponse | null> => {
    const ai = getAi();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Pesquise sobre: "${query}"...`,
            config: { tools: [{ googleSearch: {} }] }
        });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks.map((c: any) => ({ web: c.web ? { uri: c.web.uri, title: c.web.title } : undefined })).filter((s: any) => s.web);
        return { text: response.text || "Sem resumo.", sources: sources };
    } catch (error) { return null; }
};

export const chatWithGemini = async (message: string, mode: 'fast' | 'standard' | 'search' | 'location' | 'thinking', history: { role: string; parts: { text: string }[] }[] = []): Promise<{ text: string; searchSources?: any[]; mapSources?: any[] }> => {
    const ai = getAi();
    if (!ai) return { text: "⚠️ Sistema offline. Verifique a API Key." };
    try {
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
        const mapSources = groundingChunks.filter((c: any) => c.maps).map((c: any) => ({ uri: c.maps.uri, title: c.maps.title, source: c.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.snippet || "Localização" }));
        return { text: response.text || "Sem resposta.", searchSources, mapSources };
    } catch (error: any) {
        if (checkQuotaError(error)) return { text: "⚠️ Limite de uso da IA atingido." };
        return { text: "Erro ao processar mensagem." };
    }
};

export const generateCampaignImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    const ai = getAi();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
    } catch (error) { return null; }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = 'audio/webm'): Promise<string> => {
    const ai = getAi();
    if (!ai) return "";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: "Transcreva o áudio." }] }
        });
        return response.text || "";
    } catch (error) { return ""; }
};

const checkQuotaError = (error: any): boolean => {
    if (!error) return false;
    if (error.status === 429 || error.code === 429) return true;
    if (error.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED')) return true;
    const msg = error.message || JSON.stringify(error);
    return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota');
};

export const generateEducationalContent = async (): Promise<GeneratedArticle[]> => {
    const ai = getAi();
    const staticContent: GeneratedArticle[] = [
        {
            title: "O Orçamento Público",
            text: "O Orçamento Público estima as receitas e fixa as despesas do governo para um ano. É a lei que define onde seu dinheiro será gasto: saúde, educação, segurança.",
            topic: "Orçamento",
            legislation: "Art. 165 da Constituição Federal",
            impact: "Define a qualidade dos serviços públicos que você usa."
        },
        {
            title: "PEC vs Projeto de Lei",
            text: "PEC altera a Constituição e exige 3/5 dos votos. PL cria leis comuns e exige maioria simples. PECs mudam as regras do jogo; PLs jogam o jogo.",
            topic: "Legislação",
            legislation: "Art. 59 a 69 da CF/88",
            impact: "PECs geralmente trazem mudanças profundas e duradouras."
        },
        {
            title: "O Papel do STF",
            text: "O STF é o guardião da Constituição. Ele não cria leis, mas julga se as leis criadas pelo Congresso e atos do Presidente respeitam a Constituição.",
            topic: "Poder Judiciário",
            legislation: "Art. 101 da CF/88",
            impact: "Garante que seus direitos fundamentais não sejam violados."
        }
    ];
    if (!ai) return staticContent;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Atue como um Professor de Direito Constitucional. Gere 3 artigos educativos curtos e diretos sobre política brasileira. Regras: Máximo 60 palavras, linguagem simples, JSON.`,
            config: {
                responseMimeType: "application/json",
                maxOutputTokens: 4000, 
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { title: { type: Type.STRING }, text: { type: Type.STRING }, topic: { type: Type.STRING }, legislation: { type: Type.STRING }, impact: { type: Type.STRING } },
                        required: ["title", "text", "topic"]
                    }
                }
            }
        });
        let jsonStr = response.text?.trim();
        if (!jsonStr) return staticContent;
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        try { return JSON.parse(jsonStr) as GeneratedArticle[]; } catch (e) { return staticContent; }
    } catch (error: any) { return staticContent; }
};
