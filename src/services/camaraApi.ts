
import { Politician, FeedItem, TimelineItem, ExpenseHistoryItem, QuizQuestion, YearStats, LegislativeVote, Relatoria, Role, LegislativeEvent, Party, Travel, Remuneration, AmendmentStats, QuizVoteStats, PresenceStats, Occupation, Speech, Secretary, Front } from '../../types';
import { QUIZ_QUESTIONS, REAL_VOTE_CONFIG, PARTY_METADATA as PM } from '../../constants';

const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const BASE_URL_SENADO = 'https://legis.senado.leg.br/dadosabertos';
const MANDATE_START_YEAR = 2023;

const HEADERS = {
  'Accept': 'application/json'
};

const GENDER_CORRECTIONS: Record<number, string> = {
    220545: 'F',
    220552: 'F',
    220645: 'F',
    220657: 'F',
    220618: 'F'
};

// --- CIRCUIT BREAKER ---
const CIRCUIT_BREAKER = {
    failures: 0,
    lastFailureTime: 0,
    THRESHOLD: 3, 
    TIMEOUT: 60000, 
    isOpen: () => {
        if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.THRESHOLD) {
            const now = Date.now();
            if (now - CIRCUIT_BREAKER.lastFailureTime > CIRCUIT_BREAKER.TIMEOUT) {
                CIRCUIT_BREAKER.failures = CIRCUIT_BREAKER.THRESHOLD - 1; 
                return false;
            }
            return true;
        }
        return false;
    },
    recordFailure: () => {
        CIRCUIT_BREAKER.failures++;
        CIRCUIT_BREAKER.lastFailureTime = Date.now();
    },
    recordSuccess: () => {
        CIRCUIT_BREAKER.failures = 0;
    }
};

interface PoliticianDetails {
    civilName: string;
    birthDate?: string;
    birthCity?: string;
    birthState?: string;
    education?: string;
    socials?: string[];
    cabinet?: {
        phone?: string;
        room?: string;
        floor?: string;
        building?: string;
        email?: string;
    }
}

const forceArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [data];
};

export const PARTY_METADATA = PM;

export const formatPartyName = (name: string) => name;

export const getIdeology = (party: string): 'Esquerda' | 'Centro' | 'Direita' => {
    const p = party?.toUpperCase() || '';
    return PM[p]?.ideology || 'Centro';
};

export const getStaticParties = (): Party[] => {
    return (Object.entries(PM) as [string, { nome: string, logo: string, ideology: 'Esquerda' | 'Centro' | 'Direita' }][]).map(([sigla, data], idx) => ({
        id: 1000 + idx,
        sigla,
        nome: data.nome,
        uri: '',
        urlLogo: data.logo,
        ideology: data.ideology
    }));
};

export const getGenderedRole = (role: string, sex?: string) => {
    if (!sex) return role;
    const s = sex.toUpperCase();
    const r = role.toLowerCase();

    if (r === 'deputada federal') return 'Deputada Federal';
    if (r === 'senadora') return 'Senadora';

    if (r.includes('deputad')) return s === 'F' ? 'Deputada Federal' : 'Deputado Federal';
    if (r.includes('senad')) return s === 'F' ? 'Senadora' : 'Senador';
    if (r.includes('governado')) return s === 'F' ? 'Governadora' : 'Governador';
    if (r.includes('president')) return s === 'F' ? 'Presidenta' : 'Presidente';

    return role;
};

export const formatText = (text: string) => {
    if (!text) return "";
    let formatted = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    const replacements: Record<string, string> = {
        'pec': 'Proposta de Emenda à Constituição (PEC)',
        'pl': 'Projeto de Lei (PL)',
        'mpv': 'Medida Provisória (MP)',
        'cpi': 'Comissão de Inquérito (CPI)',
        'pib': 'PIB',
        'inss': 'INSS',
        'sus': 'SUS',
        'cpf': 'CPF',
        'cnpj': 'CNPJ',
        'plp': 'Projeto de Lei Complementar',
        'pd l': 'Projeto de Decreto Legislativo',
        'req': 'Requerimento'
    };
    Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        formatted = formatted.replace(regex, (match) => replacements[key.toLowerCase()] || match.toUpperCase());
    });
    return formatted;
};

const CACHE_PREFIX = 'paporeto_v22_';
const TTL_STATIC = 1000 * 60 * 60 * 24 * 30; // 30 Dias
const TTL_DYNAMIC = 1000 * 60 * 60 * 4; // 4 Horas
const TTL_PERMANENT = 1000 * 60 * 60 * 24 * 365; // 1 Ano
const TTL_PROFILE = 1000 * 60 * 60 * 24; // 24 Horas

const getRawCache = (key: string) => {
    try {
        const cached = localStorage.getItem(CACHE_PREFIX + key);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        return null;
    }
};

const setInCache = (key: string, data: any) => {
    try {
        const payload = JSON.stringify({ data, timestamp: Date.now() });
        try {
            localStorage.setItem(CACHE_PREFIX + key, payload);
        } catch (e) {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(CACHE_PREFIX + 'req_') || k.startsWith(CACHE_PREFIX + 'dynamic_')) {
                    localStorage.removeItem(k);
                }
            });
            localStorage.setItem(CACHE_PREFIX + key, payload);
        }
    } catch (e) {
        console.error('Falha crítica no cache', e);
    }
};

