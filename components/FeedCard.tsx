import React, { useEffect, useMemo, useRef } from 'react';
import { Landmark, ArrowRight, Sparkles, CalendarDays, CheckCircle2, Clock3, ExternalLink } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { prefetchPoliticianProfile } from '../services/camaraApi';
import AudioPlayer from './AudioPlayer';
import { getCategoryIcon, formatCardTitle, getDidacticContext } from '../utils/legislativeTranslator';
import { buildActivityAudioScript } from '../utils/audioNarration';
import { getFeedTypeMeta } from '../utils/feedType';
import { feedCode, isRedundantText, isUnknownPlace, resolveFeedTitle } from '../utils/feedText';
import { safeHttpUrl } from '../utils/url';

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
    const resolvedTitle = resolveFeedTitle(item.title, item.description);
    const code = feedCode(item.title, item.description);
    const displayTitle = formatCardTitle(resolvedTitle, item.type);
    const rawDescription = item.summary || item.description;
    const displayDescription = rawDescription
        && !isRedundantText(resolvedTitle, rawDescription)
        && !isRedundantText(displayTitle, rawDescription)
        ? rawDescription
        : undefined;
    const sourceUrl = safeHttpUrl(item.sourceUrl);
    const statusTone = item.status === 'Aprovado'
        ? 'text-green-700 dark:text-green-300'
        : item.status === 'Rejeitado'
            ? 'text-red-700 dark:text-red-300'
            : item.status === 'Urgência'
                ? 'text-orange-700 dark:text-orange-300'
                : 'text-slate-600 dark:text-slate-300';
    const place = isUnknownPlace(item.location) ? undefined : item.location;
    const hasContext = Boolean(item.whyItMatters || item.nextStep) && !isExpense;

    const didactic = useMemo(() => getDidacticContext(item.title, item.description, item.type), [item.title, item.description, item.type]);
    const audioScript = useMemo(() => buildActivityAudioScript(item, didactic.text, politician), [item, didactic.text, politician]);
    const showSnippet = didactic.text && didactic.text.length > 10 && !isRedundantText(resolvedTitle, didactic.text);
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
            className="group relative glass-surface p-4 md:p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer overflow-hidden flex flex-col h-full justify-between border border-white/60 dark:border-white/10"
        >
            <div>
                <div className="flex justify-between items-start gap-4 mb-4 relative z-10">
                    <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${category.bg} ${category.color} text-xs font-semibold`}>
                            <category.icon size={14} aria-hidden="true" />
                            {category.label}
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${typeMeta.chipClass}`}>
                            <typeMeta.Icon size={14} aria-hidden="true" />
                            {typeMeta.label}
                        </div>
                    </div>
                    {item.date && (
                        <span className="shrink-0 text-xs font-medium text-subtle flex items-center gap-1.5">
                            <CalendarDays size={14} aria-hidden="true" />
                            {item.date}
                        </span>
                    )}
                </div>

                <h3 className="text-lg md:text-xl font-black text-midnight dark:text-white leading-snug mb-2 break-words group-hover:text-nuit dark:group-hover:text-blue-400 transition-colors line-clamp-3">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClick(item); }}
                        className="text-left rounded-md focus-visible:ring-4 focus-visible:ring-blue-500/40"
                    >
                        {displayTitle}
                    </button>
                </h3>

                {(item.status || sourceUrl || code) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs font-medium">
                        {item.status && (
                            <span className={`inline-flex items-center gap-1.5 ${statusTone}`}>
                                {item.status === 'Tramitação' ? <Clock3 size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                                {item.status}
                            </span>
                        )}
                        {code && <span className="text-subtle">{code}</span>}
                        {sourceUrl && (
                            <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded text-blue-700 dark:text-blue-300 underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40"
                            >
                                Fonte oficial
                                <ExternalLink size={12} aria-hidden="true" />
                                <span className="sr-only">(abre em nova aba)</span>
                            </a>
                        )}
                    </div>
                )}

                {displayDescription && !isExpense && (
                    <p className="text-sm text-muted-strong font-medium leading-relaxed line-clamp-3 mb-4">
                        {displayDescription}
                    </p>
                )}

                {hasContext && (
                    <dl className="mb-4 space-y-1 rounded-xl bg-slate-900/[0.03] dark:bg-white/5 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.whyItMatters && (
                            <div className="flex gap-2">
                                <dt className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">Por que importa</dt>
                                <dd className="line-clamp-2">{item.whyItMatters}</dd>
                            </div>
                        )}
                        {item.nextStep && (
                            <div className="flex gap-2">
                                <dt className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">Próximo passo</dt>
                                <dd className="line-clamp-2">{item.nextStep}</dd>
                            </div>
                        )}
                    </dl>
                )}

                {showSnippet && !item.summary && !item.whyItMatters && !isExpense && (
                    <div className="flex items-start gap-2 mb-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="line-clamp-2">{didactic.text}</p>
                    </div>
                )}

                {isExpense && item.amount && (
                    <div className="mb-4">
                        <p className="text-3xl font-black text-midnight dark:text-white tracking-tighter">{item.amount}</p>
                        <p className="text-xs text-subtle font-semibold truncate">{item.provider}</p>
                    </div>
                )}

            </div>

            {politician ? (
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-white/10 relative z-10 mt-auto">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={politician.photo} className="w-10 h-10 rounded-full object-cover border border-white dark:border-gray-700 shadow-sm" alt="" loading="lazy" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-midnight dark:text-white truncate">{politician.name}</p>
                            <p className="text-xs font-semibold text-subtle">{politician.party} • {politician.state}</p>
                        </div>
                    </div>
                    {/* Audio Button on Card */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <AudioPlayer text={audioScript} isDarkText={false} compact={true} />
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-white/10 relative z-10 mt-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <Landmark size={18} className="text-subtle" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-xs font-semibold text-subtle truncate">
                                {item.organ || 'Congresso Nacional'}
                            </span>
                            {place && (
                                <span className="block text-xs font-medium text-subtle truncate">
                                    {place}
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
