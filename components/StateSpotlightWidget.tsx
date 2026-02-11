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

    // Função auxiliar para cor do card
    const getIdeologyStyle = (party: string) => {
        const ideology = getIdeology(party);
        if (ideology === 'Esquerda') return 'bg-rose-50/80 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800';
        if (ideology === 'Direita') return 'bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800';
        return 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
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
                        className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory px-1 scroll-smooth"
                    >
                        {statePoliticians.map((pol) => {
                            const ideology = getIdeology(pol.party);
                            const cardStyle = getIdeologyStyle(pol.party);
                            const isSenator = pol.role.toLowerCase().includes('senad');
                            
                            // Configuração do Indicador Visual (Barra Lateral + Dot)
                            let indicatorBorder = 'border-l-amber-400';
                            let dotColor = 'bg-amber-500';
                            
                            if (ideology === 'Esquerda') {
                                indicatorBorder = 'border-l-rose-500';
                                dotColor = 'bg-rose-500';
                            } else if (ideology === 'Direita') {
                                indicatorBorder = 'border-l-indigo-500';
                                dotColor = 'bg-indigo-500';
                            }
                            
                            return (
                                <div 
                                    key={pol.id} 
                                    onClick={() => onSelectCandidate(pol)}
                                    className={`snap-center shrink-0 w-56 rounded-[2.2rem] p-5 flex flex-col items-center text-center shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] border cursor-pointer hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 border-l-[6px] ${indicatorBorder} ${cardStyle}`}
                                >
                                    <div className="relative w-24 h-24 mb-4">
                                        <div className={`w-full h-full rounded-full overflow-hidden shadow-md ${isSenator ? 'border-[3px] border-yellow-400 dark:border-yellow-500 ring-4 ring-yellow-400/20' : 'border-[3px] border-white/50 dark:border-gray-600'}`}>
                                            <img src={pol.photo} alt={pol.name} className="w-full h-full object-cover" loading="lazy" />
                                        </div>
                                        {isSenator && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg tracking-widest border border-white/20 z-10 whitespace-nowrap">
                                                Senado
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-black text-midnight dark:text-white leading-tight mb-2 line-clamp-2 min-h-[2.5em]">{pol.name}</h3>
                                    
                                    <div className="flex items-center gap-2 bg-white/40 dark:bg-white/5 px-3 py-1 rounded-md border border-white/20">
                                        <div className={`w-2 h-2 rounded-full ${dotColor} shadow-sm`} title={`Ideologia: ${ideology}`}></div>
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{pol.party}</p>
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