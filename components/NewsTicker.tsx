import React, { useState, useEffect } from 'react';
import { fetchDailyNews, getBestAvailableNews } from '../services/ai';
import { NewsArticle } from '../types';
import { ChevronRight, Loader2, Sparkles, ChevronUp, ExternalLink, Globe } from 'lucide-react';

const GRADIENTS = [
    'from-blue-900 to-slate-900',
    'from-emerald-900 to-slate-900',
    'from-rose-900 to-slate-900',
    'from-amber-900 to-slate-900',
    'from-indigo-900 to-slate-900',
    'from-teal-900 to-slate-900'
];

const NewsTicker: React.FC = () => {
    // 1. Init state with best available news (Sync from LocalStorage) to avoid flash
    const [news, setNews] = useState<NewsArticle[]>(() => {
        const cached = getBestAvailableNews();
        return cached || [];
    });
    
    // Loading only true if absolutely no news available
    const [loading, setLoading] = useState(() => news.length === 0);
    
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Initial load effects
    useEffect(() => {
        const updateNews = async () => {
            try {
                // Background fetch for fresh news
                // fetchDailyNews handles TTL checks internally
                const fresh = await fetchDailyNews();
                
                if (fresh && fresh.length > 0) {
                    // Update only if different to prevent unnecessary renders
                    // Simple check on first title
                    if (fresh[0].title !== news[0]?.title) {
                        setNews(fresh);
                    }
                }
            } catch (error) {
                console.error("Background news update failed", error);
            } finally {
                setLoading(false);
            }
        };
        
        updateNews();
    }, []);

    useEffect(() => {
        if (news.length === 0 || paused || isExpanded) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % news.length);
        }, 8000); // 8s rotation
        return () => clearInterval(interval);
    }, [news, paused, isExpanded]);

    const handleToggleExpand = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        
        if (isExpanded) {
            setIsExpanded(false);
            setPaused(false);
        } else {
            setIsExpanded(true);
            setPaused(true);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-48 bg-white/95 dark:bg-gray-900/50 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-gray-200 dark:border-gray-800 animate-pulse mb-6">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Loader2 className="animate-spin" size={14} /> Carregando Plantão...
                </div>
            </div>
        );
    }

    if (news.length === 0) return null;

    const currentNews = news[index];
    const gradientColors = GRADIENTS[index % GRADIENTS.length];

    return (
        <section 
            className={`w-full relative overflow-hidden rounded-[2.5rem] shadow-[0_15px_35px_-10px_rgba(0,0,0,0.3)] mb-6 transition-all duration-500 ease-in-out group cursor-pointer ${isExpanded ? 'h-[500px]' : 'h-52 md:h-56 hover:shadow-2xl hover:scale-[1.01]'}`}
            onMouseEnter={() => !isExpanded && setPaused(true)}
            onMouseLeave={() => !isExpanded && setPaused(false)}
            onClick={() => !isExpanded && handleToggleExpand()}
            aria-label="Destaque de notícia política"
        >
            {/* Dynamic Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientColors} transition-all duration-1000`}></div>
            
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            
            {/* Ambient Light Effect */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none opacity-50"></div>

            {/* Content Container */}
            <div className="relative z-10 p-6 md:p-8 flex flex-col h-full text-white">
                
                {/* Header: Source & Time */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 animate-in fade-in">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-sm">
                            {currentNews.source}
                        </span>
                        <span className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                            <span className="w-1 h-1 bg-white rounded-full"></span> {currentNews.time}
                        </span>
                    </div>
                    
                    {/* Direct Link Button (Collapsed) */}
                    {!isExpanded && (
                       <a 
                            href={currentNews.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title="Fonte Original"
                       >
                           <Globe size={16} />
                       </a>
                    )}
                </div>

                {/* Main Title */}
                <div className={`flex-1 flex flex-col justify-center transition-all duration-500 ${isExpanded ? 'justify-start mt-2' : ''}`}>
                    <h3 className={`font-black leading-tight tracking-tight drop-shadow-md transition-all duration-500 ${isExpanded ? 'text-2xl md:text-4xl mb-4' : 'text-xl md:text-3xl line-clamp-3'}`}>
                        {currentNews.title}
                    </h3>
                    
                    {/* Expand Hint (Collapsed) */}
                    {!isExpanded && (
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1 group-hover:opacity-100 transition-opacity group-hover:translate-x-1 duration-300">
                            Ler Resumo <ChevronRight size={12}/>
                        </p>
                    )}
                </div>

                {/* Summary Section (Expanded) */}
                {isExpanded && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 overflow-y-auto custom-scrollbar pr-2 mb-2">
                        <div className="prose prose-invert prose-sm">
                            <div className="flex items-center gap-2 mb-2 text-white/80 text-[10px] font-black uppercase tracking-widest">
                                <Sparkles size={12} aria-hidden="true" /> Resumo
                            </div>
                            <p className="text-white/90 text-sm leading-relaxed font-medium whitespace-pre-line">
                                {currentNews.summary || "Resumo não disponível."}
                            </p>
                            
                            <div className="mt-6 pt-4 border-t border-white/20 flex items-center gap-3">
                                <a 
                                    href={currentNews.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Matéria Completa <ExternalLink size={12} aria-hidden="true" />
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Controls (Collapsed) */}
                {!isExpanded && (
                    <div className="mt-auto pt-4 flex gap-1.5" aria-hidden="true">
                        {news.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} 
                            />
                        ))}
                    </div>
                )}

                {/* Collapse Button (Expanded) */}
                {isExpanded && (
                    <button 
                        onClick={(e) => handleToggleExpand(e)}
                        aria-label="Recolher resumo"
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-colors z-20"
                    >
                        <ChevronUp size={20} aria-hidden="true" />
                    </button>
                )}
            </div>
        </section>
    );
};

export default NewsTicker;