import React, { useState, useMemo, useEffect } from 'react';
import { Activity, RotateCcw } from 'lucide-react';
import { FeedCategory, FeedItem, Politician } from '../types';
import { prefetchPoliticianProfile } from '../services/camaraApi';
import NewsTicker from '../components/NewsTicker';
import FeedDetailModal from '../components/FeedDetailModal';
import StateSpotlightWidget from '../components/StateSpotlightWidget';
import FeedCard from '../components/FeedCard';
import DataState from '../components/DataState';
import { getCategoryIcon } from '../utils/legislativeTranslator';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  onSelectCandidate: (pol: Politician) => void;
  onSeeMore: () => void;
  onGoToExplore: (state: string) => void;
}

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, onSelectCandidate, onSeeMore, onGoToExplore }) => {
    const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<FeedCategory | 'all'>('all');

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return 'Bom dia';
        if (h >= 12 && h < 18) return 'Boa tarde';
        return 'Boa noite';
    }, []);

    const spotlightCandidates = useMemo(() => politicians.slice(0, 6), [politicians]);
    const categoryOptions = useMemo(() => {
        const counts = feedItems.reduce((acc, item) => {
            const category = item.category || 'activity';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<FeedCategory, number>);

        return (Object.entries(counts) as Array<[FeedCategory, number]>)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([id, count]) => ({ id, count, meta: getCategoryIcon(id) }));
    }, [feedItems]);
    const filteredFeedItems = useMemo(() => {
        if (selectedCategory === 'all') return feedItems;
        return feedItems.filter(item => (item.category || 'activity') === selectedCategory);
    }, [feedItems, selectedCategory]);

    useEffect(() => {
        if (spotlightCandidates.length === 0) return;
        if (typeof (window as any)?.requestIdleCallback === 'function') {
            (window as any).requestIdleCallback(() => {
                spotlightCandidates.forEach((pol) => prefetchPoliticianProfile(pol));
            });
        } else {
            setTimeout(() => {
                spotlightCandidates.forEach((pol) => prefetchPoliticianProfile(pol));
            }, 0);
        }
    }, [spotlightCandidates]);

    return (
        <div className="w-full h-full bg-transparent font-sans overflow-y-auto pb-24 md:pb-12 animate-in fade-in duration-500">
            {selectedFeedItem && (
                <FeedDetailModal 
                    item={selectedFeedItem} 
                    politician={politicians.find(p => p.id === selectedFeedItem.candidateId)}
                    onClose={() => setSelectedFeedItem(null)}
                    onGoToProfile={onSelectCandidate}
                />
            )}

            <div className="pt-safe px-4 md:px-8 py-8 md:py-10 max-w-[2000px] mx-auto">
                
                {/* Header */}
                <header className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-nuit to-blue-500 dark:from-white dark:to-blue-300">
                                {greeting}, Cidadão
                            </span>
                        </h1>
                        <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400">
                            Fiscalização em tempo real do Congresso.
                        </p>
                    </div>
                </header>

                {/* News Ticker */}
                <NewsTicker />

                {/* State Spotlight */}
                <StateSpotlightWidget politicians={politicians} onSelectCandidate={onSelectCandidate} onGoToExplore={onGoToExplore} />

                {/* Main Feed */}
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-midnight dark:text-white flex items-center gap-2.5">
                                <Activity size={24} className="text-nuit dark:text-blue-400"/>
                                Últimas Atividades
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                                Filtre por tema para entender rapidamente onde o Congresso está atuando.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedCategory !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/15 active:scale-95 transition-all"
                                    aria-label="Limpar filtro"
                                    title="Limpar filtro"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                            {feedItems.length > 0 && (
                                <button onClick={onSeeMore} className="h-10 px-4 rounded-xl text-xs font-black text-blue-700 dark:text-blue-200 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/25 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    Ver histórico
                                </button>
                            )}
                        </div>
                    </div>

                    {categoryOptions.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2" aria-label="Filtrar atividades por tema">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('all')}
                                className={`shrink-0 px-4 h-11 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                                    selectedCategory === 'all'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 dark:bg-blue-500/20 dark:text-blue-100 dark:border-blue-400/50'
                                        : 'bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
                                }`}
                            >
                                Todos <span className="ml-1 opacity-70">{feedItems.length}</span>
                            </button>
                            {categoryOptions.map(({ id, count, meta }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setSelectedCategory(id)}
                                    className={`shrink-0 px-3 h-11 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 ${
                                        selectedCategory === id
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                                            : 'bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
                                    }`}
                                >
                                    <meta.icon size={15} />
                                    {meta.label}
                                    <span className="opacity-70">{count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {feedItems.length === 0 ? (
                        <DataState
                            title="Sem atividades recentes"
                            description="Nao encontramos movimentacoes novas para exibir agora. Voce ainda pode explorar parlamentares, partidos e conteudos educativos."
                            actionLabel="Explorar politicos"
                            onAction={() => onGoToExplore('')}
                        />
                    ) : filteredFeedItems.length === 0 ? (
                        <DataState
                            title="Nenhuma atividade neste filtro"
                            description="Troque o tema ou limpe o filtro para ver todas as movimentacoes recentes."
                            actionLabel="Ver todos"
                            onAction={() => setSelectedCategory('all')}
                        />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            {filteredFeedItems.slice(0, 6).map((item) => (
                                <FeedCard 
                                    key={item.id} 
                                    item={item} 
                                    politicians={politicians} 
                                    onClick={setSelectedFeedItem} 
                                />
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default FeedView;
