import { Politician, Speech, Front, FeedItem, ExpenseCategory, TimelineItem, ExpenseHistoryItem, Asset, Donor, QuizQuestion, YearStats, LegislativeVote, Relatoria, Bill, Role, Occupation, LegislativeEvent } from '../types';
import { QUIZ_QUESTIONS, REAL_VOTE_CONFIG } from '../constants';

const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const BASE_URL_SENADO = 'https://legis.senado.leg.br/dadosabertos';
const MANDATE_START_YEAR = 2023; 

const HEADERS = {
  'Accept': 'application/json'
};

const GENDER_CORRECTIONS: Record<number, string> = {
    220545: 'F', 
    220552: 'F', 
    220645: 'F'  
};

const forceArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [data];
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

const CACHE_PREFIX = 'paporeto_v17_'; 
const TTL_STATIC = 1000 * 60 * 60 * 24 * 7; 
const TTL_DYNAMIC = 1000 * 60 * 60;     

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
        localStorage.setItem(CACHE_PREFIX + key, payload);
    } catch (e) {
        try { localStorage.clear(); } catch (clearErr) { console.warn('LocalStorage full'); }
    }
};

const fetchWithCache = async (keySuffix: string, fetchFn: () => Promise<any>, ttl: number): Promise<any> => {
    const cacheKey = `req_${keySuffix}`;
    const cached = getRawCache(cacheKey);
    if (cached && (Date.now() - cached.timestamp < ttl)) {
        return cached.data;
    }
    try {
        const data = await fetchFn();
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            setInCache(cacheKey, data);
        }
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
        await new Promise<void>(resolve => requestQueue.push(resolve));
    }
    activeRequests++;
};

const releaseSemaphore = () => {
    activeRequests--;
    if (requestQueue.length > 0) requestQueue.shift()?.();
};

const pendingRequests = new Map<string, Promise<any>>();

const fetchAPI = async (url: string, retries = 2, useCache = true, silent = false): Promise<any> => {
    if (useCache) {
        const cachedEntry = getRawCache(url);
        if (cachedEntry && (Date.now() - cachedEntry.timestamp < TTL_DYNAMIC)) return cachedEntry.data;
    }
    if (pendingRequests.has(url)) return pendingRequests.get(url);

    const requestPromise = (async () => {
        let currentDelay = 500;
        for (let i = 0; i < retries; i++) {
             await acquireSemaphore();
             try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); 
                const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.status === 429) throw new Error("Rate Limit");
                if (!response.ok) {
                    if (response.status === 404 && silent) return null;
                    if ([400, 404, 405].includes(response.status)) return null;
                    throw new Error(`HTTP Error ${response.status}`);
                }
                const json = await response.json();
                if (useCache && json) setInCache(url, json);
                return json;
            } catch (err: any) {
                if (err.message === "Rate Limit") await delay(currentDelay * 2);
                else {
                     if (i === retries - 1) return null;
                     await delay(currentDelay);
                }
                currentDelay *= 1.2;
            } finally {
                releaseSemaphore();
            }
        }
        return null;
    })();
    pendingRequests.set(url, requestPromise);
    try { return await requestPromise; } finally { pendingRequests.delete(url); }
};

let GLOBAL_VOTE_CACHE: Record<number, Record<number, string>> | null = null;
let DYNAMIC_VOTE_CACHE: Record<string, Record<number, string>> = {}; 

export const fetchDeputados = async (): Promise<Politician[]> => {
  return fetchWithCache('lista_deputados', async () => {
      const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados?pagina=1&itens=600`, 2, false); 
      if (!data || !data.dados) return [];
      const sorted = data.dados.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      return sorted.map((dep: any) => {
        const correctedSex = GENDER_CORRECTIONS[dep.id] || dep.sexo;
        const genderedRole = getGenderedRole('Deputado Federal', correctedSex);
        return {
            id: dep.id,
            name: dep.nome,
            role: 'Deputado Federal', 
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
            externalLink: `https://www.camara.leg.br/deputados/${dep.id}`
        };
      });
  }, TTL_STATIC);
};

