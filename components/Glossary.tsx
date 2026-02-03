
import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export const DICTIONARY: Record<string, string> = {
    'Obstrução': 'Estratégia onde o partido orienta não votar para tentar impedir que a votação aconteça (atrapalhar o quórum) ou atrasar os trabalhos.',
    'Art. 17': 'Quando o deputado vota contra a orientação do próprio partido (rebeldia partidária).',
    'Tramitação': 'O projeto ainda está sendo discutido nas comissões, não virou lei nem foi rejeitado definitivamente.',
    'Urgência': 'Votação para pular a fila e analisar o projeto imediatamente no Plenário, sem precisar passar antes por comissões.',
    'Relator': 'O deputado escolhido para estudar o projeto e recomendar aos demais se ele deve ser aprovado ou não.',
    'PEC': 'Proposta de Emenda à Constituição. É a mudança mais difícil de fazer, exige mais votos (308 deputados) para passar.',
    'PL': 'Projeto de Lei Comum. Exige maioria simples (metade dos presentes + 1) para passar. Define regras do dia a dia.',
    'Sanção': 'Quando o projeto aprovado vai para a mesa do Presidente da República assinar e virar lei.',
    'Veto': 'Quando o Presidente recusa um projeto aprovado pelo Congresso, impedindo que vire lei (o Congresso pode tentar derrubar o veto).',
    'Abstenção': 'O deputado estava presente na sessão, marcou presença, mas escolheu não votar nem Sim nem Não.'
};

interface GlossaryProps {
    term: string;
    children: React.ReactNode;
}

export const Glossary: React.FC<GlossaryProps> = ({ term, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Tenta encontrar a definição exata ou uma parcial
    const definition = DICTIONARY[term] || DICTIONARY[Object.keys(DICTIONARY).find(k => term.includes(k)) || ''];

    if (!definition) return <>{children}</>;

    return (
        <>
            <span 
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                className="cursor-help border-b-2 border-dotted border-blue-400/50 decoration-none hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors inline-flex items-baseline gap-0.5 whitespace-nowrap group"
                title="Toque para ver o significado"
            >
                {children}
                <HelpCircle size={10} className="text-blue-400 group-hover:text-blue-600 mb-0.5" />
            </span>

            {isOpen && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                >
                    <div 
                        className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] max-w-xs w-full shadow-2xl relative border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200" 
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-xs">
                            <HelpCircle size={18} /> Dicionário Cidadão
                        </div>
                        
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                            "{term}"
                        </h3>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-6">
                            <p className="text-gray-700 dark:text-blue-100 leading-relaxed text-sm font-medium">
                                {definition}
                            </p>
                        </div>

                        <button 
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-transform active:scale-95 shadow-lg"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
