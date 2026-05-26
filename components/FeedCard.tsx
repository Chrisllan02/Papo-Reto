import React, { useRef } from 'react';
import { Landmark, ArrowRight, Sparkles, CalendarDays, CheckCircle2, Clock3, ExternalLink, Radio } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { prefetchPoliticianProfile } from '../services/camaraApi';
import AudioPlayer from './AudioPlayer';
import { getCategoryIcon, formatCardTitle, getDidacticContext } from '../utils/legislativeTranslator';

interface FeedCardProps {
    item: FeedItem;
    politicians: Politician[];
    onClick: (item: FeedItem) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, politicians, onClick }) => {
    // Usa a categoria pré-calculada ou fallback para 'activity'
    const category = getCategoryIcon(item.category || 'activity');
    const politician = item.candidateId ? politicians.find(p => p.id === item.candidateId) : null;
    const isExpense = item.type === 'despesa';
    const typeLabel = item.type === 'evento' ? 'Evento' : item.type === 'despesa' ? 'Despesa' : item.type === 'educacao' ? 'Educação' : 'Votação';
    const displayTitle = item.type === 'evento' && item.description
        ? formatCardTitle(item.description, item.type)
        : formatCardTitle(item.title, item.type);
    const displayDescription = item.type === 'evento' ? '' : item.description;
    const statusTone = item.status === 'Aprovado'
        ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/40'
        : item.status === 'Rejeitado'
            ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'
            : item.status === 'Urgência'
                ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900/40'
                : 'bg-yellow-50 text-yellow-800 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-900/40';
    
    // Contexto Didático para uso no Card
    const didactic = getDidacticContext(item.title, item.description, item.type);
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
                            <category.icon size={14} />
                            {category.label}
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100/70 dark:bg-white/5 text-gray-500 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider">
                            <Radio size={12} />
                            {typeLabel}
                        </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-subtle flex items-center gap-1.5">
                        <CalendarDays size={13} />
                        {item.date}
                    </span>
                </div>

                <h3 className="text-lg md:text-xl font-black text-midnight dark:text-white leading-tight mb-3 group-hover:text-nuit dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {displayTitle}
                </h3>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {item.status && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${statusTone}`}>
                            {item.status === 'Tramitação' ? <Clock3 size={12} /> : <CheckCircle2 size={12} />}
                            {item.status}
                        </span>
                    )}
                    {item.sourceUrl && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-wider">
                            <ExternalLink size={12} />
                            Fonte oficial
                        </span>
                    )}
                </div>

                {/* Micro-Tradução Exposta */}
                {showSnippet && !isExpense && (
                    <div className="flex items-start gap-2 mb-3 bg-blue-50/70 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100/70 dark:border-blue-900/20">
                        <Sparkles size={12} className="text-blue-500 shrink-0 mt-0.5" />
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

                {!isExpense && displayDescription && (
                    <p className="text-sm text-muted font-medium leading-relaxed line-clamp-3 mb-5">
                        {displayDescription}
                    </p>
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
                        <AudioPlayer text={`${item.title}. ${didactic.text}`} isDarkText={false} compact={true} />
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 mt-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <Landmark size={18} className="text-subtle"/>
                        </div>
                        <span className="text-xs font-bold text-subtle uppercase tracking-widest">Congresso Nacional</span>
                    </div>
                    {/* Audio Button on Card */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <AudioPlayer text={`${item.title}. ${didactic.text}`} isDarkText={false} compact={true} />
                    </div>
                </div>
            )}
            
            {/* Hover Action Arrow (Hidden on Touch/Mobile usually, visible on desktop hover) */}
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 hidden md:block">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-subtle flex items-center justify-center">
                    <ArrowRight size={14} />
                </div>
            </div>
        </article>
    );
};

export default FeedCard;
