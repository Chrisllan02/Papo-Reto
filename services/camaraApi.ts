
import { Politician, FeedItem, Party, ExpenseCategory, Speech, ExpenseItem, LegislativeEvent } from '../types';
import { PARTY_METADATA } from '../constants';
import { detectCategory } from '../utils/legislativeTranslator';
import { getConfiguredApiOrigin, getLegislativeApiUrl } from '../utils/legislativeApiProxy';

export const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
// FORCE CACHE INVALIDATION TO GET NEW SPEECH DATA
const CACHE_PREFIX = 'paporeto_cache_v8_official_';
export const TTL_DYNAMIC = 1000 * 60 * 15; // 15 minutos
export const PROFILE_DETAIL_FRESH_TTL = 1000 * 60 * 60 * 24; // 24 horas
export const PROFILE_DETAIL_STALE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 dias
const TTL_STATIC = 1000 * 60 * 60 * 24; // 24 horas
const inFlightCacheRequests = new Map<string, Promise<any>>();

// --- CACHE UTILS ---
export const fetchWithCache = async <T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T | null> => {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ttl) {
                return data;
            }
        }
    } catch (e) {
        console.warn('Cache read error', e);
    }

    const existingRequest = inFlightCacheRequests.get(cacheKey);
    if (existingRequest) {
        return existingRequest as Promise<T | null>;
    }

    const request = (async () => {
    try {
        const data = await fetcher();
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
            console.warn('Cache write error (quota?)', e);
        }
        return data;
    } catch (e) {
        console.error(`Fetch error for ${key}`, e);
        return null;
    } finally {
        inFlightCacheRequests.delete(cacheKey);
    }
    })();

    inFlightCacheRequests.set(cacheKey, request);
    return request;
};

const getProfileCacheEndpoint = () => {
    try {
        const configured = import.meta.env?.VITE_PROFILE_CACHE_ENDPOINT;
        if (configured) return configured;
        const origin = getConfiguredApiOrigin();
        return origin ? `${origin}/api/profile-cache` : '/api/profile-cache';
    } catch {
        return '/api/profile-cache';
    }
};