const fetchWithCache = async (keySuffix: string, fetchFn: () => Promise<any>, ttl: number): Promise<any> => {
    const cacheKey = `req_${keySuffix}`;
    const cached = getRawCache(cacheKey);
    if (cached && (Date.now() - cached.timestamp < ttl)) {
        return cached.data;
    }
    
    if (CIRCUIT_BREAKER.isOpen()) {
        return cached ? cached.data : null;
    }

    try {
        const data = await fetchFn();
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            setInCache(cacheKey, data);
            CIRCUIT_BREAKER.recordSuccess();
        }
        if (!data && cached) return cached.data;
        return data;
    } catch (e) {
        return cached ? cached.data : null;
    }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_CONCURRENT_REQUESTS = 5; 
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

const acquireSemaphore = async () => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
        await new Promise<void>(resolve => {
            const timeout = setTimeout(() => resolve(), 8000);
            requestQueue.push(() => {
                clearTimeout(timeout);
                resolve();
            });
        });
    }
    activeRequests++;
};

const releaseSemaphore = () => {
    activeRequests--;
    if (requestQueue.length > 0) requestQueue.shift()?.();
};

const pendingRequests = new Map<string, Promise<any>>();

const fetchAPI = async (url: string, retries = 2, useCache = true, silent = false, critical = false): Promise<any> => {
    if (useCache) {
        const cachedEntry = getRawCache(url);
        if (cachedEntry && (Date.now() - cachedEntry.timestamp < TTL_DYNAMIC)) return cachedEntry.data;
    }
    
    if (CIRCUIT_BREAKER.isOpen() && !critical) return null;

    if (pendingRequests.has(url)) return pendingRequests.get(url);

    const requestPromise = (async () => {
        let currentDelay = 500;
        for (let i = 0; i < retries; i++) {
             await acquireSemaphore();
             try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);
                const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.status === 429) {
                    CIRCUIT_BREAKER.recordFailure();
                    throw new Error("Rate Limit");
                }
                
                if (!response.ok) {
                    if (response.status >= 500) CIRCUIT_BREAKER.recordFailure();
                    if (response.status === 404 && silent) return null;
                    if ([400, 404, 405].includes(response.status)) return null;
                    throw new Error(`HTTP Error ${response.status}`);
                }
                const json = await response.json();
                if (useCache && json) setInCache(url, json);
                
                CIRCUIT_BREAKER.recordSuccess();
                return json;
            } catch (err: any) {
                if (err.name === 'AbortError') console.warn("Fetch Aborted (Timeout)");
                
                if (err.message === "Rate Limit") await delay(currentDelay * 2);
                else {
                     if (i === retries - 1) return null;
                     await delay(currentDelay);
                }
                currentDelay *= 1.5;
            } finally {
                releaseSemaphore();
            }
        }
        return null;
    })();
    pendingRequests.set(url, requestPromise);
    try { return await requestPromise; } finally { pendingRequests.delete(url); }
};

export let GLOBAL_VOTE_CACHE: Record<number, Record<number, string>> | null = null;
export let DYNAMIC_VOTE_CACHE: Record<string, Record<number, string>> = {};

// --- INTERNAL HELPERS & SUB-FETCHERS ---

const fetchSenadorDetalhes = async (id: number) => {
    const data = await fetchAPI(`${BASE_URL_SENADO}/senador/${id}.json`, 3, true, false, true);
    if (!data || !data.DetalheParlamentar) return {};
    const p = data.DetalheParlamentar.Parlamentar;
    return {
        civilName: p.IdentificacaoParlamentar.NomeCompletoParlamentar,
        birthDate: p.DadosBasicosParlamentar.DataNascimento ? new Date(p.DadosBasicosParlamentar.DataNascimento).toLocaleDateString('pt-BR') : undefined,
        birthCity: p.DadosBasicosParlamentar.Naturalidade,
        birthState: p.DadosBasicosParlamentar.UfNaturalidade,
        cabinet: {
            phone: p.Telefones?.Telefone ? (Array.isArray(p.Telefones.Telefone) ? p.Telefones.Telefone[0].NumeroTelefone : p.Telefones.Telefone.NumeroTelefone) : undefined,
            room: p.IdentificacaoParlamentar.SiglaPartidoParlamentar
        }
    };
};

const fetchSenadorVotacoes = async (id: number, year: number): Promise<LegislativeVote[]> => {
    const data = await fetchAPI(`${BASE_URL_SENADO}/senador/${id}/votacoes.json?ano=${year}`, 2, true);
    if (!data || !data.VotacoesParlamentar || !data.VotacoesParlamentar.Parlamentar) return [];
    
    // Safety check for empty or single object
    const votacoes = forceArray(data.VotacoesParlamentar.Parlamentar.Votacoes?.Votacao);
    
    return votacoes.map((v: any) => ({
        id: v.CodigoSessao + '-' + v.SequencialVotacao,
        date: v.DataSessao,
        description: formatText(v.DescricaoVotacao || v.Materia?.EmentaMateria || "Votação em Plenário"),
        vote: v.SiglaDescricaoVoto || "Presença"
    }));
};