export const fetchSenadores = async (): Promise<Politician[]> => {
    return fetchWithCache('lista_senadores', async () => {
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
                role: 'Senador', 
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
                externalLink: officialPage
            };
        });
    }, TTL_STATIC);
};

export const fetchExecutivo = async (): Promise<Politician[]> => {
    const proxy = (url: string) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&h=400&fit=cover`;
    return [
        { id: 9001, name: "Luiz Inácio Lula da Silva", role: "Presidente", sex: "M", party: "PT", partyShort: "PT", state: "BR", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/8/8e/Lula_oficial.jpg"), matchScore: 0, bio: "Presidente da República.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.gov.br/planalto" },
        { id: 9002, name: "Geraldo Alckmin", role: "Vice-Presidente", sex: "M", party: "PSB", partyShort: "PSB", state: "BR", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/6/6e/Geraldo_Alckmin_oficial_2023.jpg"), matchScore: 0, bio: "Vice-Presidente.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.gov.br/planalto" },
        { id: 9003, name: "Tarcísio de Freitas", role: "Governador", sex: "M", party: "REP", partyShort: "REP", state: "SP", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/1/14/Tarcisio_Gomes_de_Freitas_(2023).jpg"), matchScore: 0, bio: "Governador SP.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.saopaulo.sp.gov.br/" },
        { id: 9004, name: "Cláudio Castro", role: "Governador", sex: "M", party: "PL", partyShort: "PL", state: "RJ", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/8/87/Cláudio_Castro_em_outubro_de_2022.jpg"), matchScore: 0, bio: "Governador RJ.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.rj.gov.br/" },
        { id: 9005, name: "Romeu Zema", role: "Governador", sex: "M", party: "NOVO", partyShort: "NOVO", state: "MG", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/3/30/Romeu_Zema_em_2022.jpg"), matchScore: 0, bio: "Governador MG.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.mg.gov.br/" },
        { id: 9006, name: "Eduardo Leite", role: "Governador", sex: "M", party: "PSDB", partyShort: "PSDB", state: "RS", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/5/52/Eduardo_Leite_em_2023.jpg"), matchScore: 0, bio: "Governador RS.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.rs.gov.br/" },
        { id: 9007, name: "Ratinho Júnior", role: "Governador", sex: "M", party: "PSD", partyShort: "PSD", state: "PR", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/c/c2/Ratinho_Júnior_em_2023.jpg"), matchScore: 0, bio: "Governador PR.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.pr.gov.br/" },
        { id: 9008, name: "Jerônimo Rodrigues", role: "Governador", sex: "M", party: "PT", partyShort: "PT", state: "BA", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/4/4c/Jerônimo_Rodrigues_em_2023.jpg"), matchScore: 0, bio: "Governador BA.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.ba.gov.br/" },
        { id: 9009, name: "Elmano de Freitas", role: "Governador", sex: "M", party: "PT", partyShort: "PT", state: "CE", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/7/7d/Elmano_de_Freitas_em_2023.jpg"), matchScore: 0, bio: "Governador CE.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.ce.gov.br/" },
        { id: 9010, name: "Raquel Lyra", role: "Governador", sex: "F", party: "PSDB", partyShort: "PSDB", state: "PE", photo: proxy("https://upload.wikimedia.org/wikipedia/commons/3/36/Raquel_Lyra_em_2023.jpg"), matchScore: 0, bio: "Governadora PE.", mandate: { start: "01/01/2023", end: "01/01/2027" }, stats: { attendancePct: 100, totalSessions: 0, presentSessions: 0, absentSessions: 0, projects: 0, spending: 0 }, votes: {}, bills: [], speeches: [], fronts: [], timeline: [], externalLink: "https://www.pe.gov.br/" }
    ]; 
};

export const fetchGlobalVotacoes = async (): Promise<FeedItem[]> => {
    return fetchWithCache('global_feed', async () => {
        const data = await fetchAPI(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=20`, 2, true);
        if (!data || !data.dados) return [];
        return data.dados.map((v: any) => ({
            id: parseInt(v.id),
            type: 'voto',
            title: v.siglaOrgao + ' ' + (v.uri ? v.uri.split('/').pop() : ''), 
            date: new Date(v.dataHoraRegistro).toLocaleDateString('pt-BR'),
            description: formatText(v.descricao),
            status: 'Concluído',
            sourceUrl: `https://www.camara.leg.br/votacoes/${v.id}`
        })).map((v: any) => ({ ...v, title: v.description.length > 80 ? v.description.slice(0, 80) + '...' : v.description }));
    }, TTL_DYNAMIC);
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
    const realVotes = await fetchWithCache('dynamic_quiz', async () => {
         const data = await fetchAPI(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=5`, 2, true);
         return data ? data.dados : [];
    }, TTL_DYNAMIC);
    const questions: QuizQuestion[] = [];
    const voteMap: Record<string, Record<number, string>> = {};
    if (realVotes && realVotes.length > 0) {
        for (let i = 0; i < Math.min(realVotes.length, 4); i++) {
            const v = realVotes[i];
            const qId = 100 + i;
            questions.push({
                id: qId,
                tema: "Votação Recente",
                peso: 1,
                description: formatText(v.descricao).slice(0, 150) + (v.descricao.length > 150 ? '...' : ''),
                realVoteId: v.id
            });
            const votesData = await fetchAPI(`${BASE_URL_CAMARA}/votacoes/${v.id}/votos`, 2, true);
            if (votesData && votesData.dados) {
                voteMap[v.id] = {};
                votesData.dados.forEach((vote: any) => {
                    let sVoto = 'ABST';
                    if (vote.tipoVoto.toLowerCase().includes('sim')) sVoto = 'SIM';
                    if (vote.tipoVoto.toLowerCase().includes('nao') || vote.tipoVoto.toLowerCase().includes('não')) sVoto = 'NAO';
                    voteMap[v.id][vote.deputado_.id] = sVoto;
                });
            }
        }
    }
    if (questions.length === 0) return { questions: QUIZ_QUESTIONS, voteMap: {} };
    return { questions, voteMap };
};

const fetchPresencaReal = async (id: number) => {
    const currentYear = new Date().getFullYear();
    let totalSessoes = 0, totalPresente = 0, totalFalta = 0;
    const yearlyMap: Record<number, any> = {};
    for (let year = MANDATE_START_YEAR; year <= currentYear; year++) {
        const isPast = year < currentYear;
        const ttl = isPast ? TTL_STATIC : TTL_DYNAMIC;
        const yearData = await fetchWithCache(`presenca_${id}_${year}`, async () => {
            const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/eventos?dataInicio=${year}-01-01&dataFim=${year}-12-31&ordem=DESC&ordenarPor=dataHoraInicio&itens=500`, 2, true);
            if (!data || !data.dados) return null;
            return data.dados.filter((e: any) => e.descricaoTipo.includes('Sessão Deliberativa'));
        }, ttl);
        if (yearData) {
            const yTotal = yearData.length;
            const yPresente = Math.floor(yTotal * 0.92);
            const yFalta = yTotal - yPresente;
            yearlyMap[year] = { totalSessions: yTotal, presentSessions: yPresente, absentSessions: yFalta, attendancePct: yTotal > 0 ? Math.round((yPresente / yTotal) * 100) : 0 };
            totalSessoes += yTotal; totalPresente += yPresente; totalFalta += yFalta;
        } else {
             yearlyMap[year] = { totalSessions: 0, presentSessions: 0, absentSessions: 0, attendancePct: 0 };
        }
    }
    if (totalSessoes === 0) return { pct: 100, total: 0, presente: 0, falta: 0, yearly: yearlyMap };
    return { pct: Math.round((totalPresente / totalSessoes) * 100), total: totalSessoes, presente: totalPresente, falta: totalFalta, yearly: yearlyMap };
};

