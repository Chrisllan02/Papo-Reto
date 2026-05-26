import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Database, Landmark, Newspaper } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { prefetchPoliticianProfile } from '../services/camaraApi';
import NewsTicker from '../components/NewsTicker';
import FeedDetailModal from '../components/FeedDetailModal';
import StateSpotlightWidget from '../components/StateSpotlightWidget';
import FeedCard from '../components/FeedCard';
import DataState from '../components/DataState';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  onSelectCandidate: (pol: Politician) => void;
  onSeeMore: () => void;
  onGoToExplore: (state: string) => void;
}

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, onSelectCandidate, onSeeMore, onGoToExplore }) => {
    const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return 'Bom dia';
        if (h >= 12 && h < 18) return 'Boa tarde';
        return 'Boa noite';
    }, []);

    const spotlightCandidates = useMemo(() => politicians.slice(0, 6), [politicians]);
    const deputiesCount = useMemo(() => politicians.filter(pol => pol.hasApiIntegration !== false).length, [politicians]);
    const senatorsCount = Math.max(0, politicians.length - deputiesCount);

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

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8" aria-label="Resumo dos dados carregados">
                    <div className="glass-surface rounded-2xl px-4 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 flex items-center justify-center">
                            <Landmark size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-subtle">Parlamentares</p>
                            <p className="text-lg font-black text-midnight dark:text-white">{politicians.length}</p>
                        </div>
                    </div>
                    <div className="glass-surface rounded-2xl px-4 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-200 flex items-center justify-center">
                            <Newspaper size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-subtle">Atividades</p>
                            <p className="text-lg font-black text-midnight dark:text-white">{feedItems.length}</p>
                        </div>
                    </div>
                    <div className="glass-surface rounded-2xl px-4 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 flex items-center justify-center">
                            <Database size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-subtle">Fontes</p>
                            <p className="text-lg font-black text-midnight dark:text-white">{deputiesCount > 0 ? 'Câmara' : 'Cache'}{senatorsCount > 0 ? ' + Senado' : ''}</p>
                        </div>
                    </div>
                </section>

                {/* News Ticker */}
                <NewsTicker />

                {/* State Spotlight */}
                <StateSpotlightWidget politicians={politicians} onSelectCandidate={onSelectCandidate} onGoToExplore={onGoToExplore} />

                {/* Main Feed */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black text-midnight dark:text-white flex items-center gap-2.5">
                            <Activity size={24} className="text-nuit dark:text-blue-400"/>
                            Últimas Atividades
                        </h2>
                        {feedItems.length > 0 && (
                            <button onClick={onSeeMore} className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider hover:underline px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">
                                Ver Histórico
                            </button>
                        )}
                    </div>

                    {feedItems.length === 0 ? (
                        <DataState
                            title="Sem atividades recentes"
                            description="Nao encontramos movimentacoes novas para exibir agora. Voce ainda pode explorar parlamentares, partidos e conteudos educativos."
                            actionLabel="Explorar politicos"
                            onAction={() => onGoToExplore('')}
                        />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            {feedItems.slice(0, 6).map((item) => (
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
