import React, { useState, useMemo, useEffect } from 'react';
import { Activity, CalendarClock, DatabaseZap, MapPinned, RotateCcw, TrendingUp } from 'lucide-react';
import { FeedCategory, FeedItem, Politician } from '../types';
import { prefetchPoliticianProfile } from '../services/camaraApi';
import { useAppContext } from '../contexts/AppContext';
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

const parseFeedDate = (date?: string) => {
    if (!date) return null;
    const [day, month, year] = date.split('/').map(Number);
    if (!day || !month || !year) return null;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatUpdateLabel = (date?: string) => {
    const parsed = parseFeedDate(date);
    if (!parsed) return 'Usando último dado confiável';
    return `Atualizado em ${parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
};

const formatShortDate = (date?: string) => {
    const parsed = parseFeedDate(date);
    if (!parsed) return '';
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, onSelectCandidate, onSeeMore, onGoToExplore }) => {
    const { state: appState, actions } = useAppContext();
    const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<FeedCategory | 'all'>('all');
    const userLocation = appState.userLocation;

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
    const muralSummary = useMemo(() => {
        const byDateDesc = [...feedItems]
            .sort((a, b) => (parseFeedDate(b.date)?.getTime() || 0) - (parseFeedDate(a.date)?.getTime() || 0));
        const latestItem = byDateDesc[0];
        const topCategory = categoryOptions.find(option => option.id !== 'activity') || categoryOptions[0];
        const priorityItem = [...feedItems]
            .sort((a, b) => (b.priority || 0) - (a.priority || 0) || (parseFeedDate(b.date)?.getTime() || 0) - (parseFeedDate(a.date)?.getTime() || 0))[0];
        const localPoliticians = userLocation
            ? politicians.filter(pol => pol.state === userLocation)
            : [];
        const politicianById = new Map(politicians.map(pol => [pol.id, pol]));
        const localFeedItems = userLocation
            ? feedItems.filter(item => item.candidateId && politicianById.get(item.candidateId)?.state === userLocation)
            : [];
        const eventsCount = feedItems.filter(item => item.type === 'evento').length;
        const votesCount = feedItems.filter(item => item.type === 'voto').length;
        const officialSourceCount = feedItems.filter(item => item.sourceUrl).length;
        const datedCount = feedItems.filter(item => Boolean(parseFeedDate(item.date))).length;

        return {
            latestLabel: formatUpdateLabel(latestItem?.date),
            latestDate: latestItem?.date,
            topCategory,
            priorityItem,
            priorityDateLabel: formatShortDate(priorityItem?.date),
            localPoliticiansCount: localPoliticians.length,
            localActivityCount: localFeedItems.length,
            localSample: localFeedItems[0],
            eventsCount,
            votesCount,
            officialSourceCount,
            datedCount,
        };
    }, [categoryOptions, feedItems, politicians, userLocation]);

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

                <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4" aria-label="Resumo do Mural">
                    <button
                        type="button"
                        onClick={() => muralSummary.priorityItem ? setSelectedFeedItem(muralSummary.priorityItem) : onSeeMore()}
                        className="glass-surface rounded-2xl p-4 border border-white/60 dark:border-white/10 text-left hover:shadow-lg active:scale-[0.99] transition-all focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-none"
                    >
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-3">
                            <CalendarClock size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Acompanhar agora</span>
                        </div>
                        <p className="text-lg font-black text-midnight dark:text-white leading-tight line-clamp-2">
                            {muralSummary.priorityItem?.title || 'Sem pauta prioritária'}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                            {muralSummary.priorityDateLabel
                                ? `${muralSummary.priorityDateLabel} · ${muralSummary.priorityItem?.type === 'evento' ? 'agenda pública' : 'tramitação'}`
                                : `${muralSummary.eventsCount} eventos e ${muralSummary.votesCount} movimentações no radar.`}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => muralSummary.topCategory && setSelectedCategory(muralSummary.topCategory.id)}
                        className="glass-surface rounded-2xl p-4 border border-white/60 dark:border-white/10 text-left hover:shadow-lg active:scale-[0.99] transition-all focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-none"
                    >
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-3">
                            <TrendingUp size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Tema concreto</span>
                        </div>
                        <p className="text-xl font-black text-midnight dark:text-white leading-tight">
                            {muralSummary.topCategory?.meta.label || 'Congresso'}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                            {muralSummary.topCategory?.id === 'activity'
                                ? 'Sem tema específico dominante. Veja o histórico para separar pauta genérica de pauta substantiva.'
                                : `${muralSummary.topCategory?.count || 0} registros com tema identificável. Clique para filtrar.`}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => userLocation ? onGoToExplore(userLocation) : actions.detectLocation()}
                        className="glass-surface rounded-2xl p-4 border border-white/60 dark:border-white/10 text-left hover:shadow-lg active:scale-[0.99] transition-all focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-none"
                    >
                        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-3">
                            <MapPinned size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Recorte local</span>
                        </div>
                        <p className="text-xl font-black text-midnight dark:text-white leading-tight">
                            {userLocation ? `Bancada de ${userLocation}` : 'Definir estado'}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                            {userLocation && muralSummary.localActivityCount > 0
                                ? `${muralSummary.localActivityCount} atividades nominais. Exemplo: ${muralSummary.localSample?.title || 'atividade recente'}.`
                                : userLocation
                                    ? `${muralSummary.localPoliticiansCount} parlamentares. Nenhuma atividade nominal recente vinculada; abra a bancada para fiscalizar nomes.`
                                : 'Use sua localização para priorizar sua bancada.'}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={onSeeMore}
                        className="glass-surface rounded-2xl p-4 border border-white/60 dark:border-white/10 text-left hover:shadow-lg active:scale-[0.99] transition-all focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-none"
                    >
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-3">
                            <DatabaseZap size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Confiabilidade</span>
                        </div>
                        <p className="text-lg font-black text-midnight dark:text-white leading-tight">{muralSummary.latestLabel}</p>
                        <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                            {muralSummary.officialSourceCount}/{feedItems.length} itens com fonte oficial e {muralSummary.datedCount} com data validada. Ver histórico.
                        </p>
                    </button>
                </section>

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
