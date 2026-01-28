
import { useState, useEffect, useCallback } from 'react';
import { Politician, FeedItem, Party } from '../types';
import { 
    fetchDeputados, 
    fetchSenadores, 
    fetchGlobalVotacoes, 
    fetchPartidos, 
    enrichPoliticianFast, 
    enrichPoliticianData,
    getStaticParties
} from '../services/camaraApi';
import { generateEducationalContent } from '../services/ai';
import { POLITICIANS_DB, FEED_ITEMS, EDUCATION_CAROUSEL } from '../constants';

// --- Hook para Carga Inicial do App (Big Bang Load) ---
export const useInitialData = () => {
    const [politicians, setPoliticians] = useState<Politician[]>(POLITICIANS_DB);
    const [feedItems, setFeedItems] = useState<FeedItem[]>(FEED_ITEMS);
    const [parties, setParties] = useState<Party[]>(getStaticParties());
    const [articles, setArticles] = useState<any[]>(EDUCATION_CAROUSEL); // Mantendo tipo any[] compatível com AppContext
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAll = async () => {
            try {
                // 1. Core Data (Parallel)
                const [deps, sens, feeds, parts] = await Promise.all([
                    fetchDeputados(),
                    fetchSenadores(),
                    fetchGlobalVotacoes().catch(() => []), 
                    fetchPartidos()
                ]);

                setPoliticians([...deps, ...sens]);
                
                if (feeds && feeds.length > 0) setFeedItems(feeds);
                setParties(parts);

                // 2. AI Content (Non-blocking, but part of init flow logic)
                generateEducationalContent().then(eduContent => {
                    if (eduContent && eduContent.length > 0) {
                        const mapArticleStyle = (index: number, topic: string) => {
                            const styles = [
                                { colorFrom: 'from-picture', colorTo: 'to-midnight', icon: 'Lightbulb', activeColor: 'bg-spring/20 text-picture' },
                                { colorFrom: 'from-nuit', colorTo: 'to-midnight', icon: 'Banknote', activeColor: 'bg-nuit/10 text-nuit' },
                                { colorFrom: 'from-spring', colorTo: 'to-mantis', icon: 'ScrollText', activeColor: 'bg-praxeti text-midnight border border-spring' },
                                { colorFrom: 'from-midnight', colorTo: 'to-black', icon: 'Lightbulb', activeColor: 'bg-praxeti text-midnight' },
                                { colorFrom: 'from-nuit', colorTo: 'to-blue-900', icon: 'Banknote', activeColor: 'bg-blue-50 text-nuit' },
                                { colorFrom: 'from-picture', colorTo: 'to-green-900', icon: 'ScrollText', activeColor: 'bg-green-50 text-picture' }
                            ];
                            let base = styles[index % styles.length];
                            let icon = base.icon;
                            const t = topic ? topic.toLowerCase() : '';
                            if (t.includes('orçamento') || t.includes('dinheiro') || t.includes('fundo') || t.includes('gasto')) icon = 'Banknote';
                            if (t.includes('lei') || t.includes('pec') || t.includes('pl') || t.includes('constituição')) icon = 'ScrollText';
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
            const hasFullData = initialCandidate.expensesBreakdown && initialCandidate.expensesBreakdown.length > 0;
            
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
