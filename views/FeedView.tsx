import React, { useState, useMemo } from 'react';
import { Activity, Coffee } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import NewsTicker from '../components/NewsTicker';
import FeedDetailModal from '../components/FeedDetailModal';
import StateSpotlightWidget from '../components/StateSpotlightWidget';
import FeedCard from '../components/FeedCard';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: any[];
  onSelectCandidate: (pol: Politician) => void;
  onEducationClick: (id: number) => void;
  onSeeMore: () => void;
  onGoToExplore: (state: string) => void;
}

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, articles, onSelectCandidate, onEducationClick, onSeeMore, onGoToExplore }) => {
    const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return 'Bom dia';
        if (h >= 12 && h < 18) return 'Boa tarde';
        return 'Boa noite';
    }, []);

    return (
        <div className="w-full h-full bg-transparent font-sans overflow-y-auto pb-32 animate-in fade-in duration-500">
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
                        // Empty State Amigável
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center opacity-60">
                            <div className="bg-white/50 dark:bg-white/10 p-6 rounded-full mb-4 animate-pulse">
                                <Coffee size={48} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-black text-gray-600 dark:text-gray-300 mb-2">Tudo calmo em Brasília...</h3>
                            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                                Nenhuma atividade recente registrada nas últimas horas. Aproveite a pausa!
                            </p>
                        </div>
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