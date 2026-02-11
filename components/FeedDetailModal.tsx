
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Clock, Scale, ArrowRight, ExternalLink, Share2, Landmark, Banknote, Lightbulb, FileText, Users, GitCommit, Loader2, Calendar, Mic2, Star } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import AudioPlayer from './AudioPlayer';
import { getDidacticContext, renderWithGlossary } from '../utils/legislativeTranslator';
import { fetchProposicaoDetails, fetchEventDetails } from '../services/camaraApi';

interface FeedDetailModalProps {
    item: FeedItem;
    politician?: Politician;
    onClose: () => void;
    onGoToProfile: (p: Politician) => void;
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({ item, politician, onClose, onGoToProfile }) => {
    const isVote = item.type === 'voto';
    const isExpense = item.type === 'despesa';
    const isEvent = item.type === 'evento';
    const isLightBg = !isVote && !isExpense; 

    const [visible, setVisible] = useState(false);
    const [dragY, setDragY] = useState(0);
    const touchStartY = useRef<number | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Estado para detalhes profundos (fetch on demand)
    const [extraDetails, setExtraDetails] = useState<{ authors: string[], fullTextUrl?: string, progress: number, label: string, guests?: string[] } | null>(null);
    const [loadingExtras, setLoadingExtras] = useState(false);

    const didacticContent = useMemo(() => getDidacticContext(item.title, item.description, item.type), [item]);
    const glossaryContent = useMemo(() => renderWithGlossary(didacticContent.text), [didacticContent.text]);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        closeBtnRef.current?.focus();

        setLoadingExtras(true);

        if (isEvent) {
            // Busca convidados para Eventos
            fetchEventDetails(item.id).then(data => {
                setExtraDetails({ 
                    guests: data.guests,
                    authors: [], 
                    progress: 0, 
                    label: '' 
                });
                setLoadingExtras(false);
            });
        } else if (isVote) {
            // Busca detalhes de Proposição
            let propId = item.id;
            // Tenta extrair ID da proposição da URL ou do próprio item se for voto derivado
            if (item.sourceUrl && item.sourceUrl.includes('propostas-legislativas/')) {
                const parts = item.sourceUrl.split('/');
                const idStr = parts[parts.length - 1];
                if (!isNaN(parseInt(idStr))) {
                    propId = parseInt(idStr);
                }
            }
            
            // Só busca se o ID parecer ser de uma proposição (geralmente > 10000)
            if (propId > 10000) {
                fetchProposicaoDetails(propId).then(data => {
                    setExtraDetails(data);
                    setLoadingExtras(false);
                });
            } else {
                setLoadingExtras(false);
            }
        } else {
            setLoadingExtras(false);
        }

    }, [item, isEvent, isVote]);

    // Gesture Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current !== null) {
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - touchStartY.current;
            if (deltaY > 0) { 
                setDragY(deltaY);
            }
        }
    };

    const handleTouchEnd = () => {
        if (dragY > 100) { 
            onClose();
        } else {
            setDragY(0); 
        }
        touchStartY.current = null;
    };

    const closeBtnClass = isLightBg 
        ? 'bg-white/60 hover:bg-white text-gray-900 border-white/40' 
        : 'bg-white/20 hover:bg-white/30 text-white border-white/20'; 

    return (
        <div 
            className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-midnight/60 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} 
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className={`glass-panel w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] relative overflow-hidden flex flex-col max-h-[95dvh] md:max-h-[85dvh] transition-transform duration-500 ease-out ${visible ? 'translate-y-0' : 'translate-y-full md:scale-95'}`}
                style={{ transform: visible ? `translateY(${dragY}px)` : undefined }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="md:hidden w-full h-6 absolute top-0 left-0 right-0 z-50 flex items-center justify-center cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-gray-300/50 dark:bg-gray-700/50 rounded-full backdrop-blur-sm" aria-hidden="true"></div>
                </div>
                
                <div className={`h-24 md:h-32 shrink-0 relative flex items-start justify-end p-6 ${isVote ? 'bg-nuit' : isExpense ? 'bg-orange-600' : isEvent ? 'bg-purple-600' : 'bg-spring'} backdrop-blur-md transition-colors`}>
                    <div className="absolute top-6 left-6 z-50 flex gap-2">
                        <AudioPlayer text={`${item.title}. ${didacticContent.text}`} isDarkText={isLightBg && !isEvent} />
                    </div>
                    <button 
                        ref={closeBtnRef}
                        onClick={onClose} 
                        aria-label="Fechar Detalhes"
                        className={`p-2.5 rounded-full transition-colors backdrop-blur-md border shadow-sm ${closeBtnClass}`}
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                    <div className="absolute -bottom-6 left-8 p-3 bg-white/80 dark:bg-gray-900/80 rounded-[1.5rem] shadow-xl border-4 border-praxeti dark:border-midnight backdrop-blur-xl flex items-center justify-center">
                        {isVote ? <Landmark size={28} className="text-nuit" aria-hidden="true" /> : 
                         isExpense ? <Banknote size={28} className="text-orange-600" aria-hidden="true" /> : 
                         isEvent ? <Calendar size={28} className="text-purple-600" aria-hidden="true" /> :
                         <Lightbulb size={28} className="text-yellow-600" aria-hidden="true" />}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-12 pb-safe">
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm ${isVote ? 'bg-nuit/10 text-nuit' : isExpense ? 'bg-orange-100/50 text-orange-700' : isEvent ? 'bg-purple-100/50 text-purple-700' : 'bg-spring/30 text-yellow-800'}`}>
                            {item.type}
                        </span>
                        {item.date && <span className="text-xs font-bold text-subtle flex items-center gap-1.5"><Clock size={12} aria-hidden="true" /> {item.date}</span>}
                    </div>

                    <h2 id="modal-title" className="text-2xl md:text-3xl font-black text-midnight dark:text-white leading-tight mb-8 tracking-tight">{item.title}</h2>

                    {/* --- CONVIDADOS E MESA (PARA EVENTOS) --- */}
                    {isEvent && (
                        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-purple-50 dark:bg-white/5 p-5 rounded-3xl border border-purple-100 dark:border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                        <Mic2 size={14}/> Mesa de Convidados
                                    </h4>
                                    {loadingExtras && <Loader2 size={12} className="animate-spin text-purple-500"/>}
                                </div>
                                
                                {extraDetails?.guests && extraDetails.guests.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {extraDetails.guests.map((guest, idx) => {
                                            const isVIP = guest.toLowerCase().includes('ministro') || guest.toLowerCase().includes('secretário');
                                            return (
                                                <div key={idx} className="flex items-start gap-3 p-2 rounded-xl bg-white/60 dark:bg-black/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isVIP ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                                                        {isVIP ? <Star size={14} fill="currentColor"/> : <Users size={14}/>}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold leading-tight ${isVIP ? 'text-purple-900 dark:text-purple-200' : 'text-muted-strong'}`}>
                                                            {guest}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-subtle italic">
                                        {loadingExtras ? "Buscando lista de convidados..." : "Lista de convidados não disponível na pauta digital."}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- TRAMITÔMETRO E EXTRAS DO PROJETO (PARA VOTOS) --- */}
                    {isVote && (
                        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            {/* Barra de Progresso */}
                            <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-black uppercase text-subtle tracking-widest flex items-center gap-2">
                                        <GitCommit size={14}/> Tramitômetro
                                    </h4>
                                    {loadingExtras && <Loader2 size={12} className="animate-spin text-blue-500"/>}
                                    {!loadingExtras && extraDetails && (
                                        <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
                                            {extraDetails.label}
                                        </span>
                                    )}
                                </div>
                                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 ease-out relative"
                                        style={{ width: `${extraDetails ? extraDetails.progress : 10}%` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse"></div>
                                    </div>
                                    {/* Steps Markers */}
                                    <div className="absolute inset-0 flex justify-between px-1">
                                        {[10, 30, 60, 80, 100].map(step => (
                                            <div key={step} className={`w-0.5 h-full ${extraDetails && extraDetails.progress >= step ? 'bg-white/30' : 'bg-gray-300/30'}`}></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2 text-[9px] font-bold text-subtle uppercase tracking-wide">
                                    <span>Início</span>
                                    <span>Sanção</span>
                                </div>
                            </div>

                            {/* Autores & Inteiro Teor */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/10">
                                    <h4 className="text-[10px] font-black uppercase text-subtle tracking-widest mb-2 flex items-center gap-1.5">
                                        <Users size={12}/> Quem Assina
                                    </h4>
                                    {loadingExtras ? (
                                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                    ) : (
                                        <div className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">
                                            {extraDetails && extraDetails.authors && extraDetails.authors.length > 0 
                                                ? extraDetails.authors.slice(0, 3).join(', ') + (extraDetails.authors.length > 3 ? ` e +${extraDetails.authors.length - 3}` : '')
                                                : "Autoria da Comissão"}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-blue-100/50 transition-colors">
                                    {loadingExtras ? (
                                        <Loader2 size={20} className="animate-spin text-blue-500"/>
                                    ) : extraDetails?.fullTextUrl ? (
                                        <a href={extraDetails.fullTextUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center">
                                            <FileText size={20} className="text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform"/>
                                            <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 tracking-wide">Ler Inteiro Teor</span>
                                        </a>
                                    ) : (
                                        <>
                                            <FileText size={20} className="text-gray-400 mb-1"/>
                                            <span className="text-[10px] font-bold uppercase text-gray-400">PDF Indisponível</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-10 space-y-6">
                        {/* Didactic Box - WCAG Contrast Fix: Blue-50 solid for light mode */}
                        <div className="bg-blue-50/90 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-nuit/20 backdrop-blur-md relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-nuit"></div>
                            <div className="text-gray-900 dark:text-blue-100 text-base md:text-lg font-medium leading-relaxed">
                                {glossaryContent}
                            </div>
                        </div>

                        {didacticContent.constitution && (
                            // Constitution Box - WCAG Contrast Fix: Yellow-50 solid for light mode
                            <div className="bg-yellow-50/90 dark:bg-yellow-900/20 p-6 rounded-3xl border border-yellow-100 dark:border-spring/10 backdrop-blur-md relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-spring"></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Scale size={16} className="text-yellow-800 dark:text-spring" />
                                    <span className="text-xs font-black uppercase tracking-wider text-yellow-800 dark:text-spring">Na Constituição ({didacticContent.constitution.art})</span>
                                </div>
                                <p className="text-gray-900 dark:text-yellow-100 text-sm md:text-base font-medium leading-relaxed italic">
                                    "{didacticContent.constitution.text}"
                                </p>
                            </div>
                        )}
                    </div>

                    {isExpense && item.amount && (
                        // Expense Box - WCAG Contrast Fix: Gray-50 solid
                        <div className="mb-8 p-6 bg-gray-50/90 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-subtle uppercase mb-1">Valor</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{item.amount}</p>
                            </div>
                            {item.provider && (
                                <div className="text-right max-w-[50%]">
                                    <p className="text-xs font-bold text-subtle uppercase mb-1">Fornecedor</p>
                                    <p className="text-sm font-bold text-muted-strong truncate">{item.provider}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-muted-strong font-medium leading-loose mb-8 text-sm md:text-base">
                        <p className="mb-3 font-bold text-xs uppercase text-subtle tracking-wider">Texto Original:</p>
                        <p>{item.content || item.description}</p>
                    </div>

                    <div className="flex flex-col gap-4 mt-auto">
                        {politician && (
                            <button 
                                onClick={() => { onClose(); onGoToProfile(politician); }} 
                                aria-label={`Ver perfil completo de ${politician.name}`}
                                className="flex items-center gap-4 p-5 rounded-3xl border border-gray-200 dark:border-white/10 hover:border-nuit bg-white/50 dark:bg-white/5 cursor-pointer transition-all active:scale-[0.98] text-left backdrop-blur-md shadow-sm hover:shadow-md group"
                            >
                                <img src={politician.photo} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-md group-hover:scale-105 transition-transform" alt="" loading="lazy" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-subtle uppercase mb-1">Responsável</p>
                                    <p className="text-base font-black text-midnight dark:text-white truncate">{politician.name}</p>
                                    <p className="text-xs font-medium text-subtle">{politician.party} - {politician.state}</p>
                                </div>
                                <div className="p-3 bg-white/50 dark:bg-white/10 rounded-full text-subtle shrink-0 group-hover:text-nuit transition-colors">
                                    <ArrowRight size={20} aria-hidden="true" />
                                </div>
                            </button>
                        )}

                        <div className="flex gap-4">
                            {item.sourceUrl && (
                                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-4 rounded-2xl bg-midnight dark:bg-white text-white dark:text-black font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl hover:bg-nuit">
                                    Fonte Oficial <ExternalLink size={16} aria-hidden="true" />
                                </a>
                            )}
                            <button aria-label="Compartilhar esta informação" className="px-6 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-muted-strong font-bold active:scale-[0.98] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors bg-white/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center">
                                <Share2 size={22} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedDetailModal;