const fetchCachedPolitician = async (id: number): Promise<Partial<Politician> | null> => {
    const endpoint = getProfileCacheEndpoint();
    try {
        const res = await fetch(`${endpoint}?type=politician&id=${id}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

export const fetchCachedPoliticianProfile = async (id: number): Promise<Partial<Politician> | null> => {
    return fetchCachedPolitician(id);
};

export const hasProfileCacheData = (cached?: Partial<Politician> | null) => {
    if (!cached) return false;
    const hasArrays =
        (cached.detailedExpenses && cached.detailedExpenses.length > 0) ||
        (cached.expensesBreakdown && cached.expensesBreakdown.length > 0) ||
        (cached.votingHistory && cached.votingHistory.length > 0) ||
        (cached.fronts && cached.fronts.length > 0) ||
        (cached.speeches && cached.speeches.length > 0) ||
        (cached.agenda && cached.agenda.length > 0) ||
        (cached.occupations && cached.occupations.length > 0);
    const hasStats = Boolean(cached.stats && (cached.stats.spending > 0 || cached.stats.projects > 0));
    return hasArrays || hasStats;
};

export const getProfileDataScore = (profile?: Partial<Politician> | null) => {
    if (!profile) return 0;
    const count = (items?: unknown[]) => Array.isArray(items) ? items.length : 0;
    const stats = profile.stats;
    return (
        count(profile.detailedExpenses) * 3 +
        count(profile.expensesBreakdown) * 4 +
        count(profile.votingHistory) * 3 +
        count(profile.fronts) * 2 +
        count(profile.occupations) * 2 +
        count(profile.speeches) * 2 +
        count(profile.agenda) * 2 +
        (stats?.spending && stats.spending > 0 ? 12 : 0) +
        (stats?.projects && stats.projects > 0 ? 8 : 0) +
        (profile.birthDate ? 3 : 0) +
        (profile.cabinet ? 2 : 0) +
        (profile.socials && profile.socials.length > 0 ? 2 : 0)
    );
};

const saveCachedPolitician = async (id: number, _data: Partial<Politician>) => {
    const endpoint = getProfileCacheEndpoint();
    try {
        await fetch(`${endpoint}?type=politician&id=${id}`, {
            method: 'POST'
        });
    } catch {
        // Silently ignore server-side cache refresh errors.
    }
};

const prefetchInFlight = new Set<number>();
const PREFETCH_MARK_KEY = 'paporeto_prefetched_profiles_v1';

const readPrefetchMarks = (): Record<string, number> => {
    try {
        const raw = localStorage.getItem(PREFETCH_MARK_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writePrefetchMarks = (marks: Record<string, number>) => {
    try {
        localStorage.setItem(PREFETCH_MARK_KEY, JSON.stringify(marks));
    } catch {
        // Ignore storage quota issues.
    }
};

export const fetchAPI = async (url: string, retries = 3, json = true, delay = 1000, timeoutMs = 15000): Promise<any> => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const res = await fetch(getLegislativeApiUrl(url), {
            headers: { 'Accept': 'application/json' },
            signal: controller?.signal
        });
        if (!res.ok) {
            const error = new Error(`API Error ${res.status}`) as Error & { status?: number; retryable?: boolean };
            error.status = res.status;
            error.retryable = res.status >= 500 || res.status === 429;
            throw error;
        }
        return json ? await res.json() : res;
    } catch (error: any) {
        const retryable = error?.retryable !== false;
        if (retries > 0 && retryable) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchAPI(url, retries - 1, json, delay * 2, timeoutMs);
        }
        throw error;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

export const formatText = (text: string) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const normalizeSex = (value?: string | null): 'F' | 'M' | undefined => {
    if (!value) return undefined;
    const cleaned = value.trim().toUpperCase();
    if (cleaned.startsWith('F')) return 'F';
    if (cleaned.startsWith('M')) return 'M';
    return undefined;
};

// --- HELPERS ---

export const getIdeology = (partySigla: string): 'Esquerda' | 'Centro' | 'Direita' => {
    const sigla = partySigla ? partySigla.trim().toUpperCase() : '';
    if (PARTY_METADATA[sigla]) return PARTY_METADATA[sigla].ideology;
    return 'Centro';
};

export const formatPartyName = (sigla: string): string => {
    const s = sigla ? sigla.trim().toUpperCase() : '';
    return PARTY_METADATA[s]?.nome || s;
};

export const getStaticParties = (): Party[] => {
    return Object.entries(PARTY_METADATA).map(([sigla, data], index) => ({
        id: index + 1000,
        sigla,
        nome: data.nome,
        uri: '',
        urlLogo: data.logo,
        ideology: data.ideology
    }));
};

// --- HELPER: TRAMITÔMETRO (STATUS CALCULATOR) ---
const calculateProgress = (statusDescription: string): { progress: number, label: string } => {
    const s = statusDescription.toLowerCase();
    
    if (s.includes('apresentação') || s.includes('protocolo')) return { progress: 10, label: 'Apresentação' };
    if (s.includes('aguardando parecer') || s.includes('comissão') || s.includes('ccjc')) return { progress: 30, label: 'Comissões' };
    if (s.includes('pronta para pauta') || s.includes('plenário') || s.includes('ordem do dia')) return { progress: 60, label: 'Plenário' };
    if (s.includes('remessa ao senado') || s.includes('senado')) return { progress: 80, label: 'Senado Federal' };
    if (s.includes('sanção') || s.includes('veto') || s.includes('transformado em lei')) return { progress: 100, label: 'Sanção/Lei' };
    
    return { progress: 20, label: 'Tramitando' };
};

// --- CORE FETCHERS ---

export const fetchDeputados = async (): Promise<Politician[]> => {
    const result = await fetchWithCache('deputados_list', async () => {
        const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados?ordem=ASC&ordenarPor=nome`);
        
        if (!data || !data.dados) {
            throw new Error("Invalid data format from API");
        }

        return data.dados.map((d: any) => ({
            id: d.id,
            name: formatText(d.nome),
            party: d.siglaPartido,
            state: d.siglaUf,
            photo: d.urlFoto,
            // Correção de Gênero: Verifica se o campo sexo existe na listagem inicial, senão padroniza para neutro até enriquecimento
            role: normalizeSex(d.sexo) === 'F' ? 'Deputada Federal' : 'Deputado Federal',
            sex: normalizeSex(d.sexo),
            email: d.email,
            stats: {
                attendancePct: 0,
                totalSessions: 0,
                presentSessions: 0,
                absentSessions: 0,
                plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
                commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
                projects: 0,
                spending: 0,
                partyFidelity: undefined
            },
            mandate: { start: '2023-02-01', end: '2027-01-31' },
            hasApiIntegration: true,
            votes: {}
        }));
    }, TTL_STATIC);
    return result || [];
};

