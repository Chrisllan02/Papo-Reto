
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

// Cache Utils para AI
const NEWS_CACHE_KEY = 'paporeto_news_v8_daily'; 
const NEWS_HISTORY_KEY = 'paporeto_news_history_v1';
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

// --- DICIONÁRIO DIDÁTICO ---
const LEGISLATIVE_GLOSSARY: Record<string, string> = {
    'requerimento de urgência': 'Os deputados votaram para **acelerar este projeto**, permitindo que ele pule a análise das comissões e seja votado imediatamente no Plenário.',
    'medida provisória': 'Esta é uma norma com **força de lei imediata** editada pelo Presidente. O Congresso está decidindo se ela continua valendo definitivamente.',
    'projeto de lei complementar': 'Votação de uma lei que detalha regras específicas exigidas pela Constituição. Exige aprovação da maioria absoluta (257 deputados).',
    'proposta de emenda à constituição': 'Uma das votações mais importantes. Tenta **mudar a Constituição Federal**, a lei máxima do país. Exige apoio de 308 deputados.',
    'redação final': 'O texto já foi aprovado no mérito. Esta votação serve apenas para **confirmar a gramática e a técnica jurídica** antes de enviar para o Senado ou Sanção.',
    'destaque': 'Votação separada para tentar **retirar ou alterar um trecho específico** do texto principal que já foi discutido.',
    'requerimento de retirada': 'Um pedido para **adiar a discussão** deste tema. Se aprovado, o assunto sai da pauta de hoje.',
    'projeto de resolução': 'Decisão interna sobre regras da própria Câmara ou de seus membros (como cassações ou salários).',
    'projeto de decreto legislativo': 'O Congresso usando seu poder para fiscalizar o Executivo, aprovar tratados internacionais ou sustar atos do Presidente.',
};

// --- GERAÇÃO DE TÍTULO (MANCHETE JORNALÍSTICA) ---
function cleanLegislativeTitle(rawText: string): string {
    if (!rawText) return "Movimentação no Congresso";

    let text = rawText.trim();
    let prefix = "";

    // Identificar Ação para Prefixo
    if (text.match(/requerimento de urgência/i)) prefix = "Urgência: ";
    else if (text.match(/redação final/i)) prefix = "Texto Final: ";
    else if (text.match(/destaque/i)) prefix = "Destaque: ";
    else if (text.match(/projeto de lei/i)) prefix = "Lei: ";
    else if (text.match(/proposta de emenda/i)) prefix = "PEC: ";

    // Limpeza Brutal
    text = text
        .replace(/^(Votação|Discussão|Apreciação) (única )?(em \w+ turno )?(d[oa]s? )?/i, "")
        .replace(/^Aprovação d[oa] /i, "")
        .replace(/Projeto de Lei n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Proposta de Emenda à Constituição n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Medida Provisória n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Requerimento n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Parecer.*proferido.*/i, "")
        .replace(/ - \d{2}\/\d{2}\/\d{4}.*$/, "");

    // Extração do Tema
    const matchInstitui = text.match(/(?:que|visando|para) (institui|cria|autoriza|obriga|concede|reconhece|altera|dispõe|regulamenta) (.*?)(?:;|\.|$)/i);
    if (matchInstitui) {
        text = matchInstitui[2].trim();
    } else {
        // Se não achou verbo claro, tenta pegar o início
        text = text.split(/,|;/)[0]; 
    }

    // Capitalização
    text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    
    // Limite de tamanho
    if (text.length > 60) text = text.substring(0, 57) + "...";

    return (prefix + text).replace(/\s+/g, ' ').trim();
}

