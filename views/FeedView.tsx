
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Newspaper, Activity, MapPin, LocateFixed, BookOpen, Lightbulb, Banknote, ScrollText, ArrowRight } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { speakContent } from '../services/ai';
import NewsTicker from '../components/NewsTicker';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: any[];
  onSelectCandidate: (pol: Politician) => void;
  onEducationClick: (id: number) => void;
  onGoToExplore: (state: string) => void;
}

const EducationCarouselWidget = ({ articles, onEducationClick }: { articles: any[], onEducationClick: (id: number) => void }) => {
    
    // Helper para renderizar o ícone correto
    const renderIcon = (iconName: string, size: number, className: string) => {
        switch(iconName) {
            case 'Banknote': return <Banknote size={size} className={className}/>;
            case 'ScrollText': return <ScrollText size={size} className={className}/>;
            default: return <Lightbulb size={size} className={className}/>;
        }
    };

    if (!articles || articles.length === 0) return null;

    return (
        <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="mb-4 flex items-center justify-between px-1 opacity-90">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-700/30">
                        <BookOpen size={14} />
                    </div>
                    <h2 className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                        Guia Cidadão
                    </h2>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory px-4 -mx-4 md:mx-0 md:px-1">
                {articles.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => onEducationClick(item.id)}
                        className="snap-center shrink-0 w-[85vw] sm:w-[45vw] md:w-[340px] lg:w-[400px] h-48 md:h-56 relative rounded-[2rem] overflow-hidden group shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:shadow-xl transition-all active:scale-95"
                    >
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.colorFrom} ${item.colorTo} transition-transform duration-500 group-hover:scale-105`}></div>
                        
                        {/* Texture Overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none"></div>

                        <div className="relative z-10 p-5 md:p-7 flex flex-col h-full justify-between text-left">
                            <div className="flex justify-between items-start">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-sm border border-white/20`}>
                                    {renderIcon(item.icon, 20, "drop-shadow-sm md:scale-110")}
                                </div>
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/80 bg-black/10 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                                    {item.topic || 'Saber'}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-lg md:text-2xl font-black text-white leading-tight mb-2 drop-shadow-md line-clamp-2">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                                    Ler Agora <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
};

