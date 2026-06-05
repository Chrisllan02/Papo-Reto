import React, { useState, useEffect, useRef } from 'react';
import { LocateFixed, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Politician } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { getIdeology } from '../services/camaraApi';

interface StateSpotlightWidgetProps {
    politicians: Politician[];
    onSelectCandidate: (p: Politician) => void;
    onGoToExplore: (state: string) => void;
}

const StateSpotlightWidget: React.FC<StateSpotlightWidgetProps> = ({ politicians, onSelectCandidate, onGoToExplore }) => {
    const { state: appState } = useAppContext();
    const { userLocation } = appState;
    
    const [selectedState, setSelectedState] = useState<string>('');
    const [statePoliticians, setStatePoliticians] = useState<Politician[]>([]);
    const [isLocal, setIsLocal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Referência para o container de scroll
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Função de scroll programático para desktop
    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = direction === 'left' ? -240 : 240; // Aprox. largura de um card + gap
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (!politicians || politicians.length === 0) return;

        const updateState = (uf: string, local: boolean) => {
            setSelectedState(uf);
            setIsLocal(local);
            const filtered = politicians
                .filter(p => p.state === uf)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            setStatePoliticians(filtered);
            setIsLoading(false);
        };

        if (userLocation) {
            if (politicians.some(p => p.state === userLocation)) {
                updateState(userLocation, true);
            } else {
                const states = Array.from(new Set(politicians.map(p => p.state).filter(Boolean))) as string[];
                if (states.length > 0) updateState(states[Math.floor(Math.random() * states.length)], false);
            }
        } else {
            const states = Array.from(new Set(politicians.map(p => p.state).filter(Boolean))) as string[];
            if (states.length > 0) {
                if (!selectedState) {
                    const random = states[Math.floor(Math.random() * states.length)];
                    updateState(random, false);
                } else {
                    setIsLoading(false);
                }
            }
        }
    }, [politicians, userLocation]);

    const getIdeologyStyle = (party: string) => {
        const ideology = getIdeology(party);
        if (ideology === 'Esquerda') {
            return {
                accent: 'bg-rose-500',
                dot: 'bg-rose-500',
                ring: 'border-rose-100 dark:border-rose-900/40',
                badge: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/25 dark:text-rose-200 dark:border-rose-800/50',
                glow: 'from-rose-500/10'
            };
        }
        if (ideology === 'Direita') {
            return {
                accent: 'bg-emerald-500',
                dot: 'bg-emerald-500',
                ring: 'border-emerald-100 dark:border-emerald-900/40',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-800/50',
                glow: 'from-emerald-500/10'
            };
        }
        return {
            accent: 'bg-amber-500',
            dot: 'bg-amber-500',
            ring: 'border-amber-100 dark:border-amber-900/40',
            badge: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-800/50',
            glow: 'from-amber-500/10'
        };
    };

    if (isLoading) return <div className="h-64 w-full glass-surface rounded-[2.5rem] animate-pulse mb-8"></div>;
    if (statePoliticians.length === 0) return null;

    return (
        <section className="mb-16 animate-in fade-in slide-in-from-bottom-8 duration-500 relative group/widget">
            <div className="absolute inset-0 glass-panel rounded-[3rem] -mx-4 md:mx-0 z-0"></div>

            <div className="relative z-10 p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-lg backdrop-blur-md ${isLocal ? 'bg-picture/90 text-white' : 'bg-spring/90 text-midnight'}`}>
                            {isLocal ? <LocateFixed size={22} /> : <MapPin size={22} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-midnight dark:text-white leading-none mb-1">
                                {selectedState}
                            </h2>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">
                                {isLocal ? 'Sua Bancada' : 'Giro pelos Estados'}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onGoToExplore(selectedState)}
                        className="px-5 py-2.5 glass-surface rounded-full text-xs font-black text-nuit dark:text-blue-400 uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                    >
                        Ver Todos
                    </button>
                </div>

                <div className="relative -mx-4 md:-mx-0 px-4 md:px-0 group/scroll">
                    
                    {/* Botão Scroll Esquerda (Desktop) */}
                    <button 
                        onClick={() => scroll('left')}
                        aria-label="Rolar para esquerda"
                        className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full glass-surface shadow-lg hover:scale-110 active:scale-95 transition-all text-midnight dark:text-white opacity-0 group-hover/scroll:opacity-100 duration-300"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {/* Container Scrollável */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto gap-4 py-5 pb-8 scrollbar-hide snap-x snap-mandatory px-1 scroll-smooth"
                    >
                        {statePoliticians.map((pol) => {
                            const ideology = getIdeology(pol.party);
                            const cardTheme = getIdeologyStyle(pol.party);
                            const isSenator = pol.role.toLowerCase().includes('senad');
                            
                            return (
                                <div 
                                    key={pol.id} 
                                    onClick={() => onSelectCandidate(pol)}
                                    className={`group/card relative snap-center shrink-0 w-52 md:w-56 min-h-[220px] overflow-hidden rounded-[1.75rem] border bg-white/90 p-5 text-center shadow-[0_16px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(15,23,42,0.16)] active:scale-[0.99] dark:bg-white/[0.06] dark:shadow-[0_18px_34px_rgba(0,0,0,0.45)] cursor-pointer ${cardTheme.ring}`}
                                >
                                    <div className={`absolute inset-x-0 top-0 h-1.5 ${cardTheme.accent}`} aria-hidden="true"></div>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${cardTheme.glow} via-transparent to-transparent opacity-80`} aria-hidden="true"></div>
                                    <div className="relative mx-auto mb-4 mt-2 h-24 w-24">
                                        <div className={`h-full w-full overflow-hidden rounded-full bg-slate-100 shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition-transform duration-300 group-hover/card:scale-[1.04] dark:bg-slate-800 ${isSenator ? 'border-[3px] border-amber-400 dark:border-amber-500 ring-4 ring-amber-400/20' : 'border-[4px] border-white dark:border-slate-700'}`}>
                                            <img src={pol.photo} alt={pol.name} className="w-full h-full object-cover" loading="lazy" />
                                        </div>
                                        {isSenator && (
                                            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white shadow-lg whitespace-nowrap">
                                                Senado
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="relative mb-3 min-h-[2.5em] text-sm font-black capitalize leading-tight text-midnight line-clamp-2 dark:text-white">{pol.name}</h3>
                                    
                                    <div className={`relative mx-auto inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 ${cardTheme.badge}`}>
                                        <div className={`h-2 w-2 rounded-full ${cardTheme.dot} shadow-sm`} title={`Ideologia: ${ideology}`}></div>
                                        <p className="text-xs font-bold uppercase">{pol.party}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Botão Scroll Direita (Desktop) */}
                    <button 
                        onClick={() => scroll('right')}
                        aria-label="Rolar para direita"
                        className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full glass-surface shadow-lg hover:scale-110 active:scale-95 transition-all text-midnight dark:text-white opacity-0 group-hover/scroll:opacity-100 duration-300"
                    >
                        <ChevronRight size={24} />
                    </button>

                </div>
            </div>
        </section>
    );
};

export default StateSpotlightWidget;