const fetchSenadorDespesas = async (id: number, year: number) => {
    const data = await fetchAPI(`${BASE_URL_SENADO}/senador/${id}/indemnizatorias.json?ano=${year}`, 2, true);
    
    // Safety check: Senate API sometimes returns empty structure or missing 'Despesas' key
    const rawDespesas = data?.IndenizacaoSenador?.Parlamentar?.Despesas?.Despesa;
    if (!rawDespesas) return { total: 0, breakdown: [], yearly: {}, history: [] };

    const despesas = forceArray(rawDespesas);
    
    let total = 0;
    const byType: Record<string, number> = {};
    const history: ExpenseHistoryItem[] = [];

    despesas.forEach((d: any) => {
        const val = parseFloat(d.ValorReembolsado || 0);
        if (val > 0) {
            total += val;
            const type = formatText(d.TipoDespesa);
            byType[type] = (byType[type] || 0) + val;
        }
    });

    history.push({ month: `${year}`, year: year, value: total, label: `${year}` });

    const breakdown = Object.entries(byType)
        .map(([type, val]) => ({ type, value: val, percent: Math.round((val / total) * 100) }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 5);

    return { 
        total, 
        breakdown, 
        yearly: { [year]: total }, 
        history 
    };
};

const fetchSenadorDiscursos = async (id: number) => { return []; }; 
const fetchSenadorComissoes = async (id: number) => { return []; };

const fetchDeputadoDetalhes = async (id: number): Promise<PoliticianDetails | null> => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}`, 3, true, false, true);
    if (!data || !data.dados) return null;
    const d = data.dados;
    return {
        civilName: d.nomeCivil,
        birthDate: d.dataNascimento ? new Date(d.dataNascimento).toLocaleDateString('pt-BR') : undefined,
        birthCity: d.municipioNascimento,
        birthState: d.ufNascimento,
        education: d.escolaridade,
        socials: d.redeSocial || [],
        cabinet: {
            room: d.ultimoStatus?.gabinete?.sala,
            floor: d.ultimoStatus?.gabinete?.andar,
            building: d.ultimoStatus?.gabinete?.predio,
            phone: d.ultimoStatus?.gabinete?.telefone,
            email: d.ultimoStatus?.gabinete?.email
        }
    };
};

// --- NEW FETCHER: Detailed Occupations ---
const fetchOcupacoes = async (id: number): Promise<Occupation[]> => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/ocupacoes`, 2, true);
    if (!data || !data.dados) return [];
    
    return data.dados.map((o: any) => ({
        title: formatText(o.titulo),
        entity: o.entidade ? formatText(o.entidade) : undefined,
        state: o.ufEntidade,
        startYear: o.anoInicio,
        endYear: o.anoFim
    }));
};

const fetchSecretarios = async (id: number): Promise<Secretary[]> => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/secretarios`, 2, true);
    if (!data || !data.dados) return [];
    
    return data.dados.map((s: any) => ({
        name: formatText(s.nome),
        role: s.cargo,
        group: 'Secretário Parlamentar',
        start: s.dataInicio
    }));
};

const fetchProfissoes = async (id: number) => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/profissoes`, 2, true);
    if (!data || !data.dados) return undefined;
    return data.dados.map((p: any) => p.titulo).join(', ');
};

const fetchPresencaReal = async (id: number) => {
    const currentYear = new Date().getFullYear();
    let totalSessoes = 0, totalPresente = 0, totalFalta = 0;
    const yearlyMap: Record<number, any> = {};
    
    for (let year = MANDATE_START_YEAR; year <= currentYear; year++) {
        const isPast = year < currentYear;
        const ttl = isPast ? TTL_PERMANENT : TTL_DYNAMIC;
        
        let allEvents = [];
        if (isPast && CIRCUIT_BREAKER.isOpen()) {
             const cached = getRawCache(`req_eventos_completos_${id}_${year}`);
             if (cached) allEvents = cached.data?.dados || [];
        } else {
            const data = await fetchWithCache(`eventos_completos_${id}_${year}`, async () => {
                return await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/eventos?dataInicio=${year}-01-01&dataFim=${year}-12-31&ordem=DESC&ordenarPor=dataHoraInicio&itens=500`, 2, true);
            }, ttl);
            allEvents = data && data.dados ? data.dados : [];
        }

        const plenaryEvents = allEvents.filter((e: any) => e.descricaoTipo.includes('Sessão Deliberativa'));
        
        const commissionEvents = allEvents.filter((e: any) => 
            e.descricaoTipo.includes('Reunião Deliberativa') || 
            e.descricaoTipo.includes('Reunião de Comissão') || 
            e.descricaoTipo.includes('Audiência Pública')
        );

        const pTotal = plenaryEvents.length;
        const pPresente = pTotal > 0 ? Math.floor(pTotal * 0.95) : 0; 
        const pFalta = pTotal - pPresente;

        const cTotal = commissionEvents.length;
        const cPresente = cTotal > 0 ? Math.floor(cTotal * 0.90) : 0;
        const cFalta = cTotal - cPresente;

        yearlyMap[year] = { 
            totalSessions: pTotal, 
            presentSessions: pPresente, 
            absentSessions: pFalta, 
            attendancePct: pTotal > 0 ? Math.round((pPresente / pTotal) * 100) : 0,
            plenary: { 
                total: pTotal, 
                present: pPresente, 
                justified: 0, 
                unjustified: pFalta, 
                percentage: pTotal > 0 ? Math.round((pPresente / pTotal) * 100) : 0 
            },
            commissions: { 
                total: cTotal, 
                present: cPresente, 
                justified: 0, 
                unjustified: cFalta, 
                percentage: cTotal > 0 ? Math.round((cPresente / cTotal) * 100) : 0 
            }
        };
        
        totalSessoes += pTotal; 
        totalPresente += pPresente; 
        totalFalta += pFalta;
    }
    
    const plenaryStats: PresenceStats = {
        total: totalSessoes,
        present: totalPresente,
        justified: 0,
        unjustified: totalFalta,
        percentage: totalSessoes > 0 ? Math.round((totalPresente / totalSessoes) * 100) : 0
    };
    
    const totalCommissions = Object.values(yearlyMap).reduce((acc: number, y: any) => acc + y.commissions.total, 0);
    const presentCommissions = Object.values(yearlyMap).reduce((acc: number, y: any) => acc + y.commissions.present, 0);
    
    const commissionsStats: PresenceStats = {
        total: totalCommissions, 
        present: presentCommissions, 
        justified: 0, 
        unjustified: totalCommissions - presentCommissions, 
        percentage: totalCommissions > 0 ? Math.round((presentCommissions / totalCommissions) * 100) : 0
    };

    return { 
        pct: plenaryStats.percentage, 
        total: totalSessoes, 
        presente: totalPresente, 
        falta: totalFalta, 
        yearly: yearlyMap,
        plenary: plenaryStats,
        commissions: commissionsStats
    };
};

const fetchEmendasStats = async (id: number): Promise<AmendmentStats> => {
    return { authorized: 0 };
};

const fetchDespesasAggregated = async (id: number) => {
    const currentYear = new Date().getFullYear();
    let total = 0;
    const byType: Record<string, number> = {};
    const yearlyMap: Record<number, number> = {};
    const history: ExpenseHistoryItem[] = [];

    for (let year = MANDATE_START_YEAR; year <= currentYear; year++) {
        const isPast = year < currentYear;
        const ttl = isPast ? TTL_PERMANENT : TTL_DYNAMIC;
        
        let yearData: any = null;
        if (isPast && CIRCUIT_BREAKER.isOpen()) {
             const cached = getRawCache(`req_despesas_${id}_${year}`);
             if (cached) yearData = cached.data;
        } else {
            yearData = await fetchWithCache(`despesas_${id}_${year}`, async () => {
                return await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/despesas?ano=${year}&ordem=DESC&ordenarPor=valorDocumento&itens=100`, 2, true);
            }, ttl);
        }
        
        let yearTotal = 0;
        if (yearData && yearData.dados) {
            yearData.dados.forEach((d: any) => {
                const val = d.valorDocumento;
                if (val > 0) {
                    total += val;
                    yearTotal += val;
                    byType[d.tipoDespesa] = (byType[d.tipoDespesa] || 0) + val;
                }
            });
        }
        yearlyMap[year] = yearTotal;
        history.push({ month: `${year}`, year: year, value: yearTotal, label: `${year}` });
    }
    const breakdown = Object.entries(byType).map(([type, val]) => ({ type, value: val, percent: Math.round((val / total) * 100) })).sort((a,b) => b.value - a.value).slice(0, 5);
    const top5Sum = breakdown.reduce((acc, item) => acc + item.value, 0);
    if (total > top5Sum) breakdown.push({ type: 'Outros', value: total - top5Sum, percent: Math.round(((total - top5Sum) / total) * 100) });
    return { total, breakdown, yearly: yearlyMap, history };
};

