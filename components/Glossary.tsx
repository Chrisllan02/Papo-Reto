import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

const DICTIONARY: Record<string, string> = {
    'Obstrução': 'Estratégia onde o partido orienta não votar para tentar impedir que a votação aconteça (atrapalhar o quórum).',
    'Art. 17': 'Quando o deputado vota contra a orientação do próprio partido (rebeldia partidária).',
    'Tramitação': 'O projeto ainda está sendo discutido nas comissões, não virou lei nem foi rejeitado definitivamente.',
    'Urgência': 'Votação para pular a fila e analisar o projeto imediatamente, sem passar por comissões.',
    'Relator': 'O deputado escolhido para ler o projeto e recomendar se deve ser aprovado ou não.',
    'PEC': 'Proposta de Emenda à Constituição. É a mudança mais difícil de fazer, exige mais votos (3/5) para passar.',
    'PL': 'Projeto de Lei Comum. Exige maioria simples (metade dos presentes + 1) para passar.',
    'Sanção': 'Quando o projeto aprovado vai para a mesa do Presidente da República assinar e virar lei.',
    'Veto': 'Quando o Presidente recusa um projeto aprovado pelo Congresso.',
    'Abstenção': 'O deputado estava presente, marcou presença, mas escolheu não votar nem Sim nem Não.'
};

interface GlossaryProps {
    term: string;
    children: React.ReactNode;
}

export const Glossary: React.FC<GlossaryProps> = ({ term, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const definition = DICTIONARY[term] || DICTIONARY[Object.keys(DICTIONARY).find(k => term.includes(k)) || ''];

    if (!definition) return <>{children}</>;

    return (
        <>
            <span 
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                className="cursor-help border-b-2 border-dotted border-blue-400 decoration-none hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors inline-flex items-center gap-0.5"
            >
                {children}
                <HelpCircle size={10} className="text-blue-500 mb-2" />
            </span>

            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] max-w-xs w-full shadow-2xl relative border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-xs">
                            <HelpCircle size={16} /> Dicionário Cidadão
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">"{term}"</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm font-medium">
                            {definition}
                        </p>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="mt-6 w-full py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};