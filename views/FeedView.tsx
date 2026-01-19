
import React, { useState, useMemo, useEffect } from 'react';
import { Landmark, Banknote, Lightbulb, Filter, Heart, ArrowRight, ExternalLink, ChevronDown, Calendar, FileText, CheckCircle2, XCircle, Clock, AlertTriangle, X, Share2, User, Sparkles, Loader2 } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { chatWithGemini } from '../services/ai';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: any[];
  onSelectCandidate: (pol: Politician) => void;
  onEducationClick: (id: number) => void;
  onSeeMore: () => void;
}

// --- MODAL DE DETALHES ---

const FeedDetailModal = ({ item, politician, onClose, onGoToProfile }: { item: FeedItem, politician?: Politician, onClose: () => void, onGoToProfile: (p: Politician) => void }) => {
    const isVote = item.type === 'voto';
    const isExpense = item.type === 'despesa';
    
    // Animação de entrada
    const [visible, setVisible] = useState(false);
    const [simplifiedText, setSimplifiedText] = useState<string | null>(null);
    const [isSimplifying, setIsSimplifying] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleSimplify = async () => {
        if (simplifiedText) return;
        setIsSimplifying(true);
        try {
            const prompt = `Explique o que é isso para um jovem de 18 anos, em uma frase curta e direta: "${item.content || item.description}". Comece com "Isso significa que..."`;
            const result = await chatWithGemini(prompt, 'fast');
            setSimplifiedText(result.text);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSimplifying(false);
        }
    };

    return (
        <div 
            className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`bg-white dark:bg-gray-900 w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] transition-transform duration-500 ease-out border border-white/20 ${visible ? 'translate-y-0 scale-100' : 'translate-y-full md:translate-y-10 md:scale-95'}`}
            >
                {/* Header Visual */}
                <div className={`h-32 shrink-0 relative overflow-hidden flex items-start justify-end p-4 ${
                    isVote ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                    isExpense ? 'bg-gradient-to-br from-green-600 to-green-800' :
                    'bg-gradient-to-br from-yellow-500 to-yellow-700'
                }`}>
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    
                    <button 
                        onClick={onClose} 
                        className="relative z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <X size={20}/>
                    </button>

                    <div className="absolute -bottom-6 left-8 p-4 bg-white dark:bg-gray-900 rounded-[1.5rem] shadow-lg border-4 border-white dark:border-gray-900 flex items-center justify-center text-3xl">
                        {isVote ? <Landmark size={32} className="text-blue-600"/> : isExpense ? <Banknote size={32} className="text-green-600"/> : <Lightbulb size={32} className="text-yellow-500"/>}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-10">
                    
                    {/* Tags & Data */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                            isVote ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            isExpense ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                            {item.type}
                        </span>
                        {item.date && (
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                <Clock size={12}/> {item.date}
                            </span>
                        )}
                        {item.status && (
                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                                item.status === 'Aprovado' ? 'border-green-200 text-green-600' :
                                item.status === 'Rejeitado' ? 'border-red-200 text-red-600' :
                                'border-gray-200 text-gray-500'
                            }`}>
                                {item.status}
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight mb-6">
                        {item.title}
                    </h2>

                    {isExpense && item.amount && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Valor da Despesa</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{item.amount}</p>
                            </div>
                            {item.provider && (
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Fornecedor</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{item.provider}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 font-medium leading-relaxed mb-4">
                        <p>{item.content || item.description}</p>
                    </div>

                    {/* AI SIMPLIFICATION AREA */}
                    {isVote && (
                        <div className="mb-8">
                            {!simplifiedText ? (
                                <button 
                                    onClick={handleSimplify}
                                    disabled={isSimplifying}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-600 hover:text-purple-700 transition-colors bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-100 dark:border-purple-800"
                                >
                                    {isSimplifying ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                                    {isSimplifying ? 'Traduzindo...' : 'Traduzir Juridiquês com IA'}
                                </button>
                            ) : (
                                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-800 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-wider">
                                        <Sparkles size={14}/> Explicação Simples
                                    </div>
                                    <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-relaxed">
                                        {simplifiedText}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-4">
                        {/* Politician Card */}
                        {politician && (
                            <div 
                                onClick={() => { onClose(); onGoToProfile(politician); }}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-800/50 cursor-pointer transition-all group"
                            >
                                <img src={politician.photo} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm" alt=""/>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Autor / Responsável</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{politician.name}</p>
                                    <p className="text-xs font-medium text-gray-500">{politician.party} - {politician.state}</p>
                                </div>
                                <div className="p-2 bg-white dark:bg-gray-700 rounded-full text-gray-400 group-hover:text-blue-500 transition-colors shadow-sm">
                                    <User size={20}/>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {item.sourceUrl && (
                                <a 
                                    href={item.sourceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-opacity shadow-lg"
                                >
                                    Ver Fonte Oficial <ExternalLink size={16}/>
                                </a>
                            )}
                            {/* Share Button (Simulado) */}
                            <button className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <Share2 size={20}/>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- BENTO GRID COMPONENTS ---

const BentoGrid: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  return (
    <div
      className={`grid md:auto-rows-[20rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </div>
  );
};

interface BentoGridItemProps {
  className?: string;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  footer?: React.ReactNode;
}

const BentoGridItem: React.FC<BentoGridItemProps> = ({
  className,
  title,
  description,
  header,
  icon,
  onClick,
  footer
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        row-span-1 rounded-3xl group/bento hover:shadow-2xl transition duration-200 shadow-sm 
        bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 justify-between flex flex-col space-y-4 p-6
        cursor-pointer ${className}
      `}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
            {icon}
        </div>
        <div className="font-sans font-black text-gray-900 dark:text-white mb-2 mt-auto text-lg leading-tight line-clamp-2">
          {title}
        </div>
        <div className="font-sans font-medium text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-4">
          {description}
        </div>
        {footer}
      </div>
    </div>
  );
};

// --- VISUAL HEADERS FOR CARDS ---

const VoteHeader = ({ status, type, date }: { status?: string, type: string, date?: string }) => {
    const isApproved = status?.toLowerCase().includes('aprovado') || status?.toLowerCase().includes('sanção');
    const isRejected = status?.toLowerCase().includes('rejeitado') || status?.toLowerCase().includes('arquivado');
    
    return (
        <div className={`flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br p-4 flex-col justify-between relative overflow-hidden ${
            isApproved ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10' :
            isRejected ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10' :
            'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10'
        }`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px', color: isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#2563eb' }}></div>
            
            <div className="flex justify-between items-start z-10">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md backdrop-blur-sm bg-white/50 dark:bg-black/20 ${
                    isApproved ? 'text-green-700 dark:text-green-400' :
                    isRejected ? 'text-red-700 dark:text-red-400' :
                    'text-blue-700 dark:text-blue-400'
                }`}>
                    {type}
                </span>
                {date && <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{date}</span>}
            </div>

            <div className="z-10 mt-auto">
                <div className={`flex items-center gap-2 font-black text-2xl tracking-tighter ${
                    isApproved ? 'text-green-600 dark:text-green-400' :
                    isRejected ? 'text-red-600 dark:text-red-400' :
                    'text-blue-600 dark:text-blue-400'
                }`}>
                    {isApproved ? <CheckCircle2 size={24}/> : isRejected ? <XCircle size={24}/> : <Clock size={24}/>}
                    <span className="uppercase">{status || 'Tramitação'}</span>
                </div>
            </div>
        </div>
    );
};

const ExpenseHeader = ({ value, provider, date }: { value: string, provider?: string, date?: string }) => (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/10 p-4 flex-col justify-between relative overflow-hidden">
        <div className="flex justify-between items-start z-10">
             <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md backdrop-blur-sm bg-white/50 dark:bg-black/20 text-yellow-700 dark:text-yellow-400">
                Gasto Público
            </span>
            {date && <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{date}</span>}
        </div>
        <div className="z-10 mt-auto">
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase truncate max-w-[200px]">{provider}</p>
        </div>
    </div>
);

const DefaultHeader = ({ type, date }: { type: string, date?: string }) => (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-700 p-4 flex-col justify-between">
         <div className="flex justify-between items-start z-10">
             <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-300">
                {type}
            </span>
            {date && <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{date}</span>}
        </div>
        <div className="mt-auto flex justify-center opacity-20">
            <Lightbulb size={48} />
        </div>
    </div>
);

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, articles, onSelectCandidate, onEducationClick, onSeeMore }) => {
  const [activeFilter, setActiveFilter] = useState<'todos' | 'seguindo' | 'voto' | 'despesa' | 'educacao'>('todos');
  const [visibleCount, setVisibleCount] = useState(21); // Multiplo de 7 para o grid pattern
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

  useEffect(() => {
    setVisibleCount(21);
  }, [activeFilter]);

  const filteredItems = useMemo(() => {
    let items = feedItems;
    if (activeFilter === 'voto') items = items.filter(i => i.type === 'voto');
    else if (activeFilter === 'despesa') items = items.filter(i => i.type === 'despesa');
    else if (activeFilter === 'educacao') items = items.filter(i => i.type === 'educacao');
    else if (activeFilter === 'seguindo') items = []; 
    return items;
  }, [feedItems, activeFilter]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-black font-sans flex flex-col">
        {/* MODAL DE DETALHES */}
        {selectedItem && (
            <FeedDetailModal 
                item={selectedItem} 
                politician={selectedItem.candidateId ? politicians.find(p => p.id === selectedItem.candidateId) : undefined}
                onClose={() => setSelectedItem(null)}
                onGoToProfile={onSelectCandidate}
            />
        )}

        {/* FILTER BAR (Sticky) */}
        <div className="pt-4 pb-2 px-4 md:px-6 sticky top-0 z-30 bg-[#F3F4F6]/85 dark:bg-black/85 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 transition-all shrink-0">
            <div className="max-w-7xl mx-auto flex justify-end">
                <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-full p-1.5 shadow-sm border border-gray-100 dark:border-gray-700 inline-flex overflow-x-auto max-w-full">
                    {(['todos', 'seguindo', 'voto', 'despesa', 'educacao'] as const).map((f) => (
                        <button 
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-5 py-2.5 rounded-full font-bold text-xs capitalize transition-all flex items-center gap-2 shrink-0 ${
                                activeFilter === f 
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' 
                                : 'text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {f === 'voto' && <Landmark size={14}/>}
                            {f === 'despesa' && <Banknote size={14}/>}
                            {f === 'educacao' && <Lightbulb size={14}/>}
                            {f === 'todos' && <Filter size={14}/>}
                            {f === 'seguindo' && <Heart size={14} className={activeFilter === f ? 'fill-white dark:fill-black' : ''}/>}
                            <span>{f === 'educacao' ? 'Educação' : f}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
            <div className="h-full w-full overflow-y-auto pb-32 px-4 md:px-6 pt-6 custom-scrollbar">
                
                {/* Articles Carousel */}
                {(activeFilter === 'todos' || activeFilter === 'educacao') && (
                    <div className="w-full max-w-7xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-tight px-2">
                            <Lightbulb className="text-yellow-500"/> SAIBA MAIS
                        </h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                            {articles.map((art) => (
                                <div 
                                    key={art.id}
                                    onClick={() => onEducationClick(art.id)}
                                    className={`min-w-[280px] md:min-w-[320px] bg-gradient-to-br ${art.colorFrom || 'from-blue-600'} ${art.colorTo || 'to-blue-800'} rounded-[2rem] p-6 text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform snap-center`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                            {art.icon === 'Banknote' ? <Banknote size={24}/> : art.icon === 'ScrollText' ? <Filter size={24}/> : <Lightbulb size={24}/>}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-full">Dica #{art.id}</span>
                                    </div>
                                    <h3 className="font-black text-lg leading-tight mb-2">{art.title}</h3>
                                    <p className="text-sm font-medium opacity-90 line-clamp-2">{art.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Bento Grid */}
                <BentoGrid className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                    {displayedItems.length === 0 && (
                        <div className="col-span-full text-center py-20 opacity-50">
                            <p className="font-bold text-gray-500">Nenhuma atualização recente.</p>
                        </div>
                    )}

                    {displayedItems.map((item, i) => {
                        const candidate = item.candidateId ? politicians.find(p => p.id === item.candidateId) : null;
                        const isVote = item.type === 'voto';
                        const isExpense = item.type === 'despesa';
                        
                        // Pattern: Items 3 and 6 in a group of 7 span 2 columns
                        const isLarge = (i % 7 === 3) || (i % 7 === 6);
                        
                        return (
                            <BentoGridItem
                                key={i}
                                className={isLarge ? "md:col-span-2" : ""}
                                title={item.title}
                                description={item.description}
                                onClick={() => setSelectedItem(item)} // Alterado: Abre o Modal de Detalhes
                                header={
                                    isVote ? <VoteHeader status={item.status} type={item.type} date={item.date} /> :
                                    isExpense ? <ExpenseHeader value={item.amount || 'R$ 0'} provider={item.provider} date={item.date} /> :
                                    <DefaultHeader type={item.type} date={item.date} />
                                }
                                icon={
                                    isVote ? <Landmark className="h-4 w-4 text-blue-500" /> :
                                    isExpense ? <Banknote className="h-4 w-4 text-green-500" /> :
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                }
                                footer={
                                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mt-auto">
                                        {candidate ? (
                                            <div className="flex items-center gap-2">
                                                <img src={candidate.photo} className="w-6 h-6 rounded-full bg-gray-200 object-cover" alt=""/>
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{candidate.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-400">Institucional</span>
                                        )}
                                        {item.sourceUrl && (
                                            <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                                                <ArrowRight size={14} />
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </BentoGrid>

                <div className="max-w-md mx-auto mt-8 mb-4">
                    {visibleCount < filteredItems.length && (
                        <button 
                            onClick={() => setVisibleCount(prev => prev + 21)}
                            className="w-full py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                        >
                            Carregar Mais <ChevronDown size={16}/>
                        </button>
                    )}
                    
                    <button 
                        onClick={onSeeMore}
                        className="w-full mt-3 py-4 text-xs font-black uppercase text-gray-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                    >
                        Ver Histórico Completo <ArrowRight size={14}/>
                    </button>
                </div>

            </div>
        </div>
    </div>
  );
};

export default FeedView;