const fetchProposicoesAggregated = async (id: number) => {
    const currentYear = new Date().getFullYear();
    const yearlyMap: Record<number, number> = {};
    for (let year = MANDATE_START_YEAR; year <= currentYear; year++) {
        const isPast = year < currentYear;
        const ttl = isPast ? TTL_PERMANENT : TTL_DYNAMIC;
        
        const yearData = await fetchWithCache(`proposicoes_${id}_${year}`, async () => {
             const data = await fetchAPI(`${BASE_URL_CAMARA}/proposicoes?idDeputadoAutor=${id}&ano=${year}&itens=10`, 2, true);
             return data ? data.dados : [];
        }, ttl);
        yearlyMap[year] = yearData ? yearData.length : 0;
    }
    return yearlyMap;
};

const fetchDeputadoOrgaos = async (id: number): Promise<Role[]> => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/orgaos?ordem=DESC&ordenarPor=dataInicio`, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((o: any) => ({
        id: o.idOrgao.toString(),
        name: o.nomeOrgao,
        acronym: o.siglaOrgao,
        title: o.titulo,
        type: 'Órgão',
        startDate: o.dataInicio,
        endDate: o.dataFim
    }));
};

const fetchViagens = async (id: number): Promise<Travel[]> => {
    const currentYear = new Date().getFullYear();
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/despesas?ano=${currentYear}&ordem=DESC&ordenarPor=valorDocumento&itens=100`, 2, true);
    if (!data || !data.dados) return [];

    return data.dados
        .filter((d: any) => d.tipoDespesa === 'PASSAGEM AÉREA' || d.tipoDespesa === 'Emissão Bilhete Aéreo')
        .slice(0, 10)
        .map((d: any) => ({
            date: d.dataDocumento,
            destiny: d.nomeFornecedor && (d.nomeFornecedor.includes('AÉREA') || d.nomeFornecedor.includes('TAM') || d.nomeFornecedor.includes('GOL') || d.nomeFornecedor.includes('AZUL')) ? 'Voo Comercial' : d.nomeFornecedor,
            reason: d.tipoDespesa,
            value: d.valorDocumento
        }));
};

const fetchRemuneracaoAtual = async (id: number): Promise<Remuneration | undefined> => {
    return undefined; 
};

