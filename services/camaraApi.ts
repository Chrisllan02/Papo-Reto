
import { Politician, FeedItem, Party, ExpenseCategory, Speech, ExpenseItem, LegislativeEvent } from '../types';
import { PARTY_METADATA } from '../constants';
import { detectCategory } from '../utils/legislativeTranslator';
import { timeoutSignal } from '../utils/timeoutSignal';
import { getConfiguredApiOrigin, getLegislativeApiUrl } from '../utils/legislativeApiProxy';
import { cleanText, formatPersonName } from '../domain/legislative/text';
import { safeGetItem, safeSetItem, safeSetItemWithEviction, purgeStaleKeys } from './storage';

export const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
export const CACHE_PREFIX = 'paporeto_cache_v8_official_';
const PREFETCH_MARK_KEY = 'paporeto_prefetched_profiles_v1';

purgeStaleKeys(/^paporeto_cache_v\d+_/, key => key.startsWith(CACHE_PREFIX));
purgeStaleKeys(/^paporeto_prefetched_profiles_v\d+$/, key => key === PREFETCH_MARK_KEY);

export const getFullProfileCacheKey = (id: number) => `${CACHE_PREFIX}pol_full_v2_${id}`;
export const TTL_DYNAMIC = 1000 * 60 * 15; // 15 minutos
export const PROFILE_DETAIL_FRESH_TTL = 1000 * 60 * 60 * 24; // 24 horas
export const PROFILE_DETAIL_STALE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 dias
const TTL_STATIC = 1000 * 60 * 60 * 24; // 24 horas
const STALE_FALLBACK_TTL = 1000 * 60 * 60 * 24 * 7; // 7 dias
const inFlightCacheRequests = new Map<string, Promise<any>>();

