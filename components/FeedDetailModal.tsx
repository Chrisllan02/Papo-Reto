import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Clock, Scale, ArrowRight, ExternalLink, Share2, Landmark, Banknote, Lightbulb } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import AudioPlayer from './AudioPlayer';
import { getDidacticContext, renderWithGlossary } from '../utils/legislativeTranslator';

interface FeedDetailModalProps {
    item: FeedItem;
    politician?: Politician;
    onClose: () => void;
    onGoToProfile: (p: Politician) => void;
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({ item, politician, onClose, onGoToProfile }) => {
    const isVote = item.type === 'voto';
    const isExpense = item.type === 'despesa';
    const isLightBg = !isVote && !isExpense; 

    const [visible, setVisible] = useState(false);
    // Gesture States
    const [dragY, setDragY] = useState(0);
    const touchStartY = useRef<number | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    const didacticContent = useMemo(() => getDidacticContext(item.title, item.description, item.type), [item]);

    // Otimização: Calcula o glossário apenas quando o texto mudar, evitando lag durante animações
    const glossaryContent = useMemo(() => renderWithGlossary(didacticContent.text), [didacticContent.text]);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        closeBtnRef.current?.focus();
    }, []);

    // Gesture Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current !== null) {
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - touchStartY.current;
            if (deltaY > 0) { // Only allow dragging down
                setDragY(deltaY);
            }
        }
    };

    const handleTouchEnd = () => {
        if (dragY > 100) { // Threshold to close
            onClose();
        } else {
            setDragY(0); // Snap back
        }
        touchStartY.current = null;
    };

    // Definição de contraste para o botão fechar
    const closeBtnClass = isLightBg 
        ? 'bg-white/60 hover:bg-white text-gray-900 border-white/40' // Spring BG
        : 'bg-white/20 hover:bg-white/30 text-white border-white/20'; // Blue/Orange BG

    return (
        <div 
            className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-midnight/60 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} 
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className={`glass-card dark:bg-midnight backdrop-blur-3xl w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl dark:shadow-[0_-20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col max-h-[95dvh] md:max-h-[85dvh] transition-transform duration-500 ease-out border border-white/20 dark:border-white/10 ${visible ? 'translate-y-0' : 'translate-y-full md:scale-95'}`}
                style={{ transform: visible ? `translateY(${dragY}px)` : undefined }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="md:hidden w-full h-6 absolute top-0 left-0 right-0 z-50 flex items-center justify-center cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-gray-300/50 dark:bg-gray-700/50 rounded-full backdrop-blur-sm" aria-hidden="true"></div>
                </div>
                
                <div className={`h-24 md:h-32 shrink-0 relative flex items-start justify-end p-6 ${isVote ? 'bg-nuit' : isExpense ? 'bg-orange-600' : 'bg-spring'} backdrop-blur-md transition-colors`}>
                    <div className="absolute top-6 left-6 z-50 flex gap-2">
                        <AudioPlayer text={`${item.title}. ${didacticContent.text}`} isDarkText={isLightBg} />
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
                        {isVote ? <Landmark size={28} className="text-nuit" aria-hidden="true" /> : isExpense ? <Banknote size={28} className="text-orange-600" aria-hidden="true" /> : <Lightbulb size={28} className="text-yellow-600" aria-hidden="true" />}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-12 pb-safe">
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm ${isVote ? 'bg-nuit/10 text-nuit' : isExpense ? 'bg-orange-100/50 text-orange-700' : 'bg-spring/30 text-yellow-800'}`}>
                            {item.type}
                        </span>
                        {item.date && <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Clock size={12} aria-hidden="true" /> {item.date}</span>}
                    </div>

                    <h2 id="modal-title" className="text-2xl md:text-3xl font-black text-midnight dark:text-white leading-tight mb-8 tracking-tight">{item.title}</h2>

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
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Valor</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{item.amount}</p>
                            </div>
                            {item.provider && (
                                <div className="text-right max-w-[50%]">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fornecedor</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{item.provider}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-gray-700 dark:text-gray-300 font-medium leading-loose mb-8 text-sm md:text-base">
                        <p className="mb-3 font-bold text-xs uppercase text-gray-400 tracking-wider">Texto Original:</p>
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
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Responsável</p>
                                    <p className="text-base font-black text-midnight dark:text-white truncate">{politician.name}</p>
                                    <p className="text-xs font-medium text-gray-500">{politician.party} - {politician.state}</p>
                                </div>
                                <div className="p-3 bg-white/50 dark:bg-white/10 rounded-full text-gray-400 shrink-0 group-hover:text-nuit transition-colors">
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
                            <button aria-label="Compartilhar esta informação" className="px-6 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold active:scale-[0.98] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors bg-white/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center">
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