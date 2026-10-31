
import React, { useId, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import Modal from './Modal';
import { DICTIONARY } from '../utils/glossary';

interface GlossaryProps {
    term: string;
    children: React.ReactNode;
}

export const Glossary: React.FC<GlossaryProps> = ({ term, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const titleId = useId();

    const definition = DICTIONARY[term] || DICTIONARY[Object.keys(DICTIONARY).find(k => term.includes(k)) || ''];

    if (!definition) return <>{children}</>;

    return (
        <>
            <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                className="cursor-help border-b-2 border-dotted border-blue-500/60 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors inline-flex items-baseline gap-0.5 whitespace-nowrap group rounded-sm font-[inherit] text-[inherit] focus-visible:ring-4 focus-visible:ring-blue-500/40"
                title="Toque para ver o significado"
                aria-haspopup="dialog"
            >
                {children}
                <HelpCircle size={12} className="text-blue-600 dark:text-blue-300 mb-0.5" aria-hidden="true" />
                <span className="sr-only"> (ver significado)</span>
            </button>

            {isOpen && (
                <Modal
                    onClose={() => setIsOpen(false)}
                    labelledBy={titleId}
                    className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 animate-in fade-in duration-200"
                >
                    <div className="glass-panel p-6 rounded-2xl max-w-xs w-full relative animate-in zoom-in-95 duration-200">
                        <button 
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Fechar"
                            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full text-subtle hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40"
                        >
                            <X size={16} aria-hidden="true" />
                        </button>

                        <div className="flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-300 font-semibold text-xs">
                            <HelpCircle size={18} aria-hidden="true" /> Dicionário cidadão
                        </div>
                        
                        <h3 id={titleId} className="text-2xl font-black text-midnight dark:text-white mb-3 pr-10">
                            "{term}"
                        </h3>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-6">
                            <p className="text-muted-strong dark:text-blue-100 leading-relaxed text-sm font-medium">
                                {definition}
                            </p>
                        </div>

                        <button 
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-full min-h-11 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-blue-500/40"
                        >
                            Entendi
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
};