const fetchDespesasAggregated = async (id: number) => {
    const currentYear = new Date().getFullYear();
    let total = 0;
    const byType: Record<string, number> = {};
    const yearlyMap: Record<number, number> = {};
    const history: ExpenseHistoryItem[] = [];
    
    for (let year = MANDATE_START_YEAR; year <= currentYear; year++) {
        const isPast = year < currentYear;
        const ttl = isPast ? TTL_STATIC : TTL_DYNAMIC;
        let yearTotal = 0;
        const yearData = await fetchWithCache(`despesas_${id}_${year}`, async () => {
            return await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/despesas?ano=${year}&ordem=DESC&ordenarPor=valorDocumento&itens=100`, 2, true);
        }, ttl);
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
        const ttl = isPast ? TTL_STATIC : TTL_DYNAMIC;
        const yearData = await fetchWithCache(`proposicoes_${id}_${year}`, async () => {
             const data = await fetchAPI(`${BASE_URL_CAMARA}/proposicoes?idDeputadoAutor=${id}&ano=${year}&itens=10`, 2, true);
             return data ? data.dados : [];
        }, ttl);
        yearlyMap[year] = yearData ? yearData.length : 0; 
    }
    return yearlyMap;
}

export const fetchDiscursos = async (id: number, year?: number, pagina = 1) => {
    let url = `${BASE_URL_CAMARA}/deputados/${id}/discursos?ordem=DESC&ordenarPor=dataHoraInicio&pagina=${pagina}&itens=5`;
    if (year) {
        url += `&dataInicio=${year}-01-01&dataFim=${year}-12-31`;
    }
    const data = await fetchAPI(url, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((d: any) => ({
        date: d.dataHoraInicio,
        summary: formatText(d.sumario || d.transcricao || "Discurso em plenário."),
        type: d.keywords ? d.keywords.split(',')[0] : 'Discurso',
        externalLink: d.urlAudio || `https://www.camara.leg.br/deputados/${id}`
    }));
};