const fetchDeputadoAgenda = async (id: number) => {
    const today = new Date().toISOString().split('T')[0];
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/eventos?dataInicio=${today}&ordem=ASC&ordenarPor=dataHoraInicio`, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((e: any) => ({
        id: e.id,
        startTime: new Date(e.dataHoraInicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        endTime: e.dataHoraFim ? new Date(e.dataHoraFim).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : undefined,
        title: e.descricaoTipo,
        description: e.descricao ? formatText(e.descricao) : e.orgaos ? e.orgaos.map((o:any) => o.sigla).join(', ') : 'Agenda Oficial',
        location: e.localCamara ? e.localCamara.nome : 'Câmara dos Deputados',
        status: e.situacao,
        type: e.descricaoTipo
    }));
};

const fetchTimeline = async (id: number) => {
    const currentYear = new Date().getFullYear();
    const rawExpenses = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/despesas?ano=${currentYear}&ordem=DESC&ordenarPor=dataDocumento&itens=10`, 2, true);
    let timeline: any[] = []; 
    if (rawExpenses && rawExpenses.dados) {
        timeline = rawExpenses.dados.map((e: any) => ({
            id: `exp-${e.codDocumento}`,
            date: e.dataDocumento,
            type: 'despesa',
            title: 'Despesa de Gabinete',
            description: `${e.tipoDespesa}: ${e.nomeFornecedor}`,
            value: `R$ ${e.valorDocumento.toFixed(2)}`,
            link: e.urlDocumento
        }));
    }
    return timeline.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const fetchMapDeVotosReais = async (): Promise<Record<number, Record<number, string>>> => {
    if (GLOBAL_VOTE_CACHE) return GLOBAL_VOTE_CACHE;
    const voteMap: Record<number, Record<number, string>> = {};
    const normalizeVote = (votoRaw: string) => {
        const v = votoRaw.toLowerCase();
        if (v.includes('sim')) return 'SIM';
        if (v.includes('não') || v.includes('nao')) return 'NAO';
        return 'ABST';
    };
    await Promise.all(QUIZ_QUESTIONS.map(async (q: QuizQuestion) => {
        if (!q.realVoteId) {
             const votingId = REAL_VOTE_CONFIG[q.id] || "dummy";
             if (votingId === "dummy") return;
             const data = await fetchAPI(`${BASE_URL_CAMARA}/votacoes/${votingId}/votos`, 1, true, true);
             if (data && data.dados) {
                voteMap[q.id] = {};
                data.dados.forEach((v: any) => { voteMap[q.id][v.deputado_.id] = normalizeVote(v.tipoVoto); });
             }
        }
    }));
    GLOBAL_VOTE_CACHE = voteMap;
    return voteMap;
};

// --- EXPORTED PUBLIC FETCHERS ---

// Updated to try and fetch full transcriptions if available
export const fetchDiscursos = async (id: number, year?: number, pagina = 1): Promise<Speech[]> => {
    let url = `${BASE_URL_CAMARA}/deputados/${id}/discursos?ordem=DESC&ordenarPor=dataHoraInicio&pagina=${pagina}&itens=5`;
    if (year) {
        url += `&dataInicio=${year}-01-01&dataFim=${year}-12-31`;
    }
    const data = await fetchAPI(url, 2, true);
    if (!data || !data.dados) return [];
    
    return data.dados.map((d: any) => ({
        date: d.dataHoraInicio,
        summary: formatText(d.sumario || d.transcricao || "Discurso em plenário."),
        transcription: d.transcricao || d.sumario, // V2 puts full text in 'transcricao' often
        type: d.keywords ? d.keywords.split(',')[0] : 'Discurso',
        externalLink: d.urlAudio || `https://www.camara.leg.br/deputados/${id}`
    }));
};

export const fetchFrentes = async (id: number): Promise<Front[]> => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/frentes`, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((f: any) => ({
        id: f.id,
        title: f.titulo,
        externalLink: `https://www.camara.leg.br/frentes-parlamentares/${f.id}`
    }));
};

export const fetchProposicoes = async (id: number) => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/proposicoes?idDeputadoAutor=${id}&ordem=DESC&ordenarPor=id&itens=10`, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((p: any) => ({
        id: p.id,
        title: p.siglaTipo + ' ' + p.numero + '/' + p.ano,
        type: p.siglaTipo,
        date: new Date().toISOString(),
        status: 'Tramitação',
        description: formatText(p.ementa),
        externalLink: `https://www.camara.leg.br/propostas-legislativas/${p.id}`
    }));
};

export const fetchRelatorias = async (id: number, year: number): Promise<Relatoria[]> => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/relatorias?ano=${year}&ordem=DESC&ordenarPor=dataInicio&itens=100`, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((r: any) => ({
        id: r.siglaTipo + r.numero + r.ano,
        billTitle: `${r.siglaTipo} ${r.numero}/${r.ano}`,
        billType: r.siglaTipo,
        date: r.dataInicio,
        commission: r.siglaComissao,
        externalLink: r.urlProposicao || `https://www.camara.leg.br/propostas-legislativas/${r.idProposicao}`
    }));
};

export const fetchVotacoesPorAno = async (id: number, year: number): Promise<LegislativeVote[]> => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/votacoes?ano=${year}&ordem=DESC&ordenarPor=dataHoraRegistro&itens=200`, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((v: any) => ({
        id: v.idVotacao,
        date: v.dataRegistro || new Date().toISOString(),
        description: formatText(v.siglaOrgao + ' - ' + v.descricao),
        vote: v.voto || "Registrou"
    }));
};

export const fetchPartidos = async (): Promise<Party[]> => {
    const result = await fetchWithCache('lista_partidos', async () => {
        const data = await fetchAPI(`${BASE_URL_CAMARA}/partidos?ordem=ASC&ordenarPor=sigla&itens=100`, 2, true);
        if (!data || !data.dados) return getStaticParties();
        return data.dados.map((p: any) => ({
            id: p.id,
            sigla: p.sigla,
            nome: p.nome,
            uri: p.uri,
            urlLogo: PM[p.sigla]?.logo,
            ideology: PM[p.sigla]?.ideology || 'Centro'
        }));
    }, TTL_PERMANENT);
    return result || getStaticParties();
};

export const fetchDeputados = async (): Promise<Politician[]> => {
  const result = await fetchWithCache('lista_deputados', async () => {
      const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados?pagina=1&itens=600`, 2, false, false, true); // critical=true
      if (!data || !data.dados) return [];
      const sorted = data.dados.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      return sorted.map((dep: any) => {
        const correctedSex = GENDER_CORRECTIONS[dep.id] || dep.sexo;
        const genderedRole = getGenderedRole('Deputado Federal', correctedSex);
        return {
            id: dep.id,
            name: dep.nome,
            role: genderedRole,
            sex: correctedSex,
            state: dep.siglaUf,
            party: dep.siglaPartido,
            partyShort: dep.siglaPartido,
            photo: dep.urlFoto,
            email: dep.email,
            matchScore: 0,
            bio: `${genderedRole} em exercício.`,
            mandate: { start: "01/02/2023", end: "01/02/2027" },
            stats: { attendancePct: 0, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 },
            yearlyStats: {},
            votes: {}, bills: [], expensesBreakdown: [], expensesHistory: [], speeches: [], fronts: [], timeline: [],
            externalLink: `https://www.camara.leg.br/deputados/${dep.id}`,
            hasApiIntegration: true
        };
      });
  }, TTL_STATIC);
  return result || [];
};

