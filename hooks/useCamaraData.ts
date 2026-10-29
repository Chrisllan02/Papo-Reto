
import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Politician, FeedItem, Party, EducationalArticle } from '../types';
import { 
    BASE_URL_CAMARA,
    fetchDeputados, 
    fetchSenadores, 
    fetchGlobalVotacoes, 
    fetchPartidos, 
    enrichPoliticianFast, 
    enrichPoliticianData,
    fetchAPI,
    normalizeSex,
    getStaticParties,
    fetchCachedPoliticianProfile,
    hasProfileCacheData,
    getProfileDataScore,
    PROFILE_DETAIL_FRESH_TTL,
    PROFILE_DETAIL_STALE_TTL,
    getFullProfileCacheKey
} from '../services/camaraApi';
import { safeGetItem, safeSetItem, safeRemoveItem, purgeStaleKeys } from '../services/storage';
import { timeoutSignal } from '../utils/timeoutSignal';
import { POLITICIANS_DB, EDUCATION_CAROUSEL } from '../constants';

type LegislativeBootstrap = {
    politicians: Politician[];
    feedItems: FeedItem[];
    parties: Party[];
    articles?: EducationalArticle[];
    generatedAt?: string;
    partial?: boolean;
    warnings?: string[];
};

type SexCode = 'F' | 'M';
type BootstrapCacheData = {
    politicians?: Politician[];
    feedItems?: FeedItem[];
    parties?: Party[];
    articles?: EducationalArticle[];
};

const SEX_CACHE_KEY = 'paporeto_sex_cache_v1';
const BOOTSTRAP_CACHE_KEY = 'paporeto_bootstrap_v6';
const BOOTSTRAP_CACHE_TTL = 1000 * 60 * 60 * 12; // 12 horas
const BOOTSTRAP_FETCH_TIMEOUT_MS = 20000;

purgeStaleKeys(/^paporeto_bootstrap_v\d+$/, key => key === BOOTSTRAP_CACHE_KEY);
purgeStaleKeys(/^paporeto_sex_cache_v\d+$/, key => key === SEX_CACHE_KEY);

