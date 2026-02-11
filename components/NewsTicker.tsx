
import React, { useState, useEffect } from 'react';
import { fetchDailyNews, getBestAvailableNews, getEmergencyNews } from '../services/ai';
import { NewsArticle } from '../types';
import { Sparkles, ExternalLink, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const NewsTicker: React.FC = () => {
    // 1. Initialize state immediately with cache OR emergency fallback.
    const [news, setNews] = useState<NewsArticle[]>(() => {
        const cached = getBestAvailableNews();
        if (cached && cached.length > 0) return cached;
        return getEmergencyNews();
    });
    
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    
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
        if (news.length === 0 || paused) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % news.length);
        }, 8000); // 8s rotation
        return () => clearInterval(interval);
    }, [news, paused]);

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

    const theme = getNewsTheme(currentNews.summary.context || "", currentNews.title);
    const ThemeIcon = theme.icon;

    return (
        <section 
            className={`w-full relative overflow-hidden rounded-[2.5rem] shadow-[0_15px_35px_-10px_rgba(0,0,0,0.3)] mb-6 transition-all duration-500 ease-in-out group h-[220px] md:h-64 hover:shadow-2xl hover:scale-[1.01]`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-label="Destaque de notícia política"
        >
            {/* Background Base */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-all duration-1000`}></div>
            
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            
            {/* Ambient Light */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none opacity-50"></div>

            <div className="relative z-10 p-5 md:p-8 flex flex-col h-full text-white">
                
                {/* Header: Source & Status */}
                <div className="flex justify-between items-start mb-2 md:mb-4">
                    <div className="flex items-center gap-2 animate-in fade-in">
                        <span className={`backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${theme.labelColor}`}>
                            <ThemeIcon size={12} /> {currentNews.source}
                        </span>
                        <span className="text-[10px] font-bold opacity-70 flex items-center gap-1 ml-2">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> {currentNews.time}
                        </span>
                    </div>
                    
                    <a 
                        href={currentNews.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-colors border border-white/10 shadow-sm hover:scale-105 transform duration-200"
                        title="Ler na fonte oficial"
                    >
                        Ver na Íntegra <ExternalLink size={10} />
                    </a>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col justify-start mt-2">
                    {/* Title */}
                    <h3 className="font-black leading-tight tracking-tight drop-shadow-md text-xl md:text-3xl mb-3 md:mb-4 line-clamp-3">
                        {currentNews.title}
                    </h3>
                    
                    {/* Summary (Structured Context + Main) */}
                    <div className="bg-white/10 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-start gap-3">
                            <Sparkles size={16} className="text-yellow-300 shrink-0 mt-0.5" />
                            <p className="text-sm font-medium leading-relaxed text-white/90 line-clamp-3 md:line-clamp-3">
                                {/* Contexto em Destaque */}
                                <strong className="text-white font-black uppercase tracking-wide text-xs bg-white/20 px-1.5 py-0.5 rounded mr-2">
                                    {currentNews.summary.context}
                                </strong>
                                {/* Texto Principal Limpo */}
                                {currentNews.summary.main}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pagination Dots */}
                <div className="mt-auto pt-4 flex gap-1.5 justify-center md:justify-start" aria-hidden="true">
                    {news.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${i === (index % news.length) ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'}`}
                            onClick={() => setIndex(i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default NewsTicker;
