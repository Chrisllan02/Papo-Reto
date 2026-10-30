
import React, { useState, useEffect } from 'react';
import { fetchDailyNews, getBestAvailableNews, getEmergencyNews } from '../services/ai';
import { NewsArticle } from '../types';
import { Sparkles, ExternalLink, AlertTriangle, CheckCircle2, Info, Pause, Play } from 'lucide-react';
import { safeHttpUrl } from '../utils/url';

const clampText = (text: string, maxLength: number) => {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength - 3).trim()}...`;
};

const NewsTicker: React.FC = () => {
    // 1. Initialize state immediately with cache OR emergency fallback.
    const [news, setNews] = useState<NewsArticle[]>(() => {
        const cached = getBestAvailableNews();
        if (cached && cached.length > 0) return cached;
        return getEmergencyNews();
    });
    
    const [index, setIndex] = useState(0);
    const [hoverPaused, setHoverPaused] = useState(false);
    const [focusPaused, setFocusPaused] = useState(false);
    const [userPaused, setUserPaused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(() =>
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false
    );
    const isRotating = !reducedMotion && !userPaused && !hoverPaused && !focusPaused;

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
        query.addEventListener('change', handleChange);
        return () => query.removeEventListener('change', handleChange);
    }, []);
    
    // 2. Background Fetch (Silent Update) & Polling
    useEffect(() => {
        const updateNews = async () => {
            try {
                const fresh = await fetchDailyNews();
                if (fresh && fresh.length > 0) {
                    // Verifica se houve mudança real para evitar re-render desnecessário
                    setNews((prev) => {
                        const isDifferent = fresh[0].id !== prev[0]?.id || fresh[0].time !== prev[0]?.time;
                        return isDifferent ? fresh : prev;
                    });
                }
            } catch (error) {
                console.error("Silent news update failed", error);
            }
        };

        updateNews(); // Initial fetch

        // Polling a cada 5 minutos (300.000ms)
        const pollInterval = setInterval(updateNews, 300000);

        return () => clearInterval(pollInterval);
    }, []);

    useEffect(() => {
        if (news.length < 2 || !isRotating) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % news.length);
        }, 8000); // 8s rotation
        return () => clearInterval(interval);
    }, [news, isRotating]);

    if (news.length === 0) return null;

    const currentNews = news[index % news.length];

    // Lógica de Cores Semânticas (Urgente vs Suave)
    const getNewsTheme = (context: string, title: string) => {
        const combined = (context + " " + title).toLowerCase();
        
        // Urgente / Negativo / Crítico
        if (combined.match(/(urgência|urgente|crise|denúncia|veto|rejeitado|polêmica|investigação|cassação|cpi|negada|recusada)/)) {
            return {
                gradient: 'from-red-900 to-orange-900',
                icon: AlertTriangle,
                labelColor: 'bg-red-500/20 text-red-100 border-red-500/30'
            };
        }
        
        // Positivo / Suave / Institucional
        if (combined.match(/(aprovado|sanção|educação|cultura|saúde|benefício|direitos|avança|conquista|mulher|piso)/)) {
            return {
                gradient: 'from-emerald-900 to-teal-900',
                icon: CheckCircle2,
                labelColor: 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30'
            };
        }

        // Neutro / Padrão
        return {
            gradient: 'from-blue-900 to-slate-900',
            icon: Info,
            labelColor: 'bg-blue-500/20 text-blue-100 border-blue-500/30'
        };
    };

    const theme = getNewsTheme(currentNews.summary?.context || "", currentNews.title);
    const ThemeIcon = theme.icon;
    const displayTitle = clampText(currentNews.title, 72);
    const displayContext = clampText(currentNews.summary?.context || currentNews.source || 'Atualização', 26);
    const displaySummary = clampText(currentNews.summary?.main ?? '', 170);
    const sourceUrl = safeHttpUrl(currentNews.url);

    return (
        <section 
            className={`w-full relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-[0_15px_35px_-10px_rgba(0,0,0,0.3)] mb-6 transition-all duration-500 ease-in-out group min-h-[300px] md:min-h-[330px] hover:shadow-2xl hover:scale-[1.005]`}
            onMouseEnter={() => setHoverPaused(true)}
            onMouseLeave={() => setHoverPaused(false)}
            onFocusCapture={() => setFocusPaused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusPaused(false);
            }}
            aria-label="Destaque de notícia política"
        >
            {/* Background Base */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-all duration-1000`}></div>
            
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-10 texture-overlay mix-blend-overlay"></div>
            
            {/* Ambient Light */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none opacity-50"></div>

            <div className="relative z-10 p-5 md:p-8 flex flex-col min-h-[300px] md:min-h-[330px] text-white">
                
                {/* Header: Source & Status */}
                <div className="flex justify-between items-start gap-3 mb-5">
                    <div className="flex items-center gap-2 animate-in fade-in">
                        <span className={`backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${theme.labelColor}`}>
                            <ThemeIcon size={12} aria-hidden="true" /> {currentNews.source}
                        </span>
                        <span className="text-[10px] font-bold opacity-70 flex items-center gap-1 ml-1 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> {currentNews.time}
                        </span>
                    </div>
                    
                    <div className="shrink-0 flex items-center gap-2">
                        {news.length > 1 && !reducedMotion && (
                            <button
                                type="button"
                                onClick={() => setUserPaused(prev => !prev)}
                                aria-pressed={userPaused}
                                aria-label={userPaused ? 'Retomar rotação das notícias' : 'Pausar rotação das notícias'}
                                className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white border border-white/10 shadow-sm transition-colors focus-visible:ring-4 focus-visible:ring-white/40"
                            >
                                {userPaused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
                            </button>
                        )}
                        {sourceUrl && (
                            <a 
                                href={sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-colors border border-white/10 shadow-sm hover:scale-105 transform duration-200"
                                title="Ler na fonte oficial"
                            >
                                <span className="hidden sm:inline">Ver na Íntegra</span>
                                <span className="sm:hidden sr-only">Ver na íntegra (abre em nova aba)</span>
                                <ExternalLink size={12} aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col justify-start" aria-live={isRotating ? 'off' : 'polite'}>
                    {/* Title */}
                    <h3 className="font-black leading-[1.05] tracking-tight drop-shadow-md text-3xl md:text-5xl mb-5 line-clamp-2 max-w-5xl">
                        {displayTitle}
                    </h3>
                    
                    {/* Summary (Structured Context + Main) */}
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-6xl">
                        <div className="grid grid-cols-[auto,1fr] gap-3">
                            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                                <Sparkles size={15} className="text-yellow-300" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <strong className="text-white font-black uppercase tracking-wide text-[10px] bg-white/20 px-2 py-1 rounded-lg max-w-full truncate">
                                        {displayContext}
                                    </strong>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">O que importa</span>
                                </div>
                                <p className="text-sm md:text-base font-semibold leading-relaxed text-white/90 line-clamp-3">
                                    {displaySummary}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pagination Dots */}
                <div className="mt-auto pt-4 flex gap-1.5 justify-center md:justify-start">
                    {news.map((item, i) => {
                        const isCurrent = i === (index % news.length);
                        return (
                            <button
                                key={`${item.id ?? "noticia"}-${i}`}
                                type="button"
                                onClick={() => setIndex(i)}
                                aria-label={`Notícia ${i + 1} de ${news.length}`}
                                aria-current={isCurrent ? 'true' : undefined}
                                className="group/dot py-2 rounded-full focus-visible:ring-4 focus-visible:ring-white/40"
                            >
                                <span className={`block h-1.5 rounded-full transition-all duration-500 ${isCurrent ? 'w-8 bg-white' : 'w-2 bg-white/30 group-hover/dot:bg-white/60'}`}></span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default NewsTicker;
