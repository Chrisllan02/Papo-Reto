
import React, { useState, useEffect } from 'react';
import { fetchDailyNews, getNewsSummary, getBestAvailableNews } from '../services/ai';
import { NewsArticle } from '../types';
import { Newspaper, ChevronRight, Loader2, Sparkles, ChevronUp, ExternalLink, Globe } from 'lucide-react';

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
    
    // Content State
    const [summary, setSummary] = useState<string | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Initial load effects
    useEffect(() => {
        // Sets summary for initial news if available
        if (news.length > 0 && news[0].summary) {
            setSummary(news[0].summary);
        }

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
                        // If user is looking at index 0, update summary
                        if (index === 0 && fresh[0]?.summary) {
                            setSummary(fresh[0].summary);
                        }
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

    // Update summary when index changes or expanded
    useEffect(() => {
        if (isExpanded && news[index]) {
            const current = news[index];
            
            // Se já veio pré-carregado no objeto, usa direto
            if (current.summary) {
                setSummary(current.summary);
                return;
            }

            // Fallback: Tenta buscar do cache individual ou gerar
            const fetchSummary = async () => {
                setLoadingSummary(true);
                const text = await getNewsSummary(current.title, current.source);
                setSummary(text);
                setLoadingSummary(false);
            };
            if (!summary) fetchSummary();
        }
    }, [isExpanded, index, news, summary]);

    // Reset summary when index changes (only if collapsed to clear prev state)
    useEffect(() => {
        if (!isExpanded) {
            // Pre-load next summary if available in object
            const nextSummary = news[index]?.summary;
            setSummary(nextSummary || null);
        }
    }, [index, isExpanded, news]);

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

    // Error handler for images
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null; 
        target.src = "https://images.unsplash.com/photo-1541872703-74c5e4436bb7?q=80&w=800&auto=format&fit=crop";
    };

    if (loading) {
        return (
            <div className="w-full h-48 bg-white/95 dark:bg-gray-900/50 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-gray-200 dark:border-gray-800 animate-pulse mb-6">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Loader2 className="animate-spin" size={14} /> Carregando Plantão...
                </div>
            </div>
        );
    }

    if (news.length === 0) return null;

    const currentNews = news[index];

    return (
        <section 
            className={`w-full relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.99] dark:bg-gray-900/[0.99] border border-white/50 dark:border-white/20 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-6 transition-all duration-500 ease-in-out group cursor-pointer ${isExpanded ? 'h-[550px] md:h-[500px]' : 'h-52 md:h-56 hover:shadow-2xl'}`}
            onMouseEnter={() => !isExpanded && setPaused(true)}
            onMouseLeave={() => !isExpanded && setPaused(false)}
            onClick={() => !isExpanded && handleToggleExpand()}
            aria-label="Destaque de notícia política"
        >
            {/* Content Container */}
            <div className={`flex h-full w-full ${isExpanded ? 'flex-col md:flex-row' : 'flex-row'}`}>
                
                {/* Image Section */}
                <div className={`shrink-0 relative bg-gray-200 dark:bg-gray-800 overflow-hidden transition-all duration-500 ${isExpanded ? 'w-full md:w-5/12 h-44 md:h-full' : 'w-28 md:w-5/12 h-full'}`}>
                    {/* Fallback */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <Newspaper size={40} aria-hidden="true" />
                    </div>

                    {currentNews.imageUrl && (
                        <img 
                            src={currentNews.imageUrl}
                            onError={handleImageError}
                            className={`w-full h-full object-cover transition-transform duration-700 relative z-10 ${!isExpanded ? 'group-hover:scale-110' : ''}`}
                            alt={`Imagem ilustrativa: ${currentNews.title}`}
                            decoding="async"
                        />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent z-20 pointer-events-none"></div>
                    
                    {/* Expanded Image Overlay */}
                    {isExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-30">
                             <div className="flex items-center gap-2 text-white/90 text-[10px] font-bold uppercase tracking-widest">
                                <span className="bg-blue-600 px-2 py-0.5 rounded-md">{currentNews.source}</span>
                                <span>{currentNews.time}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Text Section */}
                <div 
                    className="flex-1 flex flex-col px-4 py-3 md:px-8 md:py-6 min-w-0 relative overflow-hidden"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    
                    {!isExpanded && (
                        <div className="flex justify-between items-start mb-2 md:mb-3 animate-in fade-in">
                            <div className="flex flex-wrap items-center gap-2 opacity-80">
                                <span className="text-[9px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800 truncate max-w-[120px]">
                                    {currentNews.source}
                                </span>
                                <span className="text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full" aria-hidden="true"></span> {currentNews.time}
                                </span>
                            </div>
                            
                            {/* Fonte Button Direto no Card Compacto */}
                            <a 
                                href={currentNews.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors z-20"
                                title="Ir para fonte original"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Globe size={14} />
                            </a>
                        </div>
                    )}
                    
                    <div className="flex-1 flex flex-col justify-center">
                        <h3 className={`font-black text-gray-900 dark:text-white leading-snug md:leading-tight mb-2 md:mb-3 transition-all duration-300 ${isExpanded ? 'text-xl md:text-2xl mt-2' : 'text-base md:text-2xl line-clamp-4 md:line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                            {currentNews.title}
                        </h3>
                        
                        {isExpanded ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {loadingSummary ? (
                                    <div className="space-y-3 mt-2" aria-hidden="true">
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-full animate-pulse"></div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-5/6 animate-pulse"></div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-4/6 animate-pulse"></div>
                                    </div>
                                ) : (
                                    <div className="prose dark:prose-invert prose-sm">
                                        <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                            <Sparkles size={12} aria-hidden="true" /> Resumo IA
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed font-medium whitespace-pre-line">
                                            {summary}
                                        </p>
                                        
                                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                            <a 
                                                href={currentNews.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Matéria Completa <ExternalLink size={12} aria-hidden="true" />
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform duration-300 mt-1">
                                Expandir Resumo <ChevronRight size={12} aria-hidden="true" />
                            </p>
                        )}
                    </div>

                    {/* Progress Bar (Only when collapsed) */}
                    {!isExpanded && (
                        <div className="flex gap-1.5 mt-auto pt-3 md:pt-4" aria-hidden="true">
                            {news.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200 dark:bg-gray-700'}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Collapse Button (Only when expanded) */}
                    {isExpanded && (
                        <button 
                            onClick={(e) => handleToggleExpand(e)}
                            aria-label="Recolher resumo"
                            className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors z-20"
                        >
                            <ChevronUp size={20} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

export default NewsTicker;
