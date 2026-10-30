import React, { useEffect, useMemo, useRef } from 'react';
import { Landmark, ArrowRight, Sparkles, CalendarDays, CheckCircle2, Clock3, ExternalLink, Target, Route } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { prefetchPoliticianProfile } from '../services/camaraApi';
import AudioPlayer from './AudioPlayer';
import { getCategoryIcon, formatCardTitle, getDidacticContext } from '../utils/legislativeTranslator';
import { buildActivityAudioScript } from '../utils/audioNarration';
import { getFeedTypeMeta } from '../utils/feedType';

interface FeedCardProps {
    item: FeedItem;
    politicians: Politician[];
    onClick: (item: FeedItem) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, politicians, onClick }) => {
    // Usa a categoria pré-calculada ou fallback para 'activity'
    const category = getCategoryIcon(item.category || 'activity');
    const politician = useMemo(() => (item.politicianId ? politicians.find(p => p.id === item.politicianId) ?? null : null), [item.politicianId, politicians]);
    const isExpense = item.type === 'despesa';
    const typeMeta = getFeedTypeMeta(item.type);
    const displayTitle = item.type === 'evento' && item.description
        ? formatCardTitle(item.title, item.type)
        : formatCardTitle(item.title, item.type);
    const displayDescription = item.summary || (item.type === 'evento' ? item.description : item.description);
    const statusTone = item.status === 'Aprovado'
        ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/40'
        : item.status === 'Rejeitado'
            ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'
            : item.status === 'Urgência'
                ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900/40'
                : 'bg-yellow-50 text-yellow-800 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-900/40';
    
    // Contexto Didático para uso no Card
    const didactic = useMemo(() => getDidacticContext(item.title, item.description, item.type), [item.title, item.description, item.type]);
    const audioScript = useMemo(() => buildActivityAudioScript(item, didactic.text, politician), [item, didactic.text, politician]);
    // Show snippet only if meaningful text exists and isn't just repetition
    const showSnippet = didactic.text && didactic.text.length > 10 && !didactic.text.startsWith(item.title.substring(0,20));
    const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handlePrefetch = () => {
        if (politician) {
            if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
            prefetchTimerRef.current = setTimeout(() => {
                if (typeof (window as any)?.requestIdleCallback === 'function') {
                    (window as any).requestIdleCallback(() => prefetchPoliticianProfile(politician));
                } else {
                    prefetchPoliticianProfile(politician);
                }
            }, 250);
        }
    };

    const cancelPrefetch = () => {
        if (prefetchTimerRef.current) {
            clearTimeout(prefetchTimerRef.current);
            prefetchTimerRef.current = null;
        }
    };

    useEffect(() => () => {
        if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    }, []);

    return (
        <article 
            onClick={() => onClick(item)}
            onMouseEnter={handlePrefetch}
            onMouseLeave={cancelPrefetch}
            onFocus={handlePrefetch}
            onBlur={cancelPrefetch}
            className="group relative glass-surface p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full justify-between border border-white/60 dark:border-white/10"
        >
            <div>
                <div className="flex justify-between items-start gap-3 mb-4 relative z-10">
                    <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${category.bg} ${category.color} text-[11px] font-black uppercase tracking-wider`}>
                            <category.icon size={14} aria-hidden="true" />
                            {category.label}
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${typeMeta.chipClass}`}>
                            <typeMeta.Icon size={12} aria-hidden="true" />
                            {typeMeta.label}
                        </div>
                    </div>
                    {item.date && (
                        <span className="shrink-0 text-xs font-bold text-subtle flex items-center gap-1.5">
                            <CalendarDays size={13} aria-hidden="true" />
                            {item.date}
                        </span>
                    )}
                </div>

                <h3 className="text-lg md:text-xl font-black text-midnight dark:text-white leading-tight mb-3 group-hover:text-nuit dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClick(item); }}
                        className="text-left rounded-md focus-visible:ring-4 focus-visible:ring-blue-500/40"
                    >
                        {displayTitle}
                    </button>
                </h3>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {item.status && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${statusTone}`}>
                            {item.status === 'Tramitação' ? <Clock3 size={12} aria-hidden="true" /> : <CheckCircle2 size={12} aria-hidden="true" />}
                            {item.status}
                        </span>
                    )}
                    {item.sourceUrl && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-wider">
                            <ExternalLink size={12} aria-hidden="true" />
                            Fonte oficial
                        </span>
                    )}
                </div>

                {displayDescription && !isExpense && (
                    <p className="text-sm text-muted-strong font-medium leading-relaxed line-clamp-2 mb-4">
                        {displayDescription}
                    </p>
                )}

                {item.whyItMatters && !isExpense && (
                    <div className="flex items-start gap-2 mb-3 bg-blue-50/80 dark:bg-blue-900/15 p-3 rounded-xl border border-blue-100/80 dark:border-blue-900/25">
                        <Target size={13} className="text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-300 mb-0.5">Por que importa</p>
                            <p className="text-[11px] font-bold text-blue-800 dark:text-blue-100 leading-tight line-clamp-2">
                                {item.whyItMatters}
                            </p>
                        </div>
                    </div>
                )}

                {item.nextStep && !isExpense && (
                    <div className="flex items-start gap-2 mb-3 bg-slate-50/90 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/10">
                        <Route size={13} className="text-slate-500 dark:text-slate-300 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 mb-0.5">Próximo passo</p>
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-100 leading-tight line-clamp-2">
                                {item.nextStep}
                            </p>
                        </div>
                    </div>
                )}

                {/* Fallback para itens antigos salvos em cache local */}
                {showSnippet && !item.summary && !item.whyItMatters && !isExpense && (
                    <div className="flex items-start gap-2 mb-3 bg-blue-50/70 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100/70 dark:border-blue-900/20">
                        <Sparkles size={12} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 leading-tight line-clamp-2">
                            {didactic.text}
                        </p>
                    </div>
                )}

                {isExpense && item.amount && (
                    <div className="mb-4">
                        <p className="text-3xl font-black text-midnight dark:text-white tracking-tighter">{item.amount}</p>
                        <p className="text-xs text-subtle uppercase font-bold truncate tracking-wide">{item.provider}</p>
                    </div>
                )}

            </div>

            {politician ? (
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 mt-auto">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={politician.photo} className="w-10 h-10 rounded-full object-cover border border-white dark:border-gray-700 shadow-sm" alt="" loading="lazy" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-midnight dark:text-white truncate">{politician.name}</p>
                            <p className="text-xs font-bold text-subtle uppercase tracking-wide">{politician.party} • {politician.state}</p>
                        </div>
                    </div>
                    {/* Audio Button on Card */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <AudioPlayer text={audioScript} isDarkText={false} compact={true} />
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 mt-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <Landmark size={18} className="text-subtle" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-xs font-bold text-subtle uppercase tracking-widest truncate">
                                {item.organ || 'Congresso Nacional'}
                            </span>
                            {item.location && (
                                <span className="block text-[10px] font-bold text-subtle truncate">
                                    {item.location}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Audio Button on Card */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <AudioPlayer text={audioScript} isDarkText={false} compact={true} />
                    </div>
                </div>
            )}
            
            {/* Hover Action Arrow (Hidden on Touch/Mobile usually, visible on desktop hover) */}
            <div aria-hidden="true" className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 hidden md:block">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-subtle flex items-center justify-center">
                    <ArrowRight size={14} />
                </div>
            </div>
        </article>
    );
};

export default FeedCard;
