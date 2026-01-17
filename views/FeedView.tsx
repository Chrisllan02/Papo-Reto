
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lightbulb, 
  Banknote, 
  Landmark, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ThumbsUp,
  Frown,
  AlertOctagon,
  Filter,
  Gavel,
  Receipt,
  Newspaper,
  Calendar,
  Heart,
  Clock,
  MapPin,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { Politician, FeedItem, LegislativeEvent } from '../types';
import { SkeletonFeedItem } from '../components/Skeleton';
import { EDUCATION_CAROUSEL } from '../constants';
import { fetchAgendaCamara, formatPartyName } from '../services/camaraApi';
import { getSearchContext } from '../services/ai';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  onSelectCandidate: (pol: Politician) => void;
  onEducationClick: (id: number) => void;
  onSeeMore: () => void;
  followingIds?: number[]; 
}

interface CardProps {
  item: FeedItem;
  candidate?: Politician | null;
  onSelectCandidate: (p: Politician) => void;
}

// --- MODAL DE EXPLICAÇÃO DA IA ---
const ExplainModal = ({ title, onClose }: { title: string, onClose: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [explanation, setExplanation] = useState<string>('');

    useEffect(() => {
        const fetchExplanation = async () => {
            const context = await getSearchContext(`Explique de forma didática e simples (para um jovem de 18 anos) o que significa esta votação/gasto político no Brasil: "${title}". Resuma em 2 frases curtas o impacto prático.`);
            if (context) {
                setExplanation(context.text);
            } else {
                setExplanation("Não foi possível gerar uma explicação simplificada no momento. Tente novamente mais tarde.");
            }
            setLoading(false);
        };
        fetchExplanation();
    }, [title]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] max-w-sm w-full shadow-2xl relative border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-400 font-black uppercase tracking-wider text-xs">
                    <Sparkles size={16} /> Tradutor Político (IA)
                </div>
                
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 size={32} className="text-purple-500 animate-spin mb-2"/>
                        <p className="text-xs font-bold text-gray-400">Traduzindo do "Juridiquês"...</p>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm font-medium mb-6">
                            {explanation}
                        </p>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl font-bold text-purple-700 dark:text-purple-300 text-sm hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                        >
                            Entendi
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

// --- HEADER INSTITUCIONAL ---
const DashboardHeader = () => {
    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    
    return (
        <div className="mb-8 mt-2 px-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Calendar size={14}/> {today}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                        Mural da <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">República</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-2 text-base md:text-lg max-w-2xl leading-relaxed">
                        Acompanhe em tempo real as votações e gastos. Sem filtros, direto da fonte.
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- REACTION BAR ---
const ReactionBar = ({ item }: { item: FeedItem }) => {
    const [counts, setCounts] = useState(item.reactions || { support: 0, angry: 0, clown: 0 });
    const [active, setActive] = useState<string | null>(null);

    const handleReact = (type: 'support' | 'angry' | 'clown', e: React.MouseEvent) => {
        e.stopPropagation();
        if (active === type) {
            setCounts(prev => ({ ...prev, [type]: prev[type] - 1 }));
            setActive(null);
        } else {
            setCounts(prev => ({
                ...prev,
                [type]: prev[type] + 1,
                ...(active ? { [active]: prev[active as keyof typeof prev] - 1 } : {})
            }));
            setActive(type);
        }
    };

    return (
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex gap-2 w-full">
                <button 
                    onClick={(e) => handleReact('support', e)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${active === 'support' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}
                >
                    <ThumbsUp size={16} className={active === 'support' ? 'fill-current' : ''} /> 
                    <span>{counts.support}</span>
                </button>
                <button 
                    onClick={(e) => handleReact('angry', e)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${active === 'angry' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}
                >
                    <AlertOctagon size={16} className={active === 'angry' ? 'fill-current' : ''} />
                    <span>{counts.angry}</span>
                </button>
                <button 
                    onClick={(e) => handleReact('clown', e)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${active === 'clown' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}
                >
                    <Frown size={16} className={active === 'clown' ? 'fill-current' : ''} />
                    <span>{counts.clown}</span>
                </button>
            </div>
        </div>
    );
};

// --- VOTE CARD ---
const VoteCard: React.FC<CardProps> = ({ item, candidate, onSelectCandidate }) => {
    const [showExplain, setShowExplain] = useState(false);
    const isApproved = item.status === 'Aprovado';
    const isRejected = item.status === 'Rejeitado';
    
    const statusColor = isApproved ? 'bg-green-600' : isRejected ? 'bg-red-600' : 'bg-gray-600';
    const borderColor = isApproved ? 'border-green-200 dark:border-green-900/30' : isRejected ? 'border-red-200 dark:border-red-900/30' : 'border-gray-200 dark:border-gray-800';

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-[2.5rem] border ${borderColor} p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col h-full`}>
            
            {showExplain && <ExplainModal title={item.description || item.title} onClose={() => setShowExplain(false)} />}

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                        <Gavel size={20}/>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Atividade</p>
                        <p className="text-xs font-bold text-gray-500">Plenário</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowExplain(true); }}
                        className="flex items-center gap-1 text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-full hover:scale-105 transition-transform"
                        title="Traduzir com IA"
                    >
                        <Sparkles size={12}/> Traduzir
                    </button>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full">{item.date}</span>
                </div>
            </div>

            {/* Content */}
            <div className="mb-6 flex-1">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight mb-3 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-3">
                    {item.title}
                </h3>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 font-medium leading-relaxed line-clamp-4">
                    {item.description}
                </p>
            </div>

            {/* Status */}
            {item.status && (
                <div className="mb-6">
                    <span className={`${statusColor} text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-md`}>
                        {isApproved ? <ThumbsUp size={14}/> : isRejected ? <Frown size={14}/> : <Landmark size={14}/>}
                        {item.status}
                    </span>
                </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => candidate && onSelectCandidate(candidate)}
                >
                    {candidate ? (
                        <>
                            <img src={candidate.photo} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" alt=""/>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{candidate.name}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{formatPartyName(candidate.party)} • {candidate.state}</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500"><Landmark size={20}/></div>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Mesa Diretora</span>
                        </div>
                    )}
                </div>
            </div>

            <ReactionBar item={item} />
        </div>
    );
};

// --- EXPENSE CARD ---
const ExpenseCard: React.FC<CardProps> = ({ item, candidate, onSelectCandidate }) => {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 p-0 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
            <div className="h-1.5 bg-blue-600 w-full"></div>
            
            <div className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600">
                        <Receipt size={20} />
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor da Nota</span>
                        <span className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">{item.amount}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição do Gasto</p>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-tight border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-1">
                        {item.title}
                    </h3>
                    {item.provider && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Fornecedor:</span>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate max-w-[200px]">
                                {item.provider}
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-auto flex items-center gap-3 cursor-pointer p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => candidate && onSelectCandidate(candidate)}>
                    {candidate ? (
                        <>
                            <img src={candidate.photo} className="w-10 h-10 rounded-full grayscale object-cover" alt=""/>
                            <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Pago por</p>
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{candidate.name}</p>
                            </div>
                        </>
                    ) : (
                        <span className="text-xs font-mono text-gray-500">CÂMARA DOS DEPUTADOS</span>
                    )}
                </div>
            </div>

            <div className="px-6 md:px-8 pb-6">
                <ReactionBar item={item} />
            </div>
        </div>
    );
};

// --- GENERIC CARD ---
const GenericCard: React.FC<{ item: FeedItem }> = ({ item }) => (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-4 text-gray-400">
            <Newspaper size={18}/>
            <span className="text-xs font-bold uppercase tracking-wider">Informativo</span>
        </div>
        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{item.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
        <ReactionBar item={item} />
    </div>
);

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, onSelectCandidate, onEducationClick, onSeeMore, followingIds = [] }) => {
  const [activeFilter, setActiveFilter] = useState<'todos' | 'voto' | 'despesa' | 'seguindo'>('todos');
  const [eduIndex, setEduIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  
  // State Agenda
  const [agenda, setAgenda] = useState<LegislativeEvent[]>([]);

  useEffect(() => {
    const loadAgenda = async () => {
        const events = await fetchAgendaCamara();
        setAgenda(events);
    };
    loadAgenda();
  }, []);

  const MAX_INITIAL_ITEMS = 8; 

  // Lógica do Carrossel Automático
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
        setEduIndex((prev) => (prev + 1) % EDUCATION_CAROUSEL.length);
    }, 6000); 
    return () => clearInterval(timer);
  }, [paused]);

  const nextSlide = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEduIndex((prev) => (prev + 1) % EDUCATION_CAROUSEL.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEduIndex((prev) => (prev - 1 + EDUCATION_CAROUSEL.length) % EDUCATION_CAROUSEL.length);
  };

  const filteredItems = useMemo(() => {
      let items = feedItems;
      
      // Filtro Seguindo
      if (activeFilter === 'seguindo') {
          if (followingIds.length === 0) return [];
          items = items.filter(item => item.candidateId && followingIds.includes(item.candidateId));
      } 
      else if (activeFilter !== 'todos') {
          items = items.filter(item => item.type === activeFilter);
      }

      return items.slice(0, MAX_INITIAL_ITEMS);
  }, [feedItems, activeFilter, followingIds]);

  const currentEdu = EDUCATION_CAROUSEL[eduIndex];
  
  const getEduTheme = (idx: number) => {
      if (idx % 3 === 0) return { from: 'from-green-700', to: 'to-green-900', shadow: 'shadow-green-900/20' }; 
      if (idx % 3 === 1) return { from: 'from-blue-700', to: 'to-blue-900', shadow: 'shadow-blue-900/20' }; 
      return { from: 'from-gray-900', to: 'to-black', shadow: 'shadow-black/20' }; 
  };
  
  const eduTheme = getEduTheme(eduIndex);

  return (
    <div className="w-full h-full bg-transparent font-sans overflow-y-auto scrollbar-hide pb-32">
        
        {/* FILTER BAR (Floating) */}
        <div className="pt-4 pb-2 px-4 md:px-6 sticky top-0 z-20 pointer-events-none">
            <div className="flex justify-end pointer-events-auto">
                <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-full p-1.5 shadow-lg border border-gray-100 dark:border-gray-800 inline-flex overflow-x-auto max-w-full">
                    {(['todos', 'seguindo', 'voto', 'despesa'] as const).map((f) => (
                        <button 
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-5 py-2.5 rounded-full font-bold text-xs capitalize transition-all flex items-center gap-2 shrink-0 ${
                                activeFilter === f 
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' 
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {f === 'voto' && <Landmark size={14}/>}
                            {f === 'despesa' && <Banknote size={14}/>}
                            {f === 'todos' && <Filter size={14}/>}
                            {f === 'seguindo' && <Heart size={14} className={activeFilter === f ? 'fill-white dark:fill-black' : ''}/>}
                            <span>{f}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* FEED CONTENT */}
        <div className="px-4 md:px-6 pt-0 w-full mx-auto space-y-10 max-w-[1600px]">
            
            <DashboardHeader />

            {/* AGENDA */}
            {activeFilter === 'todos' && agenda.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black text-xl text-gray-900 dark:text-white mb-4 flex items-center gap-2 px-2">
                        <Clock className="text-red-500" size={20}/> Agenda do Dia <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full uppercase">Ao Vivo</span>
                    </h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1">
                        {agenda.map((event) => (
                            <div key={event.id} className="min-w-[280px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-[2rem] shadow-sm flex flex-col justify-between hover:border-red-300 transition-colors cursor-default relative overflow-hidden">
                                <div className={`absolute top-0 right-0 p-2 ${event.status === 'Em Andamento' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'} text-[10px] font-bold uppercase rounded-bl-xl`}>
                                    {event.status || 'Agendado'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-gray-500 font-bold text-xs">
                                        <Clock size={12}/> {event.startTime} {event.endTime ? `- ${event.endTime}` : ''}
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-2 line-clamp-2">{event.title}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                    <MapPin size={10}/> {event.location}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CAROUSEL */}
            {(activeFilter === 'todos') && (
                <div className="relative">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="font-black text-xl text-gray-900 dark:text-white flex items-center gap-2">
                            <Lightbulb className="text-yellow-500 fill-current" size={20}/> Entenda a Política
                        </h3>
                        <div className="flex gap-1.5">
                            {EDUCATION_CAROUSEL.map((_, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setEduIndex(i)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === eduIndex ? 'w-8 bg-gray-900 dark:bg-white' : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'}`}
                                ></button>
                            ))}
                        </div>
                    </div>

                    <div 
                        className={`aspect-[2.2/1] md:aspect-[3.5/1] bg-gradient-to-br ${eduTheme.from} ${eduTheme.to} rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl ${eduTheme.shadow} relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.005]`}
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => setPaused(false)}
                        onClick={() => onEducationClick(currentEdu.id)}
                    >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="absolute top-0 right-0 p-12 opacity-10">
                            <Lightbulb size={200} className="text-white"/>
                        </div>
                        <div className="absolute inset-y-0 left-0 w-1/6 z-20 cursor-w-resize hover:bg-black/5 transition-colors" onClick={prevSlide}></div>
                        <div className="absolute inset-y-0 right-0 w-1/6 z-20 cursor-e-resize hover:bg-black/5 transition-colors" onClick={nextSlide}></div>

                        <div className="relative z-10 flex flex-col justify-center h-full max-w-3xl">
                            <span className="bg-white/20 w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20 backdrop-blur-sm">
                                Guia Cidadão • Tópico {eduIndex + 1}
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight tracking-tight drop-shadow-sm">{currentEdu.title}</h2>
                            <p className="text-white/90 text-base md:text-xl font-medium leading-relaxed line-clamp-3">
                                {currentEdu.text}
                            </p>
                            <div className="mt-8 inline-flex items-center gap-3 text-sm font-bold bg-white text-black px-6 py-3 rounded-full uppercase tracking-wider hover:bg-gray-100 transition-colors w-fit shadow-lg">
                                Ler artigo completo <ArrowRight size={16}/>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* LIST */}
            <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 px-2">
                    <Newspaper size={20} className="text-gray-400"/>
                    {activeFilter === 'seguindo' ? 'Atividade de quem você segue' : 'Últimas Atualizações'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 pb-8">
                    {feedItems.length === 0 && (
                        <>
                            <SkeletonFeedItem />
                            <SkeletonFeedItem />
                            <SkeletonFeedItem />
                        </>
                    )}
                    
                    {filteredItems.map((item, idx) => {
                        const candidate = item.candidateId ? politicians.find(p => p.id === item.candidateId) : null;
                        
                        if (item.type === 'voto') {
                            return <VoteCard key={idx} item={item} candidate={candidate} onSelectCandidate={onSelectCandidate} />;
                        }
                        if (item.type === 'despesa') {
                            return <ExpenseCard key={idx} item={item} candidate={candidate} onSelectCandidate={onSelectCandidate} />;
                        }
                        return <GenericCard key={idx} item={item} />;
                    })}
                    
                    {/* EMPTY STATE */}
                    {filteredItems.length === 0 && activeFilter !== 'todos' && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-60">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-400">
                                 {activeFilter === 'despesa' ? <Banknote size={48}/> : activeFilter === 'seguindo' ? <Heart size={48}/> : <Filter size={48}/>}
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                                {activeFilter === 'seguindo' ? 'Você ainda não segue ninguém' : 'Sem registros recentes'}
                            </h3>
                            <button onClick={() => setActiveFilter('todos')} className="mt-8 px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">
                                Ver tudo
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {filteredItems.length > 0 && activeFilter !== 'seguindo' && (
                <div className="flex justify-center pb-12">
                    <button 
                        onClick={onSeeMore}
                        className="group bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800 flex items-center gap-4"
                    >
                        Carregar Histórico Completo
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default FeedView;