// --- TRADUTOR DIDÁTICO (CORPO DA NOTÍCIA) ---
function summarizeLegislativeText(rawText: string): string {
    if (!rawText) return "Detalhes não informados pela fonte oficial.";

    let summary = "";
    const lowerText = rawText.toLowerCase();

    // 1. Identificar o "O Que É" (Glossário)
    let explanation = "";
    for (const [key, value] of Object.entries(LEGISLATIVE_GLOSSARY)) {
        if (lowerText.includes(key)) {
            explanation = value;
            break;
        }
    }

    // 2. Identificar o "Sobre o Que É" (Assunto)
    let subject = rawText;
    
    // Tenta limpar o "juridiquês" do assunto
    const matchSubject = rawText.match(/(?:institui|cria|sobre|acerca d[eo]|referente [aà])\s+(.*?)(?:;|\.|,|$)/i);
    if (matchSubject && matchSubject[1]) {
        subject = matchSubject[1].trim();
    } else {
        // Fallback: limpa prefixos
        subject = subject.replace(/^(Votação|Discussão).*?(nº \d+)?/i, "").trim();
    }

    // Tradução de termos específicos no assunto
    subject = subject
        .replace(/abre crédito extraordinário/gi, "libera dinheiro extra fora do orçamento")
        .replace(/em favor de/gi, "para")
        .replace(/encargos financeiros/gi, "impostos e taxas")
        .replace(/dispõe sobre/gi, "trata de");

    // 3. Montar o Texto Final
    if (explanation) {
        summary = `🎓 **Entenda:** ${explanation}\n\n📌 **O Tema:** O texto original trata de ${subject}.`;
    } else {
        // Se não for um termo do glossário, foca em explicar a ação
        if (lowerText.includes('aprovad')) {
            summary = `✅ **Aprovado:** Os deputados concordaram com este texto. Ele trata de: ${subject}.`;
        } else if (lowerText.includes('rejeitad') || lowerText.includes('retirad')) {
            summary = `🛑 **Parado:** A proposta foi rejeitada ou retirada da pauta. O tema era: ${subject}.`;
        } else {
            summary = `🗳️ **Em Debate:** O Plenário está discutindo sobre ${subject}. Acompanhe o resultado.`;
        }
    }

    return summary;
}

// Helper Functions Required for NewsTicker and NewsHistoryView
const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getCache(NEWS_HISTORY_KEY, 0) as NewsArticle[] || [];
        const uniqueNew = newArticles.filter(n => !currentHistory.some(h => h.title === n.title));
        if (uniqueNew.length > 0) {
            const updatedHistory = [...uniqueNew, ...currentHistory].slice(0, 50);
            setCache(NEWS_HISTORY_KEY, updatedHistory);
        }
    } catch (e) { console.error("Erro ao salvar histórico", e); }
};

export const getNewsHistory = (): NewsArticle[] => getCache(NEWS_HISTORY_KEY, 0) || [];
export const getBestAvailableNews = (): NewsArticle[] | null => getCache(NEWS_CACHE_KEY, 0);

export function getEmergencyNews() {
    return [
        { title: "Sessão Deliberativa na Câmara", source: "Agência Câmara", url: "https://www.camara.leg.br", time: "Hoje", summary: "Deputados debatem pautas prioritárias para o país em sessão deliberativa no plenário.", imageUrl: STATIC_FALLBACK_IMAGES[0] },
        { title: "Votações no Senado Federal", source: "Agência Senado", url: "https://www12.senado.leg.br", time: "Hoje", summary: "Senadores analisam medidas provisórias e projetos de lei em tramitação.", imageUrl: STATIC_FALLBACK_IMAGES[1] },
        { title: "Pauta Econômica em Debate", source: "Portal da Câmara", url: "https://www.camara.leg.br/noticias/", time: "Recente", summary: "Líderes discutem diretrizes para o orçamento e novas propostas econômicas.", imageUrl: STATIC_FALLBACK_IMAGES[2] }
    ];
}

// REPLACED AI NEWS GENERATION WITH REAL API DATA
export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
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
            
            // Nova Lógica de Processamento
            const title = cleanLegislativeTitle(item.descricao);
            const summary = summarizeLegislativeText(item.descricao);

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
                summary: summary,
                imageUrl: STATIC_FALLBACK_IMAGES[index % STATIC_FALLBACK_IMAGES.length]
            };
        });

        // Simulação de AI (Lightweight) para enriquecer se necessário, mas aqui confiamos no novo parser
        const enrichedData = newsItems;

        if (enrichedData.length > 0) {
            setCache(NEWS_CACHE_KEY, enrichedData);
            saveToHistory(enrichedData);
        }
        
        return enrichedData;

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
    const ai = getAi();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [{ text: `Fotojornalismo profissional...: '${headline}'.` }] },
            config: { imageConfig: { aspectRatio: "16:9" } }
        });
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e: any) { return null; }
};

export const getNewsSummary = async (title: string, source: string): Promise<string> => {
    return "Resumo detalhado indisponível no momento. Consulte a fonte oficial.";
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