const StateSpotlightWidget = ({ politicians, onSelectCandidate, onGoToExplore }: { politicians: Politician[], onSelectCandidate: (p: Politician) => void, onGoToExplore: (state: string) => void }) => {
    const [selectedState, setSelectedState] = useState<string>('');
    const [statePoliticians, setStatePoliticians] = useState<Politician[]>([]);
    const [isLocal, setIsLocal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!politicians || politicians.length === 0) return;

        const setRandomState = () => {
             const states = Array.from(new Set(politicians.map(p => p.state).filter(Boolean)));
             if (states.length > 0) {
                const random = states[Math.floor(Math.random() * states.length)];
                updateState(random);
                setIsLocal(false);
             }
             setIsLoading(false);
        };

        const updateState = (uf: string) => {
            setSelectedState(uf);
            const filtered = politicians
                .filter(p => p.state === uf)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            setStatePoliticians(filtered);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
                        const data = await response.json();
                        const uf = data.principalSubdivisionCode ? data.principalSubdivisionCode.split('-')[1] : null;
                        
                        if (uf && politicians.some(p => p.state === uf)) {
                            updateState(uf);
                            setIsLocal(true);
                        } else {
                            setRandomState();
                        }
                    } catch (e) {
                        console.error("Erro na geolocalização:", e);
                        setRandomState();
                    } finally {
                        setIsLoading(false);
                    }
                },
                (error) => {
                    console.log("Geolocalização negada ou indisponível:", error);
                    setRandomState();
                }
            );
        } else {
            setRandomState();
        }
    }, [politicians]);

    if (isLoading) return <div className="h-48 w-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-md rounded-[2.5rem] animate-pulse mb-8 border border-white/10"></div>;
    if (statePoliticians.length === 0) return null;

    return (
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-500 relative">
            <div className="absolute inset-0 bg-white/95 dark:bg-midnight/40 backdrop-blur-3xl rounded-[3rem] -mx-4 md:mx-0 z-0 border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_60px_rgba(0,0,0,0.5)]"></div>

            <div className="relative z-10 p-4 md:p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl shadow-lg backdrop-blur-md ${isLocal ? 'bg-picture/90 text-white' : 'bg-spring/90 text-midnight'}`}>
                            {isLocal ? <LocateFixed size={20} /> : <MapPin size={20} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-midnight dark:text-white leading-none">
                                {selectedState}
                            </h2>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                {isLocal ? 'Sua Bancada' : 'Giro pelos Estados'}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onGoToExplore(selectedState)}
                        className="px-4 py-2 bg-white/60 dark:bg-midnight/80 backdrop-blur-xl rounded-full text-[10px] font-black text-nuit dark:text-blue-400 uppercase tracking-widest shadow-sm border border-white/30 dark:border-white/10 active:scale-95 transition-all hover:bg-white/80 dark:hover:bg-gray-800/80"
                    >
                        Ver Todos
                    </button>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory px-1">
                    {statePoliticians.map((pol) => (
                        <div 
                            key={pol.id} 
                            onClick={() => onSelectCandidate(pol)}
                            className="snap-center shrink-0 w-36 bg-white/95 dark:bg-midnight/90 backdrop-blur-xl rounded-[2rem] p-4 flex flex-col items-center text-center shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/20 dark:border-white/10 cursor-pointer hover:scale-[1.03] hover:bg-white dark:hover:bg-midnight hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nuit to-midnight opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-gray-200 to-white dark:from-gray-700 dark:to-gray-800 mb-3 shadow-inner relative group-hover:from-nuit group-hover:to-midnight transition-colors">
                                <img src={pol.photo} alt={pol.name} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-900" loading="lazy" decoding="async" />
                            </div>
                            
                            <h3 className="text-xs font-black text-midnight dark:text-white leading-tight mb-1 line-clamp-2 min-h-[2.5em]">
                                {pol.name}
                            </h3>
                            
                            <div className="mt-2 w-full">
                                <span className="block w-full py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide border border-gray-100/50 dark:border-white/10 group-hover:bg-nuit/10 group-hover:text-nuit dark:group-hover:bg-nuit/20 dark:group-hover:text-blue-400 transition-colors">
                                    {pol.party}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const HeaderGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Olá';

    if (hour >= 5 && hour < 12) greeting = 'Bom dia';
    else if (hour >= 12 && hour < 18) {
        greeting = 'Boa tarde';
    } else {
        greeting = 'Boa noite';
    }

    return (
        <header className="flex items-center justify-between gap-4 w-full mb-6 pt-safe">
            <div className="min-w-0">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-midnight to-nuit dark:from-white dark:to-blue-300 tracking-tighter truncate leading-tight py-1 drop-shadow-sm">
                    {greeting}, Cidadão!
                </h1>
            </div>
        </header>
    );
};

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, articles, onSelectCandidate, onEducationClick, onGoToExplore }) => {
  return (
    <div id="main-content" className="w-full h-full bg-transparent font-sans flex flex-col">
        <div className="flex-1 overflow-hidden">
            <div className="h-full w-full overflow-y-auto pb-32 px-4 md:px-8 pt-4 md:pt-8 custom-scrollbar">
                
                <HeaderGreeting />

                {/* 1: DESTAQUE DO DIA */}
                <div className="mb-8">
                    <div className="mb-3 flex items-center gap-2 px-1 opacity-80">
                        <div className="p-1.5 bg-red-100/50 dark:bg-red-900/30 rounded-lg text-red-600 backdrop-blur-sm">
                            <Newspaper size={14} />
                        </div>
                        <h2 className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                            Destaques do Dia
                        </h2>
                    </div>
                    <NewsTicker />
                </div>

                {/* 2: CARROSSEL GUIA CIDADÃO (RESPONSIVO) */}
                <EducationCarouselWidget articles={articles} onEducationClick={onEducationClick} />

                {/* 3: SUA BANCADA */}
                <StateSpotlightWidget politicians={politicians} onSelectCandidate={onSelectCandidate} onGoToExplore={onGoToExplore} />

            </div>
        </div>
    </div>
  );
};

export default FeedView;