export const fetchSenadores = async (): Promise<Politician[]> => {
    const SENADO_URL = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';

    const parseXmlText = (xmlText: string): Politician[] => {
        try {
            if (typeof DOMParser === 'undefined') return [];
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'text/xml');
            if (xml.getElementsByTagName('parsererror').length > 0) return [];

            const parlamentares = Array.from(xml.getElementsByTagName('Parlamentar'));
            return parlamentares.map((parlamentar) => {
                const getText = (tag: string) => {
                    const el = parlamentar.getElementsByTagName(tag)[0];
                    return el?.textContent?.trim() || '';
                };

                const id = Number(getText('CodigoParlamentar') || getText('IdParlamentar')) || Math.floor(Math.random() * 1_000_000);
                const name = getText('NomeParlamentar') || getText('NomeCompletoParlamentar');
                const party = getText('SiglaPartidoParlamentar');
                const state = getText('SiglaUfParlamentar') || getText('UfParlamentar');
                const photo = getText('UrlFotoParlamentar');
                const sex = normalizeSex(getText('SexoParlamentar'));
                const mandateStart = getText('DataInicio');
                const mandateEndDates = Array.from(parlamentar.getElementsByTagName('DataFim'))
                    .map(el => el.textContent?.trim() || '')
                    .filter(Boolean)
                    .sort();
                const suplentes = Array.from(parlamentar.getElementsByTagName('Suplente'))
                    .map(suplente => {
                        const participation = suplente.getElementsByTagName('DescricaoParticipacao')[0]?.textContent?.trim();
                        const suplenteName = suplente.getElementsByTagName('NomeParlamentar')[0]?.textContent?.trim();
                        return [participation, suplenteName].filter(Boolean).join(' - ');
                    })
                    .filter(Boolean);

                return {
                    id,
                    name: formatText(name),
                    party,
                    partyShort: party,
                    state,
                    photo,
                    role: sex === 'F' ? 'Senadora' : 'Senador',
                    sex,
                    civilName: formatText(getText('NomeCompletoParlamentar')),
                    email: getText('EmailParlamentar'),
                    cabinet: { phone: getText('NumeroTelefone') },
                    officialPage: getText('UrlPaginaParlamentar'),
                    website: getText('UrlPaginaParticular'),
                    parliamentaryBlock: getText('NomeBloco'),
                    isBoardMember: getText('MembroMesa').toLowerCase() === 'sim',
                    isLeader: getText('MembroLideranca').toLowerCase() === 'sim',
                    participation: getText('DescricaoParticipacao'),
                    exerciseStart: getText('DataInicio'),
                    exerciseEnd: getText('DataFim'),
                    condition: getText('DescricaoParticipacao'),
                    suplentes,
                    matchScore: 0,
                    bio: '',
                    stats: {
                        attendancePct: 0,
                        totalSessions: 0,
                        presentSessions: 0,
                        absentSessions: 0,
                        plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
                        commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
                        projects: 0,
                        spending: 0,
                        partyFidelity: undefined
                    },
                    mandate: { start: mandateStart || '2023-02-01', end: mandateEndDates.at(-1) || '2031-01-31' },
                    hasApiIntegration: false,
                    votes: {}
                } as Politician;
            }).filter(p => p.name && p.party && p.state);
        } catch {
            return [];
        }
    };

    const result = await fetchWithCache('senadores_list', async () => {
        const res = await fetchAPI(SENADO_URL, 2, false, 1000, 15000);
        const xmlText = await (res as Response).text();
        return parseXmlText(xmlText);
    }, TTL_STATIC);

    return result || [];
};

export const fetchPartidos = async (): Promise<Party[]> => {
    const result = await fetchWithCache('partidos_list', async () => {
        const data = await fetchAPI(`${BASE_URL_CAMARA}/partidos?ordem=ASC&ordenarPor=sigla&itens=100`);
        if (!data || !data.dados) return [];
        
        return data.dados.map((p: any) => ({
            id: p.id,
            sigla: p.sigla,
            nome: p.nome,
            uri: p.uri,
            urlLogo: PARTY_METADATA[p.sigla]?.logo, 
            ideology: getIdeology(p.sigla)
        }));
    }, TTL_STATIC);
    return result || [];
};