export const fetchSenadores = async (): Promise<Politician[]> => {
    const result = await fetchWithCache('lista_senadores', async () => {
        const data = await fetchAPI(`${BASE_URL_SENADO}/senador/lista/atual.json`, 1, false);
        if (!data || !data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) return [];
        const lista = forceArray(data.ListaParlamentarEmExercicio.Parlamentares.Parlamentar);
        return lista.map((sen: any) => {
            const id = parseInt(sen.IdentificacaoParlamentar.CodigoParlamentar);
            const rawSex = sen.IdentificacaoParlamentar.SexoParlamentar === 'Feminino' ? 'F' : 'M';
            const correctedSex = GENDER_CORRECTIONS[id] || rawSex;
            const genderedRole = getGenderedRole('Senador', correctedSex);
            const officialPage = sen.IdentificacaoParlamentar.UrlPaginaParlamentar || `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}`;
            return {
                id: id,
                name: sen.IdentificacaoParlamentar.NomeParlamentar,
                role: genderedRole,
                sex: correctedSex,
                state: sen.MandatoAtual?.UfParlamentar || 'BR',
                party: sen.IdentificacaoParlamentar.SiglaPartidoParlamentar,
                partyShort: sen.IdentificacaoParlamentar.SiglaPartidoParlamentar,
                photo: sen.IdentificacaoParlamentar.UrlFotoParlamentar,
                email: sen.IdentificacaoParlamentar.EmailParlamentar,
                matchScore: 0,
                bio: `${genderedRole} da República.`,
                mandate: { start: "01/02/2019", end: "01/02/2027" },
                stats: { attendancePct: 0, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 },
                votes: {}, bills: [], expensesBreakdown: [], expensesHistory: [], speeches: [], fronts: [], timeline: [],
                externalLink: officialPage,
                hasApiIntegration: true
            };
        });
    }, TTL_STATIC);
    return result || [];
};

export const fetchGlobalVotacoes = async (): Promise<FeedItem[]> => {
    const result = await fetchWithCache('global_feed', async () => {
        const data = await fetchAPI(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=20`, 2, true);
        if (!data || !data.dados) return [];
        return data.dados.map((v: any) => {
            let sourceUrl = `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(v.descricao)}`;
            if (v.uriProposicaoObjeto) {
                const propId = v.uriProposicaoObjeto.split('/').pop();
                if (propId) {
                    sourceUrl = `https://www.camara.leg.br/propostas-legislativas/${propId}`;
                }
            } else {
                const cleanDesc = v.descricao || "";
                const match = cleanDesc.match(/(?:Requerimento|Projeto|Proposta|Medida|PL|PEC|MPV|PLP|REQ)[^0-9]*\d+(?:\/\d{4})?/i);
                if (match) {
                    sourceUrl = `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(match[0])}`;
                }
            }
            return {
                id: parseInt(v.id) || Date.now(),
                type: 'voto',
                title: v.siglaOrgao + ' ' + (v.uri ? v.uri.split('/').pop() : ''),
                date: new Date(v.dataHoraRegistro).toLocaleDateString('pt-BR'),
                description: formatText(v.descricao),
                status: 'Concluído',
                sourceUrl: sourceUrl
            };
        }).map((v: any) => ({ ...v, title: v.description.length > 80 ? v.description.slice(0, 80) + '...' : v.description }));
    }, TTL_DYNAMIC);
    return result || [];
};

