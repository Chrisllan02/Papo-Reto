
import React, { useMemo } from 'react';
import { ChevronLeft, Scale, Calculator, ArrowRightLeft, Users, CheckCircle2, XCircle, AlertCircle, HelpCircle, FileQuestion } from 'lucide-react';
import { Politician } from '../types';
import { QUIZ_QUESTIONS } from '../constants';
import { getGenderedRole } from '../services/camaraApi';

interface ComparatorViewProps {
  candidateA: Politician | null;
  candidateB: Politician | null;
  onBack: () => void;
}

const ComparatorView: React.FC<ComparatorViewProps> = ({ candidateA, candidateB, onBack }) => {
    if (!candidateA || !candidateB) return null;

    // 1. Cálculo de Afinidade (Voting Alignment)
    const { score, totalVotes } = useMemo(() => {
        let matches = 0;
        let total = 0;
        
        QUIZ_QUESTIONS.forEach(q => {
            const vA = candidateA.votes[q.id];
            const vB = candidateB.votes[q.id];
            
            // Só considera se ambos votaram (ignora faltas/N/A)
            if (vA && vB && vA !== 'N/A' && vA !== 'ABST' && vB !== 'N/A' && vB !== 'ABST') {
                total++;
                if (vA === vB) matches++;
            }
        });

        if (total === 0) return { score: 0, totalVotes: 0 };
        return { score: Math.round((matches / total) * 100), totalVotes: total };
    }, [candidateA, candidateB]);

    // Componente: Barra de Disputa
    const BattleBar = ({ label, valA, valB, format = (v: number) => v.toString(), inverse = false }: { label: string, valA: number, valB: number, format?: (v: number) => string, inverse?: boolean }) => {
        const max = Math.max(valA, valB) || 1;
        const pctA = (valA / max) * 100;
        const pctB = (valB / max) * 100;
        
        const winA = valA > valB;
        const winB = valB > valA;
        const tie = valA === valB;

        // Cores: Se inverse=true (ex: Gastos), maior é "ruim" (vermelho) e menor é "bom" (verde).
        // Se inverse=false (ex: Presença), maior é "bom" (verde).
        const colorA = tie ? 'bg-gray-400' : (winA ? (inverse ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-300 dark:bg-gray-700');
        const colorB = tie ? 'bg-gray-400' : (winB ? (inverse ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-300 dark:bg-gray-700');

        return (
            <div className="py-3">
                <div className="flex justify-between items-end mb-1 px-1">
                    <span className={`text-xs font-black ${winA ? 'text-gray-900 dark:text-white' : 'text-gray-500'} transition-colors`}>{format(valA)}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                    <span className={`text-xs font-black ${winB ? 'text-gray-900 dark:text-white' : 'text-gray-500'} transition-colors`}>{format(valB)}</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                    {/* Center Divider */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white dark:bg-black z-10"></div>
                    
                    {/* Bar A (Right aligned to center) */}
                    <div className="flex-1 flex justify-end">
                        <div className={`h-full rounded-l-full transition-all duration-700 ${colorA}`} style={{ width: `${pctA}%` }}></div>
                    </div>
                    
                    {/* Bar B (Left aligned to center) */}
                    <div className="flex-1 flex justify-start">
                        <div className={`h-full rounded-r-full transition-all duration-700 ${colorB}`} style={{ width: `${pctB}%` }}></div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto pb-32 bg-gray-50 dark:bg-gray-900 w-full animate-in fade-in duration-500">
             
             {/* Header */}
             <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-30 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"><ChevronLeft size={24}/></button>
                <span className="font-bold text-gray-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                    <Scale size={14}/> Comparador
                </span>
                <div className="w-10"></div>
             </div>

             <div className="max-w-4xl mx-auto p-4 md:p-8">
                 
                 {/* 1. THE FACE-OFF */}
                 <div className="flex items-center justify-between mb-8 relative">
                     {/* Candidate A */}
                     <div className="flex flex-col items-center text-center w-1/3">
                         <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-white dark:border-gray-700 shadow-xl overflow-hidden mb-3 bg-gray-200">
                             <img src={candidateA.photo} className="w-full h-full object-cover" alt={candidateA.name}/>
                         </div>
                         <h2 className="font-black text-gray-900 dark:text-white text-sm md:text-lg leading-tight">{candidateA.name}</h2>
                         <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1">{candidateA.party}</p>
                     </div>

                     {/* VS Badge (Center) */}
                     <div className="flex flex-col items-center justify-center -mt-6 z-10">
                         <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-black italic shadow-lg transform rotate-45 border-2 border-white dark:border-gray-900">
                             <span className="transform -rotate-45 text-lg">VS</span>
                         </div>
                     </div>

                     {/* Candidate B */}
                     <div className="flex flex-col items-center text-center w-1/3">
                         <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-white dark:border-gray-700 shadow-xl overflow-hidden mb-3 bg-gray-200">
                             <img src={candidateB.photo} className="w-full h-full object-cover" alt={candidateB.name}/>
                         </div>
                         <h2 className="font-black text-gray-900 dark:text-white text-sm md:text-lg leading-tight">{candidateB.name}</h2>
                         <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1">{candidateB.party}</p>
                     </div>
                 </div>

                 {/* 2. ALIGNMENT SCORE */}
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm mb-8 relative overflow-hidden">
                     {totalVotes > 0 ? (
                         <>
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"></div>
                            <div className="flex flex-col items-center text-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Concordância em Votações</span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-5xl font-black tracking-tighter ${score > 70 ? 'text-green-500' : score < 30 ? 'text-red-500' : 'text-yellow-500'}`}>
                                        {score}%
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium mt-1 max-w-xs">
                                    {score > 70 ? 'Eles votam de forma muito parecida.' : score < 30 ? 'Ideologicamente opostos.' : 'Concordam em alguns pontos.'}
                                </p>
                            </div>
                         </>
                     ) : (
                         <div className="flex flex-col items-center text-center py-6">
                             <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 mb-4">
                                 <FileQuestion size={32} />
                             </div>
                             <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Dados Insuficientes</h3>
                             <p className="text-sm text-gray-500 max-w-xs">
                                 Não encontramos votações comuns suficientes na nossa base para calcular uma afinidade precisa entre estes perfis.
                             </p>
                         </div>
                     )}
                 </div>

                 {/* 3. BATTLE BARS (Metrics) */}
                 <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm mb-8">
                     <h3 className="text-center text-xs font-black uppercase text-gray-400 tracking-widest mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">Desempenho & Custos</h3>
                     <div className="space-y-2">
                         <BattleBar 
                            label="Presença em Plenário" 
                            valA={candidateA.stats.attendancePct} 
                            valB={candidateB.stats.attendancePct}
                            format={(v) => `${v}%`} 
                         />
                         <BattleBar 
                            label="Projetos Apresentados" 
                            valA={candidateA.stats.projects} 
                            valB={candidateB.stats.projects} 
                         />
                         <BattleBar 
                            label="Gasto Mensal (Média)" 
                            valA={candidateA.stats.spending} 
                            valB={candidateB.stats.spending}
                            format={(v) => `R$ ${Math.round(v/1000)}k`}
                            inverse // Menos é melhor
                         />
                         <BattleBar 
                            label="Faltas Não Justificadas" 
                            valA={candidateA.stats.absentSessions} 
                            valB={candidateB.stats.absentSessions}
                            inverse // Menos é melhor
                         />
                     </div>
                 </div>

                 {/* 4. KEY VOTES COMPARISON */}
                 {totalVotes > 0 && (
                     <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                         <h3 className="text-center text-xs font-black uppercase text-gray-400 tracking-widest mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">Votações Cruciais</h3>
                         
                         <div className="space-y-4">
                             {QUIZ_QUESTIONS.map(q => {
                                 const voteA = candidateA.votes[q.id];
                                 const voteB = candidateB.votes[q.id];
                                 const agree = voteA === voteB && voteA !== 'N/A';
                                 
                                 const getIcon = (v: string) => {
                                     if (v === 'SIM') return <CheckCircle2 size={18} className="text-green-500"/>;
                                     if (v === 'NAO' || v === 'NÃO') return <XCircle size={18} className="text-red-500"/>;
                                     return <HelpCircle size={18} className="text-gray-300"/>;
                                 };

                                 // Só exibe se pelo menos um deles votou
                                 if ((!voteA || voteA === 'N/A') && (!voteB || voteB === 'N/A')) return null;

                                 return (
                                     <div key={q.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0 group">
                                         {/* Vote A */}
                                         <div className="w-12 flex justify-center" title={`${candidateA.name}: ${voteA}`}>
                                             {getIcon(voteA)}
                                         </div>

                                         {/* Topic */}
                                         <div className="flex-1 text-center px-2">
                                             <p className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide group-hover:text-blue-500 transition-colors">{q.tema}</p>
                                             {agree && voteA !== 'N/A' && <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full font-bold">Concordam</span>}
                                             {!agree && voteA !== 'N/A' && voteB !== 'N/A' && <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full font-bold">Discordam</span>}
                                         </div>

                                         {/* Vote B */}
                                         <div className="w-12 flex justify-center" title={`${candidateB.name}: ${voteB}`}>
                                             {getIcon(voteB)}
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 )}

             </div>
        </div>
    );
};

export default ComparatorView;
