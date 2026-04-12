
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
    TTL_DYNAMIC,
    fetchCachedPoliticianProfile,
    hasProfileCacheData
} from '../services/camaraApi';
import { generateEducationalContent } from '../services/ai';
import { POLITICIANS_DB, FEED_ITEMS, EDUCATION_CAROUSEL } from '../constants';

type SexCode = 'F' | 'M';
const SEX_CACHE_KEY = 'paporeto_sex_cache_v1';

const readSexCache = (): Record<string, SexCode> => {
    try {
        const raw = localStorage.getItem(SEX_CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeSexCache = (cache: Record<string, SexCode>) => {
    try {
        localStorage.setItem(SEX_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore storage quota issues.
    }
};

const hydrateMissingSexMetadata = async (
    politicians: Politician[],
    setPoliticians: Dispatch<SetStateAction<Politician[]>>
) => {
    const cache = readSexCache();
    const missing = politicians.filter(pol => !normalizeSex(pol.sex) && pol.hasApiIntegration !== false);

    if (missing.length === 0) return;

    const applyUpdates = (updates: Array<{ id: number; sex: SexCode }>) => {
        if (updates.length === 0) return;

        setPoliticians(prev => prev.map(pol => {
            const found = updates.find(update => update.id === pol.id);
            if (!found) return pol;
            return {
                ...pol,
                sex: found.sex,
                role: found.sex === 'F' ? 'Deputada Federal' : pol.role?.toLowerCase().includes('senad') ? 'Senador' : 'Deputado Federal'
            };
        }));
    };

    const batchSize = 8;
    for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize);
        const updates: Array<{ id: number; sex: SexCode }> = [];

        await Promise.all(batch.map(async (pol) => {
            const cachedSex = cache[String(pol.id)];
            if (cachedSex === 'F' || cachedSex === 'M') {
                updates.push({ id: pol.id, sex: cachedSex });
                return;
            }

            try {
                const response = await fetchAPI(`${BASE_URL_CAMARA}/deputados/${pol.id}`, 2, true, 750, 12000);
                const sex = normalizeSex(response?.dados?.sexo);
                if (sex) {
                    cache[String(pol.id)] = sex;
                    updates.push({ id: pol.id, sex });
                }
            } catch {
                // Skip transient API errors; chart will still use known cache entries.
            }
        }));

        applyUpdates(updates);
        if (updates.length > 0) {
            writeSexCache(cache);
        }
    }
};

// --- Hook para Carga Inicial do App (Big Bang Load) ---
export const useInitialData = () => {
    const [politicians, setPoliticians] = useState<Politician[]>(POLITICIANS_DB);
    const [feedItems, setFeedItems] = useState<FeedItem[]>(FEED_ITEMS);
    const [parties, setParties] = useState<Party[]>(getStaticParties());
    const [articles, setArticles] = useState<EducationalArticle[]>(EDUCATION_CAROUSEL as EducationalArticle[]); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAll = async () => {
            try {
                // 1. Core Data (Parallel)
                const [deps, sens, feeds, parts] = await Promise.all([
                    fetchDeputados().catch(() => []),
                    fetchSenadores().catch(() => []),
                    fetchGlobalVotacoes().catch(() => []), 
                    fetchPartidos().catch(() => [])
                ]);

                const mergedPoliticians = [...deps, ...sens].filter(Boolean);
                if (mergedPoliticians.length > 0) {
                    setPoliticians(mergedPoliticians);
                    hydrateMissingSexMetadata(mergedPoliticians, setPoliticians);
                } else {
                    setPoliticians(POLITICIANS_DB);
                }
                
                if (feeds && feeds.length > 0) setFeedItems(feeds);
                if (parts && parts.length > 0) setParties(parts);
                else setParties(getStaticParties());

                // 2. AI Content (Non-blocking, but part of init flow logic)
                generateEducationalContent().then(eduContent => {
                    if (eduContent && eduContent.length > 0) {
                        const mapArticleStyle = (index: number, topic: string) => {
                            const styles = [
                                { colorFrom: 'from-picture', colorTo: 'to-midnight', icon: 'Lightbulb', activeColor: 'bg-spring/20 text-picture' },
                                { colorFrom: 'from-nuit', colorTo: 'to-midnight', icon: 'Banknote', activeColor: 'bg-nuit/10 text-nuit' },
                                { colorFrom: 'from-lime-700', colorTo: 'to-green-900', icon: 'ScrollText', activeColor: 'bg-lime-900/20 text-lime-900 border border-lime-700' }, // FIXED: Darker Contrast
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
                                base = { colorFrom: 'from-amber-700', colorTo: 'to-orange-900', icon: 'ScrollText', activeColor: 'bg-amber-100 text-amber-900' }; // FIXED: Darker Contrast
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
                    }
                });

            } catch (err) {
                console.error("Critical Data Load Error:", err);
                setError("Falha ao carregar dados do Congresso.");
            } finally {
                // Minimum splash screen time for UX smoothness
                setTimeout(() => setIsLoading(false), 2000);
            }
        };

        loadAll();
    }, []);

    return { politicians, feedItems, parties, articles, isLoading, error, setPoliticians };
};

// --- Hook para Perfil Detalhado (Progressive Enrichment) ---
export const usePoliticianProfile = (initialCandidate: Politician | null) => {
    const [candidate, setCandidate] = useState<Politician | null>(initialCandidate);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string>("Carregando...");

    useEffect(() => {
        if (!initialCandidate) {
            setCandidate(null);
            return;
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

            const cacheKey = `paporeto_cache_v7_complete_pol_full_v2_${initialCandidate.id}`;
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < TTL_DYNAMIC) {
                        setCandidate(data);
                        setIsLoadingDetails(false);
                        return;
                    }
                }
            } catch {}

            try {
                const cachedGithub = await fetchCachedPoliticianProfile(initialCandidate.id);
                if (hasProfileCacheData(cachedGithub)) {
                    setCandidate(prev => prev ? { ...prev, ...cachedGithub } : (cachedGithub as Politician));
                    setIsLoadingDetails(false);
                    return;
                }
            } catch {}
            
            if (hasFullData || !initialCandidate.hasApiIntegration) {
                setIsLoadingDetails(false);
                return;
            }

            setIsLoadingDetails(true);
            setLoadingStatus("Identificando parlamentar...");
            
            try {
                // Step 1: Fast Enrich (Identity, Contact, Bio) - returns fast
                const fastData = await enrichPoliticianFast(initialCandidate);
                setCandidate(prev => prev ? { ...prev, ...fastData } : fastData);

                // Step 2: Deep Enrich (Votes, Expenses, History) - takes time
                // Pass callback to update status text
                const fullData = await enrichPoliticianData(fastData, (msg) => setLoadingStatus(msg));
                setCandidate(fullData);
            } catch (e) {
                console.error(`Error enriching profile for ${initialCandidate.name}`, e);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        loadDeepData();
    }, [initialCandidate?.id]); // Only re-run if the ID changes

    return { candidate, isLoadingDetails, loadingStatus };
};