// --- CACHE UTILS ---
export const fetchWithCache = async <T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T | null> => {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    let stale: T | null = null;
    try {
        const cached = safeGetItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            if (age < ttl) {
                return data;
            }
            if (age < STALE_FALLBACK_TTL) stale = data;
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
        if (!safeSetItemWithEviction(cacheKey, JSON.stringify({ data, timestamp: Date.now() }), CACHE_PREFIX)) {
            console.warn('Cache write error (quota?)', key);
        }
        return data;
    } catch (e) {
        console.error(`Fetch error for ${key}`, e);
        return stale;
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

const PROFILE_CACHE_MEMO_TTL = 1000 * 30;
const profileCacheMemo = new Map<number, { promise: Promise<Partial<Politician> | null>; at: number }>();

const requestCachedPolitician = async (id: number): Promise<Partial<Politician> | null> => {
    const endpoint = getProfileCacheEndpoint();
    try {
        const res = await fetch(`${endpoint}?type=politician&id=${id}`, { signal: timeoutSignal(10000) });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

// Abrir um perfil consulta /api/profile-cache em três etapas; a janela curta evita repetir o GET.
const fetchCachedPolitician = (id: number): Promise<Partial<Politician> | null> => {
    const memo = profileCacheMemo.get(id);
    if (memo && Date.now() - memo.at < PROFILE_CACHE_MEMO_TTL) return memo.promise;

    const promise = requestCachedPolitician(id);
    profileCacheMemo.set(id, { promise, at: Date.now() });
    promise.then(result => {
        if (!result && profileCacheMemo.get(id)?.promise === promise) profileCacheMemo.delete(id);
    });
    return promise;
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

const parseTimestamp = (value: unknown): number | undefined => {
    const parsed = typeof value === 'number' ? value : Date.parse(String(value ?? ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const saveCachedPolitician = async (id: number, _data: Partial<Politician>) => {
    const endpoint = getProfileCacheEndpoint();
    profileCacheMemo.delete(id);
    try {
        await fetch(`${endpoint}?type=politician&id=${id}`, {
            method: 'POST'
        });
    } catch {
        // Silently ignore server-side cache refresh errors.
    }
};

const prefetchInFlight = new Set<number>();

const readPrefetchMarks = (): Record<string, number> => {
    try {
        const raw = safeGetItem(PREFETCH_MARK_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writePrefetchMarks = (marks: Record<string, number>) => {
    safeSetItem(PREFETCH_MARK_KEY, JSON.stringify(marks));
};

const RATE_LIMIT_COOLDOWN_MS = 60_000;
let rateLimitedUntil = 0;
export const isApiRateLimited = () => Date.now() < rateLimitedUntil;

export const fetchAPI = async (url: string, retries = 3, json = true, delay = 1000, timeoutMs = 15000, accept = 'application/json'): Promise<any> => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const res = await fetch(getLegislativeApiUrl(url), {
            headers: { 'Accept': accept },
            signal: controller?.signal
        });
        if (!res.ok) {
            const error = new Error(`API Error ${res.status}`) as Error & { status?: number; retryable?: boolean };
            error.status = res.status;
            error.retryable = res.status >= 500;
            if (res.status === 429) rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
            throw error;
        }
        return json ? await res.json() : res;
    } catch (error: any) {
        const retryable = error?.retryable !== false;
        if (retries > 0 && retryable) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchAPI(url, retries - 1, json, delay * 2, timeoutMs, accept);
        }
        throw error;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

export { cleanText, formatPersonName };

export const normalizeSex = (value?: string | null): 'F' | 'M' | undefined => {
    if (!value) return undefined;
    const cleaned = value.trim().toUpperCase();
    if (cleaned.startsWith('F')) return 'F';
    if (cleaned.startsWith('M')) return 'M';
    return undefined;
};

export const deputyRole = (sex?: 'F' | 'M') =>
    sex === 'F' ? 'Deputada Federal' : sex === 'M' ? 'Deputado Federal' : 'Deputado(a) Federal';

// --- HELPERS ---

export const getIdeology = (partySigla?: string): 'Esquerda' | 'Centro' | 'Direita' | undefined => {
    const sigla = partySigla ? partySigla.trim().toUpperCase() : '';
    return PARTY_METADATA[sigla]?.ideology;
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

// --- HELPER: DATAS (FUSO DE BRASÍLIA) ---
const BRAZIL_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

export const getBrazilDateString = (daysAgo = 0, now: Date = new Date()): string =>
    BRAZIL_DATE_FORMAT.format(new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000));

export const formatBrazilianDate = (value?: string | null, options?: { withYear?: boolean }): string | undefined => {
    if (!value) return undefined;
    const withYear = options?.withYear !== false;
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return withYear ? `${iso[3]}/${iso[2]}/${iso[1]}` : `${iso[3]}/${iso[2]}`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString('pt-BR', withYear ? undefined : { day: '2-digit', month: '2-digit' });
};

// Id numérico estável e negativo para votações (ids como "2367475-47" colidiam com ids de proposições).
const stableNegativeId = (value: string): number => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
    }
    return -(hash + 1);
};

// --- HELPER: TRAMITÔMETRO (STATUS CALCULATOR) ---
const CLOSED_SITUATIONS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bretirad/, label: 'Retirada pelo autor' },
    { pattern: /\brejeitad/, label: 'Rejeitada' },
    { pattern: /\bprejudicad/, label: 'Prejudicada' },
    { pattern: /\barquivad/, label: 'Arquivada' },
    { pattern: /\bperdeu a eficacia\b/, label: 'Perdeu a eficácia' },
];

export const calculateProgress = (statusDescription: string): { progress: number, label: string, closed?: boolean } => {
    const s = (statusDescription || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (!s.trim()) return { progress: 0, label: 'Situação não informada' };

    const closed = CLOSED_SITUATIONS.find(({ pattern }) => pattern.test(s));
    if (closed) return { progress: 0, label: closed.label, closed: true };
    if (/\btransformad\w* em (norma juridica|lei)|\btransformad\w* na lei/.test(s)) return { progress: 100, label: 'Transformado em Norma Jurídica' };
    if (/\bsancao\b|\bveto\b|\bvetad/.test(s)) return { progress: 90, label: 'Sanção/Veto' };
    if (/\bsenado\b/.test(s)) return { progress: 80, label: 'Senado Federal' };
    if (/\bplenario\b|\bordem do dia\b/.test(s)) return { progress: 60, label: 'Plenário' };
    if (/\bcomiss(ao|oes)\b|\bccjc\b|\brelator|\bparecer\b/.test(s)) return { progress: 30, label: 'Comissões' };
    if (/\bapresentacao\b|\bprotocolo\b/.test(s)) return { progress: 10, label: 'Apresentação' };

    return { progress: 20, label: 'Tramitando' };
};

// --- CORE FETCHERS ---

export const fetchDeputados = async (): Promise<Politician[]> => {
    const result = await fetchWithCache('deputados_list', async () => {
        const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados?ordem=ASC&ordenarPor=nome`);
        
        if (!data || !Array.isArray(data.dados) || data.dados.length === 0) {
            throw new Error("Invalid data format from API");
        }

        return data.dados.map((d: any) => ({
            id: d.id,
            name: formatPersonName(d.nome),
            party: d.siglaPartido,
            state: d.siglaUf,
            photo: d.urlFoto,
            role: deputyRole(normalizeSex(d.sexo)),
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
            mandate: { start: '', end: '' },
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
            return parlamentares.flatMap((parlamentar): Politician[] => {
                const getText = (tag: string) => {
                    const el = parlamentar.getElementsByTagName(tag)[0];
                    return el?.textContent?.trim() || '';
                };

                const id = Number(getText('CodigoParlamentar') || getText('IdParlamentar'));
                if (!Number.isFinite(id) || id <= 0) return [];
                const name = getText('NomeParlamentar') || getText('NomeCompletoParlamentar');
                const party = getText('SiglaPartidoParlamentar');
                const state = getText('SiglaUfParlamentar') || getText('UfParlamentar');
                const photo = getText('UrlFotoParlamentar');
                const sex = normalizeSex(getText('SexoParlamentar'));
                const childText = (parent: Element | undefined, tag: string) =>
                    parent?.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
                const legislatures = ['PrimeiraLegislaturaDoMandato', 'SegundaLegislaturaDoMandato']
                    .map(tag => parlamentar.getElementsByTagName(tag)[0])
                    .filter(Boolean);
                const mandateStarts = legislatures.map(el => childText(el, 'DataInicio')).filter(Boolean).sort();
                const mandateEnds = legislatures.map(el => childText(el, 'DataFim')).filter(Boolean).sort();
                const currentExercise = Array.from(parlamentar.getElementsByTagName('Exercicio'))
                    .sort((a, b) => childText(b, 'DataInicio').localeCompare(childText(a, 'DataInicio')))[0];
                const suplentes = Array.from(parlamentar.getElementsByTagName('Suplente'))
                    .map(suplente => {
                        const participation = suplente.getElementsByTagName('DescricaoParticipacao')[0]?.textContent?.trim();
                        const suplenteName = suplente.getElementsByTagName('NomeParlamentar')[0]?.textContent?.trim();
                        return [participation, suplenteName].filter(Boolean).join(' - ');
                    })
                    .filter(Boolean);

                const senator = {
                    id,
                    name: formatPersonName(name),
                    party,
                    partyShort: party,
                    state,
                    photo,
                    role: sex === 'F' ? 'Senadora' : 'Senador',
                    sex,
                    civilName: formatPersonName(getText('NomeCompletoParlamentar')),
                    email: getText('EmailParlamentar'),
                    cabinet: { phone: getText('NumeroTelefone') },
                    officialPage: getText('UrlPaginaParlamentar'),
                    website: getText('UrlPaginaParticular'),
                    parliamentaryBlock: getText('NomeBloco'),
                    isBoardMember: getText('MembroMesa').toLowerCase() === 'sim',
                    isLeader: getText('MembroLideranca').toLowerCase() === 'sim',
                    participation: getText('DescricaoParticipacao'),
                    exerciseStart: childText(currentExercise, 'DataInicio'),
                    exerciseEnd: childText(currentExercise, 'DataFim'),
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
                    mandate: { start: mandateStarts[0] || '', end: mandateEnds.at(-1) || '' },
                    hasApiIntegration: false,
                    votes: {}
                } as Politician;
                return senator.name && senator.party && senator.state ? [senator] : [];
            });
        } catch {
            return [];
        }
    };

    const result = await fetchWithCache('senadores_list', async () => {
        const res = await fetchAPI(SENADO_URL, 2, false, 1000, 15000, 'text/xml');
        const xmlText = await (res as Response).text();
        const senators = parseXmlText(xmlText);
        if (senators.length === 0) throw new Error('Lista de senadores vazia');
        return senators;
    }, TTL_STATIC);

    return result || [];
};

export const fetchPartidos = async (): Promise<Party[]> => {
    const result = await fetchWithCache('partidos_list', async () => {
        const data = await fetchAPI(`${BASE_URL_CAMARA}/partidos?ordem=ASC&ordenarPor=sigla&itens=100`);
        if (!data || !Array.isArray(data.dados) || data.dados.length === 0) {
            throw new Error("Lista de partidos vazia");
        }

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
    // Em erro o fetcher lança: fetchWithCache não grava o perfil não enriquecido e devolvemos `pol`.
    return (await fetchWithCache(cacheKey, async () => {
        const cached = await fetchCachedPolitician(pol.id);
        if (cached && (cached.civilName || cached.birthDate || cached.cabinet || cached.socials)) {
            return { ...pol, ...cached } as Politician;
        }

        const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${pol.id}`);
        const d = data.dados;

        const apiSex = normalizeSex(d.sexo);

        const enriched = {
            ...pol,
            role: apiSex ? deputyRole(apiSex) : pol.role,
            sex: apiSex || pol.sex,
            civilName: formatPersonName(d.nomeCivil),
            birthDate: d.dataNascimento, // YYYY-MM-DD
            birthCity: d.municipioNascimento,
            birthState: d.ufNascimento,
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
    }, TTL_STATIC)) || pol;
};

// Transcrição integral de discursos é grande demais para o localStorage: fica só em memória.
const persistFullProfile = (key: string, profile: Politician, timestamp = Date.now()) => {
    const slim = {
        ...profile,
        speeches: profile.speeches?.map(({ transcription: _transcription, ...speech }) => speech)
    };
    if (!safeSetItemWithEviction(key, JSON.stringify({ data: slim, timestamp }), CACHE_PREFIX)) {
        console.warn('Não foi possível gravar o perfil no cache local (cota?).');
    }
};

const MAX_EXPENSE_PAGES = 20;

type SubFetch<T> = { ok: true; data: T } | { ok: false };

const fetchAllPages = async (firstUrl: string): Promise<{ items: any[]; complete: boolean }> => {
    const items: any[] = [];
    let url: string | undefined = firstUrl;
    for (let page = 0; url && page < MAX_EXPENSE_PAGES; page++) {
        const data = await fetchAPI(url);
        if (Array.isArray(data?.dados)) items.push(...data.dados);
        url = data?.links?.find((link: any) => link?.rel === 'next')?.href;
    }
    return { items, complete: !url };
};

const summarizeExpenses = (rows: any[]) => {
    let totalSpending = 0;
    const typeMap: Record<string, number> = {};
    rows.forEach((e: any) => {
        const val = Number(e.valorLiquido ?? e.valorDocumento ?? 0);
        if (!Number.isFinite(val)) return;
        totalSpending += val;
        const type = e.tipoDespesa || 'Outros';
        typeMap[type] = (typeMap[type] || 0) + val;
    });

    const positiveTotal = Object.values(typeMap).reduce((sum, value) => sum + Math.max(value, 0), 0);
    const expenses: ExpenseCategory[] = Object.entries(typeMap)
        .map(([type, value]) => ({ type, value, percent: positiveTotal > 0 ? (Math.max(value, 0) / positiveTotal) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);

    const detailedExpenses: ExpenseItem[] = rows.map((e: any, idx: number) => {
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
    }).filter((item: ExpenseItem) => Number.isFinite(item.value));

    return { totalSpending, expenses, detailedExpenses };
};

export const enrichPoliticianData = async (pol: Politician, onProgress?: (status: string) => void): Promise<Politician> => {
    const fullCacheKey = getFullProfileCacheKey(pol.id);
    let staleLocalProfile: Politician | null = null;
    let staleLocalTimestamp = 0;
    
    // Tenta cache local primeiro. Perfil parlamentar é dado lento: se já temos um dado bom,
    // ele continua sendo exibido mesmo quando a API pública oscila.
    try {
        const cached = safeGetItem(fullCacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - Number(timestamp || 0);
            if (data && age < PROFILE_DETAIL_STALE_TTL) {
                staleLocalProfile = data;
                staleLocalTimestamp = Number(timestamp);
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
                const serverTimestamp = parseTimestamp((cachedGithub as { updatedAt?: unknown }).updatedAt) ?? Date.now();
                persistFullProfile(fullCacheKey, merged, staleLocalProfile ? Math.min(staleLocalTimestamp, serverTimestamp) : serverTimestamp);
                return merged;
            }
        }
    } catch {
        // ignore github cache read errors
    }

    try {
        if (onProgress) onProgress("Buscando dados completos...");
        
        // Falha de rede/servidor vira { ok: false }: o campo não é sobrescrito nem gravado como vazio.
        const safeFetch = async <T>(fetcher: () => Promise<T>): Promise<SubFetch<T | null>> => {
            try {
                return { ok: true, data: await fetcher() };
            } catch (e: any) {
                if ([400, 404, 405].includes(Number(e?.status))) {
                    return { ok: true, data: null };
                }
                console.warn('Erro em endpoint secundário do perfil', e);
                return { ok: false };
            }
        };

        const today = getBrazilDateString();

        const [expensesResult, frentesResult, ocupacoesResult, discursosResult, agendaResult] = await Promise.all([
            safeFetch(() => fetchAllPages(`${BASE_URL_CAMARA}/deputados/${pol.id}/despesas?ordem=DESC&ordenarPor=mes&itens=100`)),
            safeFetch(() => fetchAPI(`${BASE_URL_CAMARA}/deputados/${pol.id}/frentes`)),
            safeFetch(() => fetchAPI(`${BASE_URL_CAMARA}/deputados/${pol.id}/ocupacoes`)),
            safeFetch(() => fetchAPI(`${BASE_URL_CAMARA}/deputados/${pol.id}/discursos?ordem=DESC&ordenarPor=dataHoraInicio&itens=20`)),
            safeFetch(() => fetchAPI(`${BASE_URL_CAMARA}/eventos?ordem=ASC&ordenarPor=dataHoraInicio&dataInicio=${today}&deputadoId=${pol.id}&itens=5`))
        ]);

        const base = staleLocalProfile || pol;
        const rowsOf = (result: SubFetch<any>) => result.ok && Array.isArray(result.data?.dados) ? result.data.dados : [];
        // Total parcial (teto de páginas) não é apresentado como total do período.
        const expensesComplete = expensesResult.ok && (!expensesResult.data || expensesResult.data.complete);
        const complete = expensesComplete && frentesResult.ok && ocupacoesResult.ok && discursosResult.ok && agendaResult.ok;

        const { totalSpending, expenses, detailedExpenses } = summarizeExpenses(expensesComplete && expensesResult.data ? expensesResult.data.items : []);

        const agenda: LegislativeEvent[] = rowsOf(agendaResult).map((e: any) => ({
            id: e.id,
            startTime: e.dataHoraInicio,
            endTime: e.dataHoraFim,
            title: e.descricaoTipo,
            description: e.descricao || e.situacao,
            location: e.localCamara?.nome,
            status: e.situacao,
            type: e.descricaoTipo,
            sourceUrl: e.urlRegistro,
            agendaDocumentUrl: e.urlDocumentoPauta,
            organs: (e.orgaos || []).map((orgao: any) => orgao.sigla || orgao.nomeResumido || orgao.nome).filter(Boolean)
        }));

        const fronts = rowsOf(frentesResult).map((f: any) => ({
            id: f.id,
            title: f.titulo,
            externalLink: f.uri
        }));

        const occupations = rowsOf(ocupacoesResult).map((o: any) => ({ 
            title: o.titulo, 
            entity: o.entidade, 
            state: o.entidadeUF,
            country: o.entidadePais,
            startYear: o.anoInicio, 
            endYear: o.anoFim 
        })).filter((o: any) => o.title || o.entity);

        let profession = base.profession;
        if (ocupacoesResult.ok) {
            const relevant = occupations.filter((o: any) => {
                const title = String(o?.title || '').toLowerCase();
                return title && !title.includes('deputado') && !title.includes('vereador');
            });
            if (relevant.length > 0) profession = cleanText(relevant[0].title) || undefined;
        }

        const speeches: Speech[] = rowsOf(discursosResult).map((s: any) => ({
            date: s.dataHoraInicio,
            summary: s.sumario || (s.transcricao ? s.transcricao.substring(0, 150) + "..." : undefined),
            transcription: s.transcricao,
            type: s.tipoDiscurso,
            phase: s.faseEvento?.descricao,
            keywords: s.keywords ? s.keywords.split(',').map((k: string) => k.trim()) : [],
            urlAudio: s.urlAudio, 
            urlVideo: s.urlVideo, 
            externalLink: s.urlTexto 
        }));

        // Apenas métricas diretamente calculadas de dados oficiais.
        const updatedStats = expensesComplete
            ? { ...base.stats, spending: totalSpending, partyFidelity: undefined }
            : base.stats;

        const result: Politician = {
            ...base,
            ...pol,
            profession,
            stats: updatedStats,
            expensesBreakdown: expensesComplete ? expenses.slice(0, 5) : base.expensesBreakdown,
            detailedExpenses: expensesComplete ? detailedExpenses : base.detailedExpenses,
            fronts: frentesResult.ok ? fronts : base.fronts,
            occupations: ocupacoesResult.ok ? occupations : base.occupations,
            speeches: discursosResult.ok ? speeches : base.speeches,
            agenda: agendaResult.ok ? agenda : base.agenda
        };

        if (staleLocalProfile && getProfileDataScore(result) < getProfileDataScore(staleLocalProfile)) {
            return staleLocalProfile;
        }

        if (!complete) return result;

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

        persistFullProfile(fullCacheKey, result);
        return result;

    } catch (e) {
        console.error("Enrich error", e);
        return staleLocalProfile || pol;
    }
};

export const prefetchPoliticianProfile = async (pol: Politician) => {
    if (!pol?.id || prefetchInFlight.has(pol.id)) return;
    if (pol.hasApiIntegration === false || isApiRateLimited()) return;

    const marks = readPrefetchMarks();
    const lastPrefetch = marks[String(pol.id)] || 0;
    if (Date.now() - lastPrefetch < TTL_STATIC) return;

    prefetchInFlight.add(pol.id);

    try {
        const cached = safeGetItem(getFullProfileCacheKey(pol.id));
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
        const full = await enrichPoliticianData(fast);
        if (getProfileDataScore(full) > getProfileDataScore(fast)) {
            marks[String(pol.id)] = Date.now();
            writePrefetchMarks(marks);
        }
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
    closed?: boolean;
    detailedSummary?: string;
    justification?: string;
    keywords?: string[];
    statusDescription?: string;
    dispatch?: string;
    responsibleBody?: string;
    finalUrn?: string;
    relatedPropositions?: string[];
}> => {
    const details = await fetchWithCache(`prop_details_${id}`, async () => {
        const [mainData, authorsData] = await Promise.all([
            fetchAPI(`${BASE_URL_CAMARA}/proposicoes/${id}`),
            fetchAPI(`${BASE_URL_CAMARA}/proposicoes/${id}/autores`)
        ]);

        const d = mainData.dados;
        const { progress, label, closed } = calculateProgress(d.statusProposicao?.descricaoSituacao || '');
        
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
            closed,
            detailedSummary: d.ementaDetalhada,
            justification: d.justificativa,
            keywords: String(d.keywords || '').split(',').map((keyword: string) => keyword.trim()).filter(Boolean),
            statusDescription: d.statusProposicao?.descricaoSituacao,
            dispatch: d.statusProposicao?.despacho,
            responsibleBody: d.statusProposicao?.siglaOrgao,
            finalUrn: d.urnFinal,
            relatedPropositions
        };
    }, TTL_DYNAMIC);
    if (!details) throw new Error('Detalhes da proposição indisponíveis');
    return details;
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
    const details = await fetchWithCache(`event_details_${id}`, async () => {
        const eventData = await fetchAPI(`${BASE_URL_CAMARA}/eventos/${id}`);
        const event = eventData?.dados;
        if (!event) throw new Error('Evento sem dados');

        const optional = (uri?: string) => uri
            ? fetchAPI(uri).catch((e: any) => {
                if (Number(e?.status) === 404) return null;
                throw e;
            })
            : null;
        const [guestData, participantData] = await Promise.all([
            optional(event.uriConvidados),
            optional(event.uriDeputados)
        ]);
        const guests = guestData?.dados?.map((guest: any) =>
            guest.nome || guest.nomeConvidado || guest.nomeCivil || guest.titulo
        ).filter(Boolean) || [];
        const participants = participantData?.dados?.map((participant: any) =>
            participant.nome || participant.nomeEleitoral || participant.nomeCivil
        ).filter(Boolean) || [];

        return {
            guests: [...new Set<string>(guests)].slice(0, 50),
            participants: [...new Set<string>(participants)].slice(0, 100),
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
    }, TTL_STATIC);
    if (!details) throw new Error('Detalhes do evento indisponíveis');
    return details;
};

// --- GLOBAL FEED ---

export const fetchGlobalVotacoes = async (): Promise<FeedItem[]> => {
    const result = await fetchWithCache('global_feed_hybrid_v2', async () => {
        const dateStrVotes = getBrazilDateString(30);
        const dateStr = getBrazilDateString(7);

        const [votesResult, propsResult, eventsResult] = await Promise.allSettled([
            fetchAPI(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&dataInicio=${dateStrVotes}&itens=10`, 2, true),
            fetchAPI(`${BASE_URL_CAMARA}/proposicoes?ordem=DESC&ordenarPor=id&dataApresentacaoInicio=${dateStr}&itens=10`, 2, true),
            fetchAPI(`${BASE_URL_CAMARA}/eventos?ordem=DESC&ordenarPor=dataHoraInicio&dataInicio=${dateStr}&itens=10`, 2, true)
        ]);

        const votesData = votesResult.status === 'fulfilled' ? votesResult.value : null;
        const propsData = propsResult.status === 'fulfilled' ? propsResult.value : null;
        const eventsData = eventsResult.status === 'fulfilled' ? eventsResult.value : null;

        let feed: FeedItem[] = [];

        if (votesData && votesData.dados) {
            feed = votesData.dados.map((v: any) => {
                let sourceUrl = `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(v.descricao)}`;
                let propId;
                
                if (v.uriProposicaoObjeto) {
                    propId = v.uriProposicaoObjeto.split('/').pop();
                    if (propId) sourceUrl = `https://www.camara.leg.br/propostas-legislativas/${propId}`;
                }

                const status: FeedItem['status'] = v.aprovacao === 1 ? 'Aprovado' : v.aprovacao === 0 ? 'Rejeitado' : undefined;

                return {
                    id: stableNegativeId(String(v.id)),
                    type: 'voto',
                    title: v.siglaOrgao + ' ' + (v.uri ? v.uri.split('/').pop() : ''),
                    date: formatBrazilianDate(v.dataHoraRegistro),
                    description: cleanText(v.descricao),
                    status,
                    sourceUrl: sourceUrl,
                    category: detectCategory(v.descricao + ' ' + v.siglaOrgao),
                    propositionId: propId ? parseInt(propId, 10) : undefined,
                    approval: v.aprovacao,
                    eventUrl: v.uriEvento
                };
            });
        }

        if (propsData && propsData.dados) {
            const propsFeed = propsData.dados.map((p: any) => ({
                id: p.id,
                type: 'proposicao',
                title: `${p.siglaTipo} ${p.numero}/${p.ano}`,
                date: formatBrazilianDate(p.dataApresentacao),
                description: cleanText(p.ementa),
                propositionId: p.id,
                status: 'Tramitação',
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
                date: formatBrazilianDate(e.dataHoraInicio),
                description: cleanText(e.descricao || e.localCamara?.nome || e.descricaoTipo || ''),
                status: e.situacao || undefined,
                sourceUrl: `https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/${e.id}`,
                category: detectCategory(e.descricao || ''),
                eventUrl: e.urlRegistro,
                agendaDocumentUrl: e.urlDocumentoPauta,
                eventOrgans: (e.orgaos || []).map((organ: any) => organ.sigla || organ.nomeResumido || organ.nome).filter(Boolean),
            }));
            feed = [...feed, ...eventsFeed];
        }

        if (feed.length === 0) {
            throw new Error('Feed legislativo indisponível');
        }

        const dateValue = (date?: string) => date ? new Date(date.split('/').reverse().join('-')).getTime() || 0 : 0;

        return feed.sort((a, b) => dateValue(b.date) - dateValue(a.date) || (b.id - a.id)).slice(0, 30);

    }, TTL_DYNAMIC);
    return result || [];
};