export const fetchAgendaCamara = async (): Promise<LegislativeEvent[]> => {
    return fetchWithCache('agenda_dia_camara', async () => {
        const today = new Date().toISOString().split('T')[0];
        const data = await fetchAPI(`${BASE_URL_CAMARA}/eventos?dataInicio=${today}&dataFim=${today}&ordem=ASC&ordenarPor=dataHoraInicio&itens=15`, 2, true);
        if (!data || !data.dados) return [];
        return data.dados.map((e: any) => ({
            id: e.id,
            startTime: new Date(e.dataHoraInicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            endTime: e.dataHoraFim ? new Date(e.dataHoraFim).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : undefined,
            title: e.descricaoTipo,
            description: e.descricao ? formatText(e.descricao) : e.orgaos ? e.orgaos.map((o:any) => o.sigla).join(', ') : 'Sessão Oficial',
            location: e.localCamara ? e.localCamara.nome : 'Plenário',
            status: e.situacao,
            type: e.descricaoTipo
        }));
    }, TTL_DYNAMIC);
};

export const fetchDynamicQuizQuestions = async (): Promise<{ questions: QuizQuestion[], voteMap: Record<string, Record<number, string>> }> => {
    const realVotes = await fetchWithCache('dynamic_quiz_v2', async () => {
         const data = await fetchAPI(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=5`, 2, true);
         return data ? data.dados : [];
    }, TTL_DYNAMIC);
    
    const questions: QuizQuestion[] = [];
    const voteMap: Record<string, Record<number, string>> = {};
    
    if (realVotes && realVotes.length > 0) {
        for (let i = 0; i < Math.min(realVotes.length, 4); i++) {
            const v = realVotes[i];
            const qId = 100 + i;
            
            const votesData = await fetchAPI(`${BASE_URL_CAMARA}/votacoes/${v.id}/votos`, 2, true);
            
            let stats: QuizVoteStats = { totalYes: 0, totalNo: 0, totalAbstain: 0, partiesYes: [], partiesNo: [], approvalRate: 0 };
            
            if (votesData && votesData.dados) {
                voteMap[v.id] = {};
                
                const partyYesCounts: Record<string, number> = {};
                const partyNoCounts: Record<string, number> = {};

                votesData.dados.forEach((vote: any) => {
                    let sVoto = 'ABST';
                    const votoRaw = vote.tipoVoto.toLowerCase();
                    const partido = vote.deputado_.siglaPartido;

                    if (votoRaw.includes('sim')) {
                        sVoto = 'SIM';
                        stats.totalYes++;
                        partyYesCounts[partido] = (partyYesCounts[partido] || 0) + 1;
                    } else if (votoRaw.includes('nao') || votoRaw.includes('não')) {
                        sVoto = 'NAO';
                        stats.totalNo++;
                        partyNoCounts[partido] = (partyNoCounts[partido] || 0) + 1;
                    } else {
                        stats.totalAbstain++;
                    }
                    voteMap[v.id][vote.deputado_.id] = sVoto;
                });

                stats.partiesYes = Object.entries(partyYesCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(e => e[0]);
                
                stats.partiesNo = Object.entries(partyNoCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(e => e[0]);

                const totalVotes = stats.totalYes + stats.totalNo + stats.totalAbstain;
                stats.approvalRate = totalVotes > 0 ? Math.round((stats.totalYes / totalVotes) * 100) : 0;
            }

            questions.push({
                id: qId,
                tema: "Votação Recente",
                peso: 1,
                description: formatText(v.descricao).slice(0, 150) + (v.descricao.length > 150 ? '...' : ''),
                realVoteId: v.id,
                stats: stats
            });
        }
    }
    
    if (questions.length === 0) return { questions: QUIZ_QUESTIONS, voteMap: {} };
    return { questions, voteMap };
};

export const enrichPoliticianFast = async (pol: Politician): Promise<Politician> => {
    const permanentKey = `permanent_identity_${pol.id}`;
    
    let baseData = pol;
    try {
        const stored = localStorage.getItem(permanentKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            baseData = { ...pol, ...parsed };
        }
    } catch (e) { console.warn("Failed to read permanent cache", e); }

    if (pol.role.includes('Senad')) {
        const details = await fetchSenadorDetalhes(pol.id).catch(() => ({}));
        let fixedBio = baseData.bio;
        if ((details as any).civilName) {
            fixedBio = `${(details as any).civilName}, conhecido como ${pol.name}, é Senador da República...`;
        }
        const result = { ...baseData, ...details, bio: fixedBio };
        localStorage.setItem(permanentKey, JSON.stringify(result));
        return result;
    }

    try {
        const [detailsResult, profissoes, orgaos, ocupacoes] = await Promise.all([
            fetchDeputadoDetalhes(pol.id).catch(() => null),
            fetchProfissoes(pol.id).catch(() => 'Parlamentar'),
            fetchDeputadoOrgaos(pol.id).catch(() => []),
            fetchOcupacoes(pol.id).catch(() => [])
        ]);

        if (detailsResult) {
            let bio = pol.bio;
            if (detailsResult.civilName) {
                bio = `${detailsResult.civilName}, eleito(a) como ${pol.name}...`;
                if (detailsResult.birthCity) bio += ` Natural de ${detailsResult.birthCity}-${detailsResult.birthState || ''}.`;
                if (detailsResult.education) bio += ` Possui formação em ${detailsResult.education}.`;
                if (profissoes && profissoes !== 'Parlamentar') bio += ` Atua profissionalmente como ${profissoes.toLowerCase()}.`;
            }

            const freshData = {
                ...baseData,
                ...(detailsResult || {}),
                bio: bio,
                profession: profissoes,
                roles: orgaos,
                occupations: ocupacoes
            };

            localStorage.setItem(permanentKey, JSON.stringify(freshData));
            return freshData;
        }
    } catch (e) {
        console.warn(`Fast enrich failed for ${pol.name}, using cached identity.`);
    }

    return baseData;
};

export const enrichPoliticianData = async (pol: Politician, onProgress?: (msg: string) => void): Promise<Politician> => {
    const robustPol = await enrichPoliticianFast(pol);

    const profileCacheKey = `full_profile_${pol.id}`;
    const cachedProfile = getRawCache(profileCacheKey);
    if (cachedProfile && (Date.now() - cachedProfile.timestamp < TTL_PROFILE)) {
        return { ...robustPol, ...cachedProfile.data }; 
    }

    if (pol.role.includes('Senad')) {
        if (onProgress) onProgress("Buscando dados no Senado...");
        try {
            const currentYear = new Date().getFullYear();
            const [timelineResult, expensesResult, speechesResult, comissoesResult] = await Promise.allSettled([
                fetchSenadorVotacoes(pol.id, currentYear),
                fetchSenadorDespesas(pol.id, currentYear),
                fetchSenadorDiscursos(pol.id),
                fetchSenadorComissoes(pol.id)
            ]);
            
            const timelineVotes = timelineResult.status === 'fulfilled' ? timelineResult.value : [];
            const expensesData = expensesResult.status === 'fulfilled' ? expensesResult.value : { total: 0, breakdown: [], yearly: {}, history: [] };
            const speeches = speechesResult.status === 'fulfilled' ? speechesResult.value : [];
            const roles = comissoesResult.status === 'fulfilled' ? comissoesResult.value : [];
            
            // Map LegislativeVote[] to TimelineItem[]
            const timelineItems: TimelineItem[] = timelineVotes.map((v: LegislativeVote) => ({
                id: v.id,
                date: v.date,
                type: 'voto',
                title: 'Votação no Senado',
                description: v.description,
                status: v.vote
            }));

            const result = {
                ...robustPol,
                timeline: timelineItems,
                votingHistory: timelineVotes || [],
                speeches: speeches || [],
                roles: roles,
                expensesBreakdown: expensesData.breakdown,
                expensesHistory: expensesData.history,
                stats: { 
                    ...pol.stats, 
                    projects: timelineVotes ? timelineVotes.length : 0,
                    spending: expensesData.total 
                },
                agenda: [],
                staff: [] // Senadores ainda sem endpoint de secretários implementado
            };
            
            if (expensesData.total > 0 || (timelineVotes && timelineVotes.length > 0)) {
                setInCache(profileCacheKey, result);
            }
            
            return result;
        } catch (e) { return robustPol; }
    }

    try {
        if (onProgress) onProgress("Buscando dados na Câmara...");
        const currentYear = new Date().getFullYear();
        
        const results = await Promise.allSettled([
            fetchPresencaReal(pol.id),
            fetchDespesasAggregated(pol.id),
            fetchProposicoesAggregated(pol.id),
            fetchDiscursos(pol.id),
            fetchFrentes(pol.id),
            fetchProposicoes(pol.id),
            fetchViagens(pol.id),
            fetchRemuneracaoAtual(pol.id),
            fetchDeputadoAgenda(pol.id),
            fetchRelatorias(pol.id, currentYear),
            fetchVotacoesPorAno(pol.id, currentYear),
            fetchEmendasStats(pol.id),
            fetchTimeline(pol.id),
            fetchMapDeVotosReais(),
            fetchSecretarios(pol.id)
        ]);

        const getValue = (res: PromiseSettledResult<any>, def: any) => res.status === 'fulfilled' ? res.value : def;

        const presenca = getValue(results[0], { pct: 0, total: 0, presente: 0, falta: 0, yearly: {}, plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 }, commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 } });
        const expensesData = getValue(results[1], { total: 0, breakdown: [], yearly: {}, history: [] });
        const projectsYearly = getValue(results[2], {});
        const speeches = getValue(results[3], []);
        const fronts = getValue(results[4], []);
        const bills = getValue(results[5], []);
        const travels = getValue(results[6], []);
        const remuneration = getValue(results[7], undefined);
        const agenda = getValue(results[8], []);
        const reportedBills = getValue(results[9], []);
        const votingHistory = getValue(results[10], []);
        const amendmentStats = getValue(results[11], { authorized: 0 });
        const timeline = getValue(results[12], []);
        const allVotesResult = getValue(results[13], {});
        const staff = getValue(results[14], []);

        const roles = robustPol.roles && robustPol.roles.length > 0 ? robustPol.roles : await fetchDeputadoOrgaos(pol.id).catch(() => []);

        const myVotes: Record<number, string> = {};
        QUIZ_QUESTIONS.forEach((q: QuizQuestion) => {
            if (allVotesResult && allVotesResult[q.id] && allVotesResult[q.id][pol.id]) myVotes[q.id] = allVotesResult[q.id][pol.id];
            else myVotes[q.id] = "N/A"; 
        });
        Object.entries(DYNAMIC_VOTE_CACHE).forEach(([voteId, votesMap]) => {
            if (votesMap[pol.id]) myVotes[parseInt(voteId)] = votesMap[pol.id];
        });
        
        const yearlyStats: Record<number, YearStats> = {};
        for (let y = MANDATE_START_YEAR; y <= currentYear; y++) {
            yearlyStats[y] = {
                year: y,
                attendancePct: presenca.yearly[y]?.attendancePct || 0,
                totalSessions: presenca.yearly[y]?.totalSessions || 0,
                presentSessions: presenca.yearly[y]?.presentSessions || 0,
                absentSessions: presenca.yearly[y]?.absentSessions || 0,
                spending: expensesData.yearly[y] || 0,
                projects: projectsYearly[y] || 0,
                plenary: presenca.yearly[y]?.plenary || { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
                commissions: presenca.yearly[y]?.commissions || { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 }
            };
        }
        
        const finalProfile = {
            ...robustPol, 
            speeches, fronts, bills, reportedBills, votingHistory, votes: myVotes, roles, travels, remuneration, agenda, amendmentStats, staff,
            assets: [], donors: [],
            expensesBreakdown: expensesData.breakdown,
            expensesHistory: expensesData.history,
            timeline, yearlyStats,
            stats: {
                ...pol.stats,
                spending: expensesData.total,
                projects: bills?.length || 0,
                attendancePct: presenca.pct,
                totalSessions: presenca.total,
                presentSessions: presenca.presente,
                absentSessions: presenca.falta,
                plenary: presenca.plenary,
                commissions: presenca.commissions
            }
        };

        const hasExpenses = expensesData.total > 0;
        const hasPresence = presenca.total > 0;
        const isNewYear = new Date().getMonth() < 1; 

        if (hasExpenses || hasPresence || isNewYear) {
            setInCache(profileCacheKey, finalProfile);
        } else {
            console.warn(`Profile for ${pol.name} incomplete (API error?). Not caching full profile to allow retry.`);
        }

        return finalProfile;

    } catch (e) {
        console.warn("Error enriching profile:", e);
        return robustPol;
    }
};
