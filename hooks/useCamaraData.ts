
import { useState, useEffect, useCallback } from 'react';
import { Politician, FeedItem, Party, EducationalArticle } from '../types';
import { 
    fetchDeputados, 
    fetchSenadores, 
    fetchGlobalVotacoes, 
    fetchPartidos, 
    enrichPoliticianFast, 
    enrichPoliticianData,
    getStaticParties,
    TTL_DYNAMIC,
    fetchCachedPoliticianProfile
} from '../services/camaraApi';
import { generateEducationalContent } from '../services/ai';
import { POLITICIANS_DB, FEED_ITEMS, EDUCATION_CAROUSEL } from '../constants';

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
                if (cachedGithub && (cachedGithub.detailedExpenses || cachedGithub.expensesBreakdown || cachedGithub.votingHistory || cachedGithub.fronts)) {
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
