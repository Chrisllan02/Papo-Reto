
import React, { useState, useEffect } from 'react';
import { Newspaper, Activity, MapPin, LocateFixed, BookOpen, Lightbulb, Banknote, ScrollText, ArrowRight, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Politician } from '../types';
import NewsTicker from '../components/NewsTicker';
import OptimizedImage from '../components/OptimizedImage';

interface SectionHeaderProps {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    colorClass?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, subtitle, actionLabel, onAction, colorClass = "text-blue-600" }) => (
    <div className="flex items-end justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 ${colorClass}`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
        {actionLabel && onAction && (
            <button 
                onClick={onAction}
                className="group flex items-center gap-1 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
            >
                {actionLabel} <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform"/>
            </button>
        )}
    </div>
);

const EducationCarouselWidget = () => {
    const articles = useAppStore((state) => state.articles);
    const setSelectedEducationId = useAppStore((state) => state.setSelectedEducationId);
    
    const renderIcon = (iconName: string, size: number, className: string) => {
        switch(iconName) {
            case 'Banknote': return <Banknote size={size} className={className}/>;
            case 'ScrollText': return <ScrollText size={size} className={className}/>;
            default: return <Lightbulb size={size} className={className}/>;
        }
    };

    if (!articles || articles.length === 0) return null;

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <SectionHeader 
                icon={BookOpen} 
                title="Guia Cidadão" 
                subtitle="Aprenda como funciona" 
                colorClass="text-yellow-600 dark:text-yellow-400"
            />

            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory px-1 -mx-1">
                {articles.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => setSelectedEducationId(item.id)}
                        className="snap-center shrink-0 w-[280px] md:w-[320px] h-auto relative rounded-[2rem] overflow-hidden group transition-all hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm group-hover:shadow-xl transition-all duration-300 rounded-[2rem]"></div>
                        
                        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${item.colorFrom} ${item.colorTo}`}></div>

                        <div className="relative z-10 p-6 flex flex-col h-full justify-between text-left">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.colorFrom} ${item.colorTo} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                    {renderIcon(item.icon as string, 24, "drop-shadow-sm")}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                    {item.topic || 'Saber'}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors mt-3">
                                    Ler Artigo <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
};

const StateSpotlightWidget = () => {
    const politicians = useAppStore((state) => state.politicians);
    const setSelectedCandidate = useAppStore((state) => state.setSelectedCandidate);
    const setExploreFilterState = useAppStore((state) => state.setExploreFilterState);

    const [selectedState, setSelectedState] = useState<string>('');
    const [statePoliticians, setStatePoliticians] = useState<Politician[]>([]);
    const [isLocal, setIsLocal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!politicians || politicians.length === 0) return;

        const updateState = (uf: string) => {
            setSelectedState(uf);
            const filtered = politicians
                .filter(p => p.state === uf)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            setStatePoliticians(filtered);
        };

        const setRandomState = () => {
             const states = Array.from(new Set(politicians.map(p => p.state).filter((s): s is string => !!s)));
             if (states.length > 0) {
                const random = states[Math.floor(Math.random() * states.length)];
                updateState(random);
                setIsLocal(false);
             }
             setIsLoading(false);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
                        const data = (await response.json()) as { principalSubdivisionCode?: string };
                        const ufCode = data?.principalSubdivisionCode;
                        const uf: string | null = (typeof ufCode === 'string') ? ufCode.split('-')[1] : null;
                        
                        if (uf && politicians.some(p => p.state === uf)) {
                            updateState(uf);
                            setIsLocal(true);
                        } else {
                            setRandomState();
                        }
                    } catch (e) {
                        setRandomState();
                    } finally {
                        setIsLoading(false);
                    }
                },
                (error) => {
                    setRandomState();
                }
            );
        } else {
            setRandomState();
        }
    }, [politicians]);

    if (isLoading) return <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 rounded-[2rem] animate-pulse mb-8"></div>;
    if (statePoliticians.length === 0) return null;

    return (
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <SectionHeader 
                icon={isLocal ? LocateFixed : MapPin}
                title={selectedState}
                subtitle={isLocal ? 'Sua Bancada Regional' : 'Giro pelos Estados'}
                actionLabel="Ver Todos"
                onAction={() => setExploreFilterState(selectedState)}
                colorClass={isLocal ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}
            />

            <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x snap-mandatory px-1 -mx-1">
                {statePoliticians.map((pol) => (
                    <div 
                        key={pol.id} 
                        onClick={() => setSelectedCandidate(pol)}
                        className="snap-center shrink-0 w-32 md:w-36 bg-white dark:bg-gray-800 rounded-[1.5rem] p-4 flex flex-col items-center text-center shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
                    >
                        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-gray-200 to-white dark:from-gray-700 dark:to-gray-600 mb-3 relative group-hover:from-blue-500 group-hover:to-purple-500 transition-colors">
                            <OptimizedImage 
                                src={pol.photo} 
                                alt={pol.name} 
                                widthParam={100}
                                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-800" 
                            />
                        </div>
                        
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight mb-1 line-clamp-2 min-h-[2.5em]">
                            {pol.name}
                        </h3>
                        
                        <div className="mt-2 w-full">
                            <span className="block w-full py-1 bg-gray-50 dark:bg-gray-900 rounded-lg text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide border border-gray-100 dark:border-gray-700">
                                {pol.party}
                            </span>
                        </div>
                    </div>
                ))}
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
        <header className="flex flex-col gap-1 w-full mb-8 pt-safe">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-midnight dark:text-white tracking-tighter leading-none">
                {greeting}, Cidadão!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                Resumo diário da transparência política.
            </p>
        </header>
    );
};

const FeedView: React.FC = () => {
  return (
    <div id="main-content" className="w-full h-full bg-transparent font-sans flex flex-col">
        <div className="flex-1 overflow-hidden">
            <div className="h-full w-full overflow-y-auto pb-32 px-4 md:px-8 pt-4 md:pt-8 custom-scrollbar">
                <HeaderGreeting />
                <div className="space-y-12">
                    <div>
                        <SectionHeader 
                            icon={Newspaper} 
                            title="Destaques do Dia" 
                            subtitle="O que está acontecendo agora"
                            colorClass="text-red-600"
                        />
                        <NewsTicker />
                    </div>
                    <EducationCarouselWidget />
                    <StateSpotlightWidget />
                </div>
            </div>
        </div>
    </div>
  );
};

export default FeedView;
