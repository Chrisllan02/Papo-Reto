
import React, { useState, useEffect } from 'react';
import { fetchDailyNews, getBestAvailableNews } from '../services/ai';
import { NewsArticle } from '../types';
import { Loader2, ExternalLink, Globe, Gavel, TrendingUp, Users, Scale } from 'lucide-react';

const NewsTicker: React.FC = () => {
    const [news, setNews] = useState<NewsArticle[]>(() => {
        const cached = getBestAvailableNews();
        return cached || [];
    });
    
    const [loading, setLoading] = useState(() => news.length === 0);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const updateNews = async () => {
            try {
                // Background fetch
                const fresh = await fetchDailyNews();
                if (fresh && fresh.length > 0) {
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
        if (news.length === 0 || paused) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % news.length);
        }, 8000); 
        return () => clearInterval(interval);
    }, [news, paused]);

    const getTheme = (category: string) => {
        switch (category) {
            case 'economia':
                return { gradient: 'from-emerald-600 to-green-900', icon: TrendingUp, label: 'Economia' };
            case 'justica':
                return { gradient: 'from-violet-600 to-purple-900', icon: Gavel, label: 'Justiça' };
            case 'social':
                return { gradient: 'from-rose-500 to-pink-800', icon: Users, label: 'Social' };
            case 'mundo':
                return { gradient: 'from-sky-500 to-blue-800', icon: Globe, label: 'Mundo' };
            case 'politica':
            default:
                return { gradient: 'from-blue-600 to-indigo-900', icon: Scale, label: 'Política' };
        }
    };

    if (loading) {
        return (
            <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <Loader2 className="animate-spin" size={14} /> Carregando Destaques...
                </div>
            </div>
        );
    }

    if (news.length === 0) return null;

    const currentNews = news[index];
    const theme = getTheme(currentNews.category || 'politica');
    const ThemeIcon = theme.icon;

    return (
        <section 
            className="w-full relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/50 transition-all duration-500 group flex flex-col md:flex-row cursor-default h-auto min-h-[320px] md:h-80"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-label="Destaque de notícia política"
        >
            {/* LEFT SIDE: Big Typography Title - THE HERO */}
            <div className={`relative w-full md:w-1/2 bg-gradient-to-br ${theme.gradient} p-6 md:p-8 flex flex-col justify-between shrink-0 overflow-hidden`}>
                
                {/* Background Decor - Kept ONLY here for emphasis */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                
                {/* Header: Icon & Category */}
                <div className="relative z-10 flex justify-between items-start mb-4">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white shadow-lg">
                        <ThemeIcon size={28} />
                    </div>
                    <span className="text-[10px] font-black text-white/90 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                        {theme.label}
                    </span>
                </div>

                {/* THE BIG TITLE */}
                <div className="relative z-10 flex-1 flex items-center">
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-[1.1] tracking-tight drop-shadow-lg break-words hyphens-auto">
                        {currentNews.title}
                    </h3>
                </div>
                
                {/* Mobile: Dots inside gradient */}
                <div className="flex md:hidden gap-1.5 mt-4 relative z-10">
                    {news.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
                    ))}
                </div>
            </div>

            {/* RIGHT SIDE: Summary & Content - Clean & readable */}
            <div className="flex-1 flex flex-col p-6 md:p-8 bg-white dark:bg-gray-900 relative">
                
                {/* Metadata Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-wider">
                            {currentNews.source}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                            {currentNews.time}
                        </span>
                    </div>
                    {/* Desktop Dots */}
                    <div className="hidden md:flex gap-1.5">
                        {news.map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => setIndex(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-blue-300'}`}
                                aria-label={`Ir para notícia ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* THE SUMMARY CONTENT */}
                <div className="flex-1 relative flex flex-col">
                    <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                        <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
                            {currentNews.summary || "Resumo indisponível. Acesse a fonte oficial para mais detalhes."}
                        </p>
                    </div>
                    
                    {/* Footer Action */}
                    <div className="mt-auto pt-4 flex items-center justify-end gap-4">
                        <a 
                            href={currentNews.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all group/link border border-gray-200 dark:border-gray-700"
                        >
                            Fonte Oficial <ExternalLink size={12} className="group-hover/link:translate-x-0.5 transition-transform"/>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default NewsTicker;