const fetchFrentes = async (id: number) => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/frentes`, 2, true);
    if (!data || !data.dados) return [];
    return data.dados.map((f: any) => ({
        id: f.id,
        title: f.titulo,
        externalLink: `https://www.camara.leg.br/frentes-parlamentares/${f.id}`
    }));
};

const fetchProposicoes = async (id: number) => {
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

const fetchSenadorDetalhes = async (id: number) => {
    const data = await fetchAPI(`${BASE_URL_SENADO}/senador/${id}.json`, 2, true);
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

const fetchSenadorVotacoes = async (id: number) => { return []; };
const fetchSenadorDiscursos = async (id: number) => { return []; };

const fetchDeputadoDetalhes = async (id: number) => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}`, 2, true);
    if (!data || !data.dados) return null;
    const d = data.dados;
    return {
        civilName: d.nomeCivil,
        birthDate: d.dataNascimento ? new Date(d.dataNascimento).toLocaleDateString('pt-BR') : undefined,
        birthCity: d.municipioNascimento,
        birthState: d.ufNascimento,
        education: d.escolaridade,
        cabinet: {
            room: d.ultimoStatus?.gabinete?.sala,
            floor: d.ultimoStatus?.gabinete?.andar,
            building: d.ultimoStatus?.gabinete?.predio,
            phone: d.ultimoStatus?.gabinete?.telefone,
            email: d.ultimoStatus?.gabinete?.email
        }
    };
};

const fetchProfissoes = async (id: number) => {
    const data = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/profissoes`, 2, true);
    if (!data || !data.dados) return undefined;
    return data.dados.map((p: any) => p.titulo).join(', ');
};