const readSexCache = (): Record<string, SexCode> => {
    try {
        const raw = safeGetItem(SEX_CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeSexCache = (cache: Record<string, SexCode>) => {
    safeSetItem(SEX_CACHE_KEY, JSON.stringify(cache));
};

const readBootstrapCache = (): BootstrapCacheData | null => {
    try {
        const raw = safeGetItem(BOOTSTRAP_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (Date.now() - Number(parsed.timestamp || 0) > BOOTSTRAP_CACHE_TTL) return null;
        if (!Array.isArray(parsed.data?.politicians) || parsed.data.politicians.length === 0) {
            safeRemoveItem(BOOTSTRAP_CACHE_KEY);
            return null;
        }
        return parsed.data as BootstrapCacheData;
    } catch {
        return null;
    }
};

const writeBootstrapCache = (data: {
    politicians: Politician[];
    feedItems: FeedItem[];
    parties: Party[];
    articles: EducationalArticle[];
}) => {
    safeSetItem(BOOTSTRAP_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
};

// Atualiza só os artigos do cache existente, preservando o timestamp (não renova o TTL do bootstrap).
const updateBootstrapCacheArticles = (articles: EducationalArticle[]) => {
    try {
        const raw = safeGetItem(BOOTSTRAP_CACHE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed?.data || typeof parsed.timestamp !== 'number') return;
        safeSetItem(BOOTSTRAP_CACHE_KEY, JSON.stringify({ data: { ...parsed.data, articles }, timestamp: parsed.timestamp }));
    } catch {
        // Cache ilegível: será refeito no próximo bootstrap.
    }
};

const isLocalHost = () => {
    if (typeof window === 'undefined') return false;
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const fetchServerBootstrap = async (): Promise<LegislativeBootstrap | null> => {
    if (isLocalHost() && !import.meta.env?.VITE_BOOTSTRAP_ENDPOINT) return null;
    const endpoint = import.meta.env?.VITE_BOOTSTRAP_ENDPOINT || '/api/bootstrap';

    try {
        const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, signal: timeoutSignal(BOOTSTRAP_FETCH_TIMEOUT_MS) });
        if (!response.ok) return null;
        const json = await response.json();
        const data = json?.data as LegislativeBootstrap | undefined;
        if (!data || !Array.isArray(data.politicians) || !Array.isArray(data.feedItems) || !Array.isArray(data.parties)) {
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

// O servidor já hidrata o sexo; aqui só completamos quem ainda falta, com um único setState no final.
const hydrateMissingSexMetadata = async (
    politicians: Politician[],
    setPoliticians: Dispatch<SetStateAction<Politician[]>>,
    isCancelled: () => boolean
) => {
    const missing = politicians.filter(pol => !normalizeSex(pol.sex) && pol.hasApiIntegration !== false);
    if (missing.length === 0) return;

    const cache = readSexCache();
    const found = new Map<number, SexCode>();
    const toFetch: Politician[] = [];

    for (const pol of missing) {
        const cachedSex = cache[String(pol.id)];
        if (cachedSex === 'F' || cachedSex === 'M') found.set(pol.id, cachedSex);
        else toFetch.push(pol);
    }

    const batchSize = 8;
    let fetchedAny = false;
    for (let i = 0; i < toFetch.length && !isCancelled(); i += batchSize) {
        await Promise.all(toFetch.slice(i, i + batchSize).map(async (pol) => {
            try {
                const response = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${pol.id}`, 2, true, 750, 12000);
                const sex = normalizeSex(response?.dados?.sexo);
                if (sex) {
                    cache[String(pol.id)] = sex;
                    found.set(pol.id, sex);
                    fetchedAny = true;
                }
            } catch {
                // Skip transient API errors; chart will still use known cache entries.
            }
        }));
    }

    if (fetchedAny) writeSexCache(cache);
    if (isCancelled() || found.size === 0) return;

    setPoliticians(prev => prev.map(pol => {
        const sex = found.get(pol.id);
        if (!sex || normalizeSex(pol.sex)) return pol;
        return {
            ...pol,
            sex,
            role: sex === 'F' ? 'Deputada Federal' : pol.role?.toLowerCase().includes('senad') ? 'Senador' : 'Deputado Federal'
        };
    }));
};

// --- Hook para Carga Inicial do App (Big Bang Load) ---
export const useInitialData = () => {
    const [bootstrapCache] = useState(readBootstrapCache);
    const [politicians, setPoliticians] = useState<Politician[]>(bootstrapCache?.politicians || POLITICIANS_DB);
    const [feedItems, setFeedItems] = useState<FeedItem[]>(bootstrapCache?.feedItems || []);
    const [parties, setParties] = useState<Party[]>(bootstrapCache?.parties || getStaticParties());
    const [articles, setArticles] = useState<EducationalArticle[]>(bootstrapCache?.articles || (EDUCATION_CAROUSEL as EducationalArticle[])); 
    const [isLoading, setIsLoading] = useState(!bootstrapCache);
    const [error, setError] = useState<string | null>(null);
    const [isEducationalContentLoading, setIsEducationalContentLoading] = useState(false);
    const [educationalContentLoaded, setEducationalContentLoaded] = useState(
        Boolean(bootstrapCache?.articles?.some(article => article.id >= 100))
    );

    useEffect(() => {
        let cancelled = false;
        const isCancelled = () => cancelled;

        if (bootstrapCache) {
            void hydrateMissingSexMetadata(bootstrapCache.politicians || POLITICIANS_DB, setPoliticians, isCancelled);
            return () => {
                cancelled = true;
            };
        }

        const loadAll = async () => {
            try {
                const serverBootstrap = await fetchServerBootstrap();
                if (serverBootstrap && serverBootstrap.politicians.length > 0) {
                    if (cancelled) return;
                    const shouldHydrateSenate = serverBootstrap.warnings?.includes('senado_senadores_unavailable');
                    const fallbackSenators = shouldHydrateSenate
                        ? await fetchSenadores().catch(() => [])
                        : [];
                    const nextPoliticians = fallbackSenators.length > 0
                        ? [
                            ...serverBootstrap.politicians.filter(pol => pol.hasApiIntegration !== false),
                            ...fallbackSenators
                        ]
                        : serverBootstrap.politicians;
                    const hasArticles = Boolean(serverBootstrap.articles && serverBootstrap.articles.length > 0);
                    const nextArticles = hasArticles
                        ? serverBootstrap.articles!
                        : (EDUCATION_CAROUSEL as EducationalArticle[]);
                    if (cancelled) return;
                    setPoliticians(nextPoliticians);
                    setFeedItems(serverBootstrap.feedItems);
                    if (serverBootstrap.parties.length > 0) setParties(serverBootstrap.parties);
                    setArticles(nextArticles);
                    if (!serverBootstrap.partial && serverBootstrap.feedItems.length > 0 && serverBootstrap.parties.length > 0) {
                        writeBootstrapCache({
                            politicians: nextPoliticians,
                            feedItems: serverBootstrap.feedItems,
                            parties: serverBootstrap.parties,
                            articles: nextArticles
                        });
                    }
                    setIsLoading(false);
                    void hydrateMissingSexMetadata(nextPoliticians, setPoliticians, isCancelled);
                    return;
                }

                // 1. Core Data (Parallel)
                const [deps, sens, feeds, parts] = await Promise.all([
                    fetchDeputados().catch(() => []),
                    fetchSenadores().catch(() => []),
                    fetchGlobalVotacoes().catch(() => []), 
                    fetchPartidos().catch(() => [])
                ]);

                if (cancelled) return;
                const mergedPoliticians = [...deps, ...sens].filter(Boolean);
                setFeedItems(feeds || []);
                if (parts && parts.length > 0) setParties(parts);

                if (mergedPoliticians.length > 0) {
                    const nextArticles = EDUCATION_CAROUSEL as EducationalArticle[];
                    setPoliticians(mergedPoliticians);
                    setArticles(nextArticles);
                    if (feeds && feeds.length > 0 && parts && parts.length > 0) {
                        writeBootstrapCache({
                            politicians: mergedPoliticians,
                            feedItems: feeds,
                            parties: parts,
                            articles: nextArticles
                        });
                    }
                    void hydrateMissingSexMetadata(mergedPoliticians, setPoliticians, isCancelled);
                } else {
                    setPoliticians(POLITICIANS_DB);
                    setArticles(EDUCATION_CAROUSEL as EducationalArticle[]);
                    setError("Não foi possível carregar a lista de parlamentares. Tente novamente mais tarde.");
                }

            } catch (err) {
                if (cancelled) return;
                console.error("Critical Data Load Error:", err);
                setError("Falha ao carregar dados do Congresso.");
            } finally {
                // Minimum splash screen time for UX smoothness
                setTimeout(() => {
                    if (!cancelled) setIsLoading(false);
                }, 1200);
            }
        };

        loadAll();

        return () => {
            cancelled = true;
        };
    }, [bootstrapCache]);

    const loadEducationalContent = useCallback(async () => {
        if (educationalContentLoaded || isEducationalContentLoading) return;
        setIsEducationalContentLoading(true);

        try {
            const { generateEducationalContent } = await import('../services/ai');
            const { articles: eduContent, isFallback } = await generateEducationalContent();
            if (eduContent.length === 0) return;

            const mapArticleStyle = (index: number, topic: string) => {
                const styles = [
                    { colorFrom: 'from-picture', colorTo: 'to-midnight', icon: 'Lightbulb', activeColor: 'bg-spring/20 text-picture' },
                    { colorFrom: 'from-nuit', colorTo: 'to-midnight', icon: 'Banknote', activeColor: 'bg-nuit/10 text-nuit' },
                    { colorFrom: 'from-lime-700', colorTo: 'to-green-900', icon: 'ScrollText', activeColor: 'bg-lime-900/20 text-lime-900 border border-lime-700' },
                    { colorFrom: 'from-midnight', colorTo: 'to-black', icon: 'Lightbulb', activeColor: 'bg-praxeti text-midnight' },
                    { colorFrom: 'from-nuit', colorTo: 'to-blue-900', icon: 'Banknote', activeColor: 'bg-blue-50 text-nuit' },
                    { colorFrom: 'from-picture', colorTo: 'to-green-900', icon: 'ScrollText', activeColor: 'bg-green-50 text-picture' }
                ];
                let base = styles[index % styles.length];
                let icon = base.icon;
                const t = topic ? topic.toLowerCase() : '';
                if (t.includes('orçamento') || t.includes('dinheiro') || t.includes('fundo') || t.includes('gasto')) icon = 'Banknote';
                if (t.includes('lei') || t.includes('pec') || t.includes('pl') || t.includes('constituição')) {
                    icon = 'ScrollText';
                    base = { colorFrom: 'from-amber-700', colorTo: 'to-orange-900', icon: 'ScrollText', activeColor: 'bg-amber-100 text-amber-900' };
                }
                return { ...base, icon };
            };

            const newArticles = eduContent.map((item, index) => ({
                id: index + 100,
                title: item.title,
                text: item.text,
                topic: item.topic,
                legislation: item.legislation,
                impact: item.impact,
                ...mapArticleStyle(index, item.topic)
            }));

            setArticles(newArticles);
            if (isFallback) return;
            setEducationalContentLoaded(true);
            updateBootstrapCacheArticles(newArticles);
        } catch (error) {
            console.warn('Educational content load failed', error);
        } finally {
            setIsEducationalContentLoading(false);
        }
    }, [educationalContentLoaded, isEducationalContentLoading]);

    return { politicians, feedItems, parties, articles, isLoading, error, setPoliticians, loadEducationalContent, isEducationalContentLoading };
};

// --- Hook para Perfil Detalhado (Progressive Enrichment) ---
export const usePoliticianProfile = (initialCandidate: Politician | null) => {
    const [candidate, setCandidate] = useState<Politician | null>(initialCandidate);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string>("Carregando...");

    useEffect(() => {
        let cancelled = false;

        if (!initialCandidate) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia o perfil antes de buscar os dados externos
            setCandidate(null);
            return () => {
                cancelled = true;
            };
        }

        // Reset to initial state when ID changes
        if (initialCandidate.id !== candidate?.id) {
            setCandidate(initialCandidate);
        }

        const loadDeepData = async () => {
            // Check if we already have detailed data (expenses, votes history)
            // This prevents re-fetching if user navigates back and forth quickly
            const hasFullData = (initialCandidate.expensesBreakdown && initialCandidate.expensesBreakdown.length > 0)
                || (initialCandidate.detailedExpenses && initialCandidate.detailedExpenses.length > 0)
                || (initialCandidate.votingHistory && initialCandidate.votingHistory.length > 0)
                || (initialCandidate.fronts && initialCandidate.fronts.length > 0);

            const cacheKey = getFullProfileCacheKey(initialCandidate.id);
            let staleLocalProfile: Politician | null = null;
            try {
                const cached = safeGetItem(cacheKey);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    const age = Date.now() - Number(timestamp || 0);
                    if (data && age < PROFILE_DETAIL_STALE_TTL) {
                        staleLocalProfile = data as Politician;
                        if (cancelled) return;
                        setCandidate(data);
                        if (age < PROFILE_DETAIL_FRESH_TTL) {
                            setIsLoadingDetails(false);
                            return;
                        }
                    }
                }
            } catch { /* cache indisponível: segue para a próxima fonte */ }

            try {
                const cachedGithub = await fetchCachedPoliticianProfile(initialCandidate.id);
                if (hasProfileCacheData(cachedGithub)) {
                    const merged = { ...(staleLocalProfile || initialCandidate), ...cachedGithub } as Politician;
                    if (cancelled) return;
                    setCandidate(prev => {
                        if (!prev) return merged;
                        return getProfileDataScore(merged) >= getProfileDataScore(prev) ? { ...prev, ...merged } : prev;
                    });
                    setIsLoadingDetails(false);
                    return;
                }
            } catch { /* cache indisponível: segue para a próxima fonte */ }
            
            if (hasFullData || !initialCandidate.hasApiIntegration) {
                if (cancelled) return;
                setIsLoadingDetails(false);
                return;
            }

            if (cancelled) return;
            setIsLoadingDetails(!staleLocalProfile);
            setLoadingStatus("Identificando parlamentar...");
            
            try {
                // Step 1: Fast Enrich (Identity, Contact, Bio) - returns fast
                const fastData = await enrichPoliticianFast(initialCandidate);
                if (cancelled) return;
                setCandidate(prev => {
                    if (!prev) return fastData;
                    const merged = { ...prev, ...fastData };
                    return getProfileDataScore(merged) >= getProfileDataScore(prev) ? merged : prev;
                });

                // Step 2: Deep Enrich (Votes, Expenses, History) - takes time
                // Pass callback to update status text
                const fullData = await enrichPoliticianData(fastData, (msg) => setLoadingStatus(msg));
                if (cancelled) return;
                setCandidate(prev => {
                    if (!prev) return fullData;
                    return getProfileDataScore(fullData) >= getProfileDataScore(prev) ? fullData : prev;
                });
            } catch (e) {
                console.error(`Error enriching profile for ${initialCandidate.name}`, e);
            } finally {
                if (!cancelled) {
                    setIsLoadingDetails(false);
                }
            }
        };

        loadDeepData();
        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só quando muda o parlamentar, não a cada novo objeto
    }, [initialCandidate?.id]); // Only re-run if the ID changes

    return { candidate, isLoadingDetails, loadingStatus };
};