// --- ENRICHMENT ---

export const enrichPoliticianFast = async (pol: Politician): Promise<Politician> => {
    // Detalhes básicos (bio, nascimento, identidade de gênero correta)
    const cacheKey = `pol_fast_${pol.id}`;
    return (await fetchWithCache(cacheKey, async () => {
        try {
            const cached = await fetchCachedPolitician(pol.id);
            if (cached && (cached.civilName || cached.birthDate || cached.cabinet || cached.socials)) {
                return { ...pol, ...cached } as Politician;
            }

            const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${pol.id}`);
            const d = data.dados;
            
            // Lógica Robusta de Gênero (Incluindo Trans)
            let finalRole = pol.role;
            let finalSex = d.sexo || pol.sex;
            if (d.sexo === 'F') {
                finalRole = 'Deputada Federal';
                finalSex = 'F';
            }
            // Override de Segurança para Identidade de Gênero (Erika Hilton, Duda Salabert) caso a API falhe/demore
            if ([220560, 220608].includes(pol.id)) {
                finalRole = 'Deputada Federal';
                finalSex = 'F';
            }

            const enriched = {
                ...pol,
                role: finalRole,
                sex: finalSex,
                civilName: formatText(d.nomeCivil),
                birthDate: d.dataNascimento, // YYYY-MM-DD
                birthCity: d.municipioNascimento,
                birthState: d.ufNascimento,
                profession: 'Parlamentar', // Placeholder, API não retorna direto aqui, enriquecido depois
                education: d.escolaridade,
                website: d.urlWebsite,
                cabinet: {
                    room: d.ultimoStatus?.gabinete?.sala,
                    floor: d.ultimoStatus?.gabinete?.andar,
                    building: d.ultimoStatus?.gabinete?.predio,
                    phone: d.ultimoStatus?.gabinete?.telefone,
                    email: d.ultimoStatus?.gabinete?.email,
                },
                socials: d.redeSocial || [],
                // Status Detalhado
                situation: d.ultimoStatus?.situacao, // "Em Exercício", "Licença"
                condition: d.ultimoStatus?.condicaoEleitoral, // "Titular", "Suplente"
                statusDescription: d.ultimoStatus?.descricaoStatus // Motivo da licença
            } as Politician;

            saveCachedPolitician(pol.id, {
                id: enriched.id,
                name: enriched.name,
                party: enriched.party,
                partyShort: enriched.partyShort,
                state: enriched.state,
                photo: enriched.photo,
                role: enriched.role,
                sex: enriched.sex,
                civilName: enriched.civilName,
                birthDate: enriched.birthDate,
                birthCity: enriched.birthCity,
                birthState: enriched.birthState,
                education: enriched.education,
                website: enriched.website,
                email: enriched.email,
                cabinet: enriched.cabinet,
                socials: enriched.socials,
                situation: enriched.situation,
                condition: enriched.condition,
                statusDescription: enriched.statusDescription
            });

            return enriched;
        } catch (e) {
            return pol;
        }
    }, TTL_STATIC)) || pol;
};

export const enrichPoliticianData = async (pol: Politician, onProgress?: (status: string) => void): Promise<Politician> => {
    const cacheKey = `pol_full_v2_${pol.id}`;
    const fullCacheKey = `${CACHE_PREFIX}${cacheKey}`;
    let staleLocalProfile: Politician | null = null;
    
    // Tenta cache local primeiro. Perfil parlamentar é dado lento: se já temos um dado bom,
    // ele continua sendo exibido mesmo quando a API pública oscila.
    try {
        const cached = localStorage.getItem(fullCacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - Number(timestamp || 0);
            if (data && age < PROFILE_DETAIL_STALE_TTL) {
                staleLocalProfile = data;
                if (age < PROFILE_DETAIL_FRESH_TTL) return data;
            }
        }
    } catch {
        staleLocalProfile = null;
    }

    try {
        const cachedGithub = await fetchCachedPolitician(pol.id);
        if (hasProfileCacheData(cachedGithub)) {
            const merged = { ...(staleLocalProfile || pol), ...cachedGithub } as Politician;
            if (!staleLocalProfile || getProfileDataScore(merged) >= getProfileDataScore(staleLocalProfile)) {
                localStorage.setItem(fullCacheKey, JSON.stringify({ data: merged, timestamp: Date.now() }));
                return merged;
            }
        }
    } catch {
        // ignore github cache read errors
    }

    try {
        if (onProgress) onProgress("Buscando dados completos...");
        
        // Helper Safe Fetch: Garante que uma falha não quebre todo o perfil
        const safeFetch = async (url: string) => {
            try {
                return await fetchAPI(url);
            } catch (e: any) {
                if ([400, 404, 405].includes(Number(e?.status))) {
                    return null;
                }
                console.warn(`Erro no endpoint secundário ${url}`, e);
                return null; // Retorna null para não rejeitar o Promise.all
            }
        };

        const today = new Date().toISOString().split('T')[0];

        // Busca paralela expandida
        const [expensesData, frentesData, ocupacoesData, discursosData, agendaData] = await Promise.all([
            safeFetch(`${BASE_URL_CAMARA}/deputados/${pol.id}/despesas?ordem=DESC&ordenarPor=mes&itens=100`),
            safeFetch(`${BASE_URL_CAMARA}/deputados/${pol.id}/frentes`),
            safeFetch(`${BASE_URL_CAMARA}/deputados/${pol.id}/ocupacoes`),
            safeFetch(`${BASE_URL_CAMARA}/deputados/${pol.id}/discursos?ordem=DESC&ordenarPor=dataHoraInicio&itens=20`),
            safeFetch(`${BASE_URL_CAMARA}/eventos?ordem=ASC&ordenarPor=dataHoraInicio&dataInicio=${today}&deputadoId=${pol.id}&itens=5`)
        ]);
        
        // --- Processamento de Despesas ---
        const expenses: ExpenseCategory[] = [];
        let detailedExpenses: ExpenseItem[] = []; 
        let totalSpending = 0;
        const typeMap: Record<string, number> = {};
        
        if (expensesData && expensesData.dados) {
            expensesData.dados.forEach((e: any) => {
                const val = Number(e.valorLiquido ?? e.valorDocumento ?? 0);
                if (!Number.isFinite(val)) return;
                totalSpending += val;
                const type = e.tipoDespesa || 'Outros';
                typeMap[type] = (typeMap[type] || 0) + val;
            });

            // Mapeia despesas para auditoria
            detailedExpenses = expensesData.dados.map((e: any, idx: number) => {
                const month = e.mes ? String(e.mes).padStart(2, '0') : '';
                const year = e.ano ? String(e.ano) : '';
                const fallbackDate = month && year ? `${month}/${year}` : undefined;
                return {
                    id: idx,
                    date: e.dataDocumento || fallbackDate,
                    provider: e.nomeFornecedor,
                    cnpjCpf: e.cnpjCpfFornecedor,
                    value: Number(e.valorLiquido ?? e.valorDocumento ?? 0),
                    documentValue: Number(e.valorDocumento ?? 0),
                    disallowedValue: Number(e.valorGlosa ?? 0),
                    type: e.tipoDespesa,
                    documentType: e.tipoDocumento,
                    documentNumber: e.numDocumento,
                    reimbursementNumber: e.numRessarcimento,
                    installment: e.parcela,
                    batchCode: e.codLote,
                    urlDocumento: e.urlDocumento
                };
            }).filter((item: any) => Number.isFinite(item.value));
        }

        Object.entries(typeMap).forEach(([type, value]) => {
            expenses.push({ type, value, percent: 0 }); 
        });
        
        expenses.forEach(e => e.percent = (e.value / totalSpending) * 100);
        expenses.sort((a,b) => b.value - a.value);

        // --- Processamento de Agenda (Eventos) ---
        const agenda: LegislativeEvent[] = agendaData && agendaData.dados ? agendaData.dados.map((e: any) => ({
            id: e.id,
            startTime: e.dataHoraInicio,
            endTime: e.dataHoraFim,
            title: e.descricaoTipo,
            description: e.descricao || e.situacao,
            location: e.localCamara?.nome || 'Câmara dos Deputados',
            status: e.situacao,
            type: e.descricaoTipo || 'Sessão',
            sourceUrl: e.urlRegistro,
            agendaDocumentUrl: e.urlDocumentoPauta,
            organs: (e.orgaos || []).map((orgao: any) => orgao.sigla || orgao.nomeResumido || orgao.nome).filter(Boolean)
        })) : [];

        // Apenas métricas diretamente calculadas de dados oficiais.
        const updatedStats = {
            ...pol.stats,
            spending: totalSpending,
            partyFidelity: undefined
        };

        // Processamento de Frentes e Ocupações
        const fronts = frentesData && frentesData.dados ? frentesData.dados.map((f: any) => ({
            id: f.id,
            title: f.titulo,
            externalLink: f.uri
        })) : [];

        const occupations = ocupacoesData && ocupacoesData.dados ? ocupacoesData.dados.map((o: any) => ({ 
            title: o.titulo, 
            entity: o.entidade, 
            state: o.entidadeUF,
            country: o.entidadePais,
            startYear: o.anoInicio, 
            endYear: o.anoFim 
        })).filter((o: any) => o.title || o.entity) : [];

        // Definir profissão principal baseada no histórico ou padrão
        let profession = pol.profession;
        if (occupations.length > 0) {
            // Tenta pegar a mais recente que não seja "Deputado"
            const relevant = occupations.filter((o: any) => {
                const title = String(o?.title || '').toLowerCase();
                return title && !title.includes('deputado') && !title.includes('vereador');
            });
            if (relevant.length > 0) {
                profession = relevant[0].title;
            }
        }

        // Processamento de Discursos
        const speeches: Speech[] = discursosData && discursosData.dados ? discursosData.dados.map((s: any) => ({
            date: s.dataHoraInicio,
            summary: s.sumario || (s.transcricao ? s.transcricao.substring(0, 150) + "..." : "Discurso em Plenário"),
            transcription: s.transcricao,
            type: s.tipoDiscurso,
            phase: s.faseEvento ? s.faseEvento.descricao : 'Plenário',
            keywords: s.keywords ? s.keywords.split(',').map((k: string) => k.trim()) : [],
            urlAudio: s.urlAudio, 
            urlVideo: s.urlVideo, 
            externalLink: s.urlTexto 
        })) : [];

        const result = {
            ...pol,
            profession: formatText(profession || "Político"),
            stats: updatedStats,
            expensesBreakdown: expenses.slice(0, 5), 
            detailedExpenses: detailedExpenses, 
            fronts: fronts, 
            occupations: occupations, 
            speeches: speeches,
            agenda: agenda
        };

        if (staleLocalProfile && getProfileDataScore(result) < getProfileDataScore(staleLocalProfile)) {
            localStorage.setItem(fullCacheKey, JSON.stringify({ data: staleLocalProfile, timestamp: Date.now() }));
            return staleLocalProfile;
        }

        saveCachedPolitician(pol.id, {
            id: pol.id,
            stats: updatedStats,
            expensesBreakdown: expenses.slice(0, 6),
            detailedExpenses: detailedExpenses.slice(0, 200),
            fronts: fronts.slice(0, 50),
            occupations: occupations.slice(0, 50),
            speeches: speeches.slice(0, 25),
            agenda: agenda.slice(0, 10)
        });

        localStorage.setItem(fullCacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
        return result;

    } catch (e) {
        console.error("Enrich error", e);
        return staleLocalProfile || pol;
    }
};

export const prefetchPoliticianProfile = async (pol: Politician) => {
    if (!pol?.id || prefetchInFlight.has(pol.id)) return;
    if (pol.hasApiIntegration === false) return;

    const marks = readPrefetchMarks();
    const lastPrefetch = marks[String(pol.id)] || 0;
    if (Date.now() - lastPrefetch < TTL_STATIC) return;

    prefetchInFlight.add(pol.id);

    try {
        const cacheKey = `pol_full_v2_${pol.id}`;
        const cached = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
        if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < PROFILE_DETAIL_FRESH_TTL) {
                marks[String(pol.id)] = Date.now();
                writePrefetchMarks(marks);
                return;
            }
        }

        const cachedGithub = await fetchCachedPolitician(pol.id);
        if (hasProfileCacheData(cachedGithub)) {
            marks[String(pol.id)] = Date.now();
            writePrefetchMarks(marks);
            return;
        }

        const fast = await enrichPoliticianFast(pol);
        await enrichPoliticianData(fast);
        marks[String(pol.id)] = Date.now();
        writePrefetchMarks(marks);
    } catch {
        // ignore prefetch errors
    } finally {
        prefetchInFlight.delete(pol.id);
    }
};

// --- NEW FUNCTION: DETALHES DE PROPOSIÇÃO (ON DEMAND) ---
export const fetchProposicaoDetails = async (id: number): Promise<{
    authors: string[];
    fullTextUrl?: string;
    progress: number;
    label: string;
    detailedSummary?: string;
    justification?: string;
    keywords?: string[];
    statusDescription?: string;
    dispatch?: string;
    responsibleBody?: string;
    finalUrn?: string;
    relatedPropositions?: string[];
}> => {
    try {
        const cacheKey = `prop_details_${id}`;
        return (await fetchWithCache(cacheKey, async () => {
            const [mainData, authorsData] = await Promise.all([
                fetchAPI(`${BASE_URL_CAMARA}/proposicoes/${id}`),
                fetchAPI(`${BASE_URL_CAMARA}/proposicoes/${id}/autores`)
            ]);

            const d = mainData.dados;
            const { progress, label } = calculateProgress(d.statusProposicao?.descricaoSituacao || '');
            
            const authors = authorsData.dados ? authorsData.dados.map((a: any) => a.nome) : [];
            const fullTextUrl = d.urlInteiroTeor || null;
            const relatedPropositions = [d.uriPropPrincipal, d.uriPropAnterior, d.uriPropPosterior]
                .filter(Boolean)
                .map((uri: string) => uri.split('/').pop())
                .filter((value: string | undefined): value is string => Boolean(value));

            return {
                authors,
                fullTextUrl,
                progress,
                label,
                detailedSummary: d.ementaDetalhada,
                justification: d.justificativa,
                keywords: String(d.keywords || '').split(',').map((keyword: string) => keyword.trim()).filter(Boolean),
                statusDescription: d.statusProposicao?.descricaoSituacao,
                dispatch: d.statusProposicao?.despacho,
                responsibleBody: d.statusProposicao?.siglaOrgao,
                finalUrn: d.urnFinal,
                relatedPropositions
            };
        }, TTL_STATIC)) || { authors: [], progress: 0, label: 'Desconhecido' };
    } catch (e) {
        console.warn("Error fetching proposicao details", e);
        return { authors: [], progress: 0, label: 'Erro' };
    }
};

// --- NOVO: DETALHES DE EVENTO (CONVIDADOS) ---
export const fetchEventDetails = async (id: number): Promise<{
    guests: string[];
    participants: string[];
    requests: string[];
    phases: string[];
    organs: string[];
    agendaDocumentUrl?: string;
    eventUrl?: string;
}> => {
    try {
        const cacheKey = `event_details_${id}`;
        return (await fetchWithCache(cacheKey, async () => {
            const eventData = await fetchAPI(`${BASE_URL_CAMARA}/eventos/${id}`);
            let guests: string[] = [];
            let participants: string[] = [];
            
            if (eventData && eventData.dados) {
                const event = eventData.dados;
                const desc = event.descricao || "";
                if (desc) {
                    const parts = desc.split(/Convidados?:|Palestrantes?:/i);
                    if (parts.length > 1) {
                        guests = parts[1].split(/,|;| e /).map((s: string) => s.trim()).filter((s: string) => s.length > 3 && s.length < 50);
                    }
                }
                const [guestData, participantData] = await Promise.all([
                    event.uriConvidados ? fetchAPI(event.uriConvidados).catch(() => null) : null,
                    event.uriDeputados ? fetchAPI(event.uriDeputados).catch(() => null) : null
                ]);
                const officialGuests = guestData?.dados?.map((guest: any) =>
                    guest.nome || guest.nomeConvidado || guest.nomeCivil || guest.titulo
                ).filter(Boolean) || [];
                participants = participantData?.dados?.map((participant: any) =>
                    participant.nome || participant.nomeEleitoral || participant.nomeCivil
                ).filter(Boolean) || [];
                guests = [...officialGuests, ...guests];

                return {
                    guests: [...new Set(guests)].slice(0, 50),
                    participants: [...new Set(participants)].slice(0, 100),
                    requests: (event.requerimentos || []).map((request: any) =>
                        request.titulo || request.ementa || request.descricao || request.uri
                    ).filter(Boolean),
                    phases: (event.fases || []).map((phase: any) =>
                        phase.titulo || phase.descricao || phase.situacao
                    ).filter(Boolean),
                    organs: (event.orgaos || []).map((organ: any) =>
                        organ.sigla || organ.nomeResumido || organ.nome
                    ).filter(Boolean),
                    agendaDocumentUrl: event.urlDocumentoPauta,
                    eventUrl: event.urlRegistro
                };
            }

            return { guests: [], participants: [], requests: [], phases: [], organs: [] };
        }, TTL_STATIC)) || { guests: [], participants: [], requests: [], phases: [], organs: [] };
    } catch (e) {
        console.warn("Error fetching event details", e);
        return { guests: [], participants: [], requests: [], phases: [], organs: [] };
    }
};

// --- GLOBAL FEED ---

export const fetchGlobalVotacoes = async (): Promise<FeedItem[]> => {
    const result = await fetchWithCache('global_feed_hybrid_v2', async () => {
        const dateVotes = new Date();
        dateVotes.setDate(dateVotes.getDate() - 30);
        const dateStrVotes = dateVotes.toISOString().split('T')[0];

        const votesData = await fetchAPI(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&dataInicio=${dateStrVotes}&itens=10`, 2, true);
        
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 7); 
        const dateStr = dateLimit.toISOString().split('T')[0];
        
        const propsData = await fetchAPI(`${BASE_URL_CAMARA}/proposicoes?ordem=DESC&ordenarPor=id&dataApresentacaoInicio=${dateStr}&itens=10`, 2, true);

        const eventsData = await fetchAPI(`${BASE_URL_CAMARA}/eventos?ordem=DESC&ordenarPor=dataHoraInicio&dataInicio=${dateStr}&itens=10`, 2, true);

        let feed: FeedItem[] = [];

        if (votesData && votesData.dados) {
            feed = votesData.dados.map((v: any) => {
                let sourceUrl = `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(v.descricao)}`;
                let propId;
                
                if (v.uriProposicaoObjeto) {
                    propId = v.uriProposicaoObjeto.split('/').pop();
                    if (propId) sourceUrl = `https://www.camara.leg.br/propostas-legislativas/${propId}`;
                }
                
                return {
                    id: parseInt(v.id) || Date.now() + Math.random(),
                    type: 'voto',
                    title: v.siglaOrgao + ' ' + (v.uri ? v.uri.split('/').pop() : ''),
                    date: new Date(v.dataHoraRegistro).toLocaleDateString('pt-BR'),
                    description: formatText(v.descricao),
                    status: 'Concluído',
                    sourceUrl: sourceUrl,
                    category: detectCategory(v.descricao + ' ' + v.siglaOrgao),
                    candidateId: propId ? parseInt(propId) : undefined,
                    approval: v.aprovacao,
                    eventUrl: v.uriEvento
                };
            });
        }

        if (propsData && propsData.dados) {
            const propsFeed = propsData.dados.map((p: any) => ({
                id: p.id,
                type: 'voto', 
                title: `${p.siglaTipo} ${p.numero}/${p.ano}`,
                date: new Date(p.dataApresentacao || Date.now()).toLocaleDateString('pt-BR'),
                description: formatText(p.ementa),
                status: 'Apresentado',
                sourceUrl: `https://www.camara.leg.br/propostas-legislativas/${p.id}`,
                category: detectCategory(p.ementa),
                fullTextUrl: p.urlInteiroTeor
            }));
            feed = [...feed, ...propsFeed];
        }

        if (eventsData && eventsData.dados) {
            const eventsFeed = eventsData.dados.map((e: any) => ({
                id: e.id,
                type: 'evento',
                title: e.descricaoTipo || 'Evento Legislativo',
                date: new Date(e.dataHoraInicio).toLocaleDateString('pt-BR'),
                description: formatText(e.descricao || e.localCamara?.nome || 'Audiência Pública'),
                status: e.situacao || 'Realizado',
                sourceUrl: `https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/${e.id}`,
                category: detectCategory(e.descricao || ''),
                eventUrl: e.urlRegistro,
                agendaDocumentUrl: e.urlDocumentoPauta,
                eventOrgans: (e.orgaos || []).map((organ: any) => organ.sigla || organ.nomeResumido || organ.nome).filter(Boolean),
            }));
            feed = [...feed, ...eventsFeed];
        }

        return feed.sort((a, b) => {
            const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')).getTime() : 0;
            const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')).getTime() : 0;
            return dateB - dateA || (b.id - a.id);
        }).slice(0, 30); 

    }, TTL_DYNAMIC);
    return result || [];
};