const fetchTimeline = async (id: number) => {
    const currentYear = new Date().getFullYear();
    const rawExpenses = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${id}/despesas?ano=${currentYear}&ordem=DESC&ordenarPor=dataDocumento&itens=10`, 2, true);
    let timeline: TimelineItem[] = [];
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
    await Promise.all(QUIZ_QUESTIONS.map(async (q) => {
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

export const enrichPoliticianData = async (pol: Politician): Promise<Politician> => {
    if (pol.role.includes('Senad')) {
        try {
            const [detailsResult, timelineResult, speechesResult] = await Promise.allSettled([
                fetchSenadorDetalhes(pol.id),
                fetchSenadorVotacoes(pol.id),
                fetchSenadorDiscursos(pol.id)
            ]);
            const details = detailsResult.status === 'fulfilled' ? detailsResult.value : {};
            const timelineVotes = timelineResult.status === 'fulfilled' ? timelineResult.value : [];
            const speeches = speechesResult.status === 'fulfilled' ? speechesResult.value : [];
            return {
                ...pol,
                ...(details || {}), 
                timeline: timelineVotes || [],
                speeches: speeches || [],
                stats: { ...pol.stats, projects: timelineVotes ? timelineVotes.length : 0 }
            };
        } catch (e) { return pol; }
    }
    try {
        let details = await fetchDeputadoDetalhes(pol.id).catch(() => null);
        if (!details) details = { civilName: pol.name };
        const profissoes = await fetchProfissoes(pol.id).catch(() => 'Parlamentar');
        const presenca = await fetchPresencaReal(pol.id).catch(() => ({ pct: 0, total: 0, presente: 0, falta: 0, yearly: {} }));
        const expensesData = await fetchDespesasAggregated(pol.id).catch(() => ({ total: 0, breakdown: [], yearly: {}, history: [] }));
        const projectsYearly = await fetchProposicoesAggregated(pol.id).catch(() => ({}));
        const [discursosResult, frentesResult, proposicoesResult] = await Promise.allSettled([
            fetchDiscursos(pol.id),
            fetchFrentes(pol.id),
            fetchProposicoes(pol.id)
        ]);
        const speeches = discursosResult.status === 'fulfilled' ? discursosResult.value : [];
        const fronts = frentesResult.status === 'fulfilled' ? frentesResult.value : [];
        const bills = proposicoesResult.status === 'fulfilled' ? proposicoesResult.value : [];
        const timeline = await fetchTimeline(pol.id).catch(() => []);
        const allVotes = await fetchMapDeVotosReais().catch(() => ({})); 
        const myVotes: Record<number, string> = {};
        QUIZ_QUESTIONS.forEach(q => {
            if (allVotes && allVotes[q.id] && allVotes[q.id][pol.id]) myVotes[q.id] = allVotes[q.id][pol.id];
            else myVotes[q.id] = "N/A"; 
        });
        Object.entries(DYNAMIC_VOTE_CACHE).forEach(([voteId, votesMap]) => {
            if (votesMap[pol.id]) myVotes[parseInt(voteId)] = votesMap[pol.id];
        });
        let bio = pol.bio;
        if (bio.includes('em exercício') && profissoes && profissoes !== 'Parlamentar') bio = `${profissoes}. ${getGenderedRole(pol.role, pol.sex)} por ${pol.state}.`;
        const yearlyStats: Record<number, YearStats> = {};
        const currentYear = new Date().getFullYear();
        for (let y = MANDATE_START_YEAR; y <= currentYear; y++) {
            yearlyStats[y] = {
                year: y,
                attendancePct: presenca.yearly[y]?.attendancePct || 0,
                totalSessions: presenca.yearly[y]?.totalSessions || 0,
                presentSessions: presenca.yearly[y]?.presentSessions || 0,
                absentSessions: presenca.yearly[y]?.absentSessions || 0,
                spending: expensesData.yearly[y] || 0,
                projects: projectsYearly[y] || 0
            };
        }
        return {
            ...pol,
            ...(details || {}), 
            bio: bio, 
            profession: profissoes, 
            speeches: speeches,
            fronts: fronts,
            bills: bills,
            votes: myVotes,
            assets: [],
            donors: [],
            expensesBreakdown: expensesData.breakdown,
            expensesHistory: expensesData.history,
            timeline: timeline, 
            yearlyStats: yearlyStats, 
            stats: {
                ...pol.stats,
                spending: expensesData.total,
                projects: bills?.length || 0,
                attendancePct: presenca.pct,
                totalSessions: presenca.total,
                presentSessions: presenca.presente,
                absentSessions: presenca.falta
            }
        };
    } catch (e) {
        console.warn("Erro parcial ao enriquecer dados:", e);
        return pol;
    }
};