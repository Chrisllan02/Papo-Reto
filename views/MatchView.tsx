
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, BrainCircuit, Check, X, SkipForward, Flame, Compass, Loader2, PieChart, Sparkles, HelpCircle, ArrowRight, BookOpen, FileText, ExternalLink } from 'lucide-react';
import { Politician, QuizQuestion } from '../types';
import { QUIZ_QUESTIONS } from '../constants';
import { fetchDynamicQuizQuestions } from '../services/camaraApi';
import { Glossary } from '../components/Glossary';

interface MatchViewProps {
  politicians: Politician[];
  onFinish: (results: Politician[]) => void;
  onCancel: () => void;
}

const MatchView: React.FC<MatchViewProps> = ({ politicians, onFinish, onCancel }) => {
  const [mode, setMode] = useState<'menu' | 'quiz'>('menu');
  const [questions, setQuestions] = useState<QuizQuestion[]>(QUIZ_QUESTIONS);
  const [dynamicVoteMap, setDynamicVoteMap] = useState<Record<string, Record<number, string>>>({});
  
  const [step, setStep] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<'neutral' | 'sim' | 'nao'>('neutral');
  const cardRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 100;

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  useEffect(() => {
      if (mode !== 'quiz' || isCalculating) return;

      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight') handleVote('SIM');
          if (e.key === 'ArrowLeft') handleVote('NAO');
          if (e.key === 'ArrowDown' || e.key === ' ') handleVote('SKIP');
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isCalculating, step]);

  const startGame = async (gameMode: 'dynamic' | 'static') => {
      if (gameMode === 'static') {
          setQuestions(QUIZ_QUESTIONS);
          setDynamicVoteMap({});
          setMode('quiz');
      } else {
          setIsLoadingDynamic(true);
          try {
              const { questions: dynQuestions, voteMap } = await fetchDynamicQuizQuestions();
              if (dynQuestions.length === 0) {
                  alert("Não foi possível carregar votações recentes. Tente o modo Clássico.");
                  setIsLoadingDynamic(false);
                  return;
              }
              setQuestions(dynQuestions);
              setDynamicVoteMap(voteMap);
              setMode('quiz');
          } catch (e) {
              console.error(e);
              alert("Erro ao conectar com a Câmara.");
          } finally {
              setIsLoadingDynamic(false);
          }
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging) return;
      const newDragX = dragX + e.movementX;
      setDragX(newDragX);

      if (newDragX > SWIPE_THRESHOLD && decisionFeedback !== 'sim') {
          setDecisionFeedback('sim');
          triggerHaptic();
      } else if (newDragX < -SWIPE_THRESHOLD && decisionFeedback !== 'nao') {
          setDecisionFeedback('nao');
          triggerHaptic();
      } else if (Math.abs(newDragX) < SWIPE_THRESHOLD && decisionFeedback !== 'neutral') {
          setDecisionFeedback('neutral');
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      setDecisionFeedback('neutral');
      (e.target as Element).releasePointerCapture(e.pointerId);

      if (dragX > SWIPE_THRESHOLD) handleVote('SIM');
      else if (dragX < -SWIPE_THRESHOLD) handleVote('NAO');
      else setDragX(0); 
  };

  const handleVote = (voto: string) => {
    if (voto === 'SIM') setDragX(window.innerWidth);
    else if (voto === 'NAO') setDragX(-window.innerWidth);
    else setDragX(0); 

    if (navigator.vibrate) navigator.vibrate(30);

    setTimeout(() => {
        const currentQ = questions[step];
        let newVotes = userVotes;
        
        if (voto !== 'SKIP') {
            newVotes = { ...userVotes, [currentQ.id]: voto };
            setUserVotes(newVotes);
        }
        
        finalizeStep(newVotes);
        setDragX(0);
    }, 250);
  };

  const finalizeStep = (currentVotes: Record<number, string>) => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      calculateFinalMatch(currentVotes);
    }
  };

  const calculateFinalMatch = async (finalUserVotes: Record<number, string>) => {
    setIsCalculating(true);
    setCalcProgress(0);
    
    const shuffled = [...politicians]; 
    const enrichedResults: Politician[] = [];
    const CHUNK_SIZE = 20; 
    let index = 0;

    const processChunk = async () => {
        const end = Math.min(index + CHUNK_SIZE, shuffled.length);
        
        for (let i = index; i < end; i++) {
            const pol = shuffled[i];
            let targetPol = pol;
            let score = 0;
            let maxScore = 0;
            
            questions.forEach(q => {
                let politicoVote = 'N/A';
                if (q.realVoteId) {
                    const voteIdStr = String(q.realVoteId);
                    if (dynamicVoteMap[voteIdStr] && dynamicVoteMap[voteIdStr][pol.id]) {
                        politicoVote = dynamicVoteMap[voteIdStr][pol.id];
                    }
                } else {
                    politicoVote = targetPol.votes ? targetPol.votes[q.id] : 'N/A';
                }
                
                const userVote = finalUserVotes[q.id];
                if (userVote && politicoVote && politicoVote !== 'N/A' && politicoVote !== 'ABST') {
                    maxScore += q.peso;
                    if (politicoVote === userVote) {
                        score += q.peso;
                    }
                }
            });

            const matchScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            enrichedResults.push({ ...targetPol, matchScore });
        }

        index = end;
        setCalcProgress(Math.round((index / shuffled.length) * 100));

        if (index < shuffled.length) {
            setTimeout(processChunk, 0);
        } else {
            const topMatches = enrichedResults.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
            setTimeout(() => {
                setIsCalculating(false);
                onFinish(topMatches);
            }, 500);
        }
    };

    setTimeout(processChunk, 100);
  };

  if (isLoadingDynamic) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 relative overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-500 animate-spin opacity-50 blur-lg"></div>
                  <Loader2 size={40} className="text-blue-600 dark:text-white relative z-10 animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Conectando ao Plenário...</h2>
              <p className="text-blue-500 dark:text-blue-400 font-bold text-sm">Baixando e traduzindo votações.</p>
          </div>
      );
  }

  if (isCalculating) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in relative z-20">
              <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                  <BrainCircuit size={80} className="text-blue-500 relative z-10" />
              </div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">Calculando Match...</h2>
              <div className="w-full max-w-xs h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700 relative">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                    style={{ width: `${calcProgress}%` }}
                  ></div>
              </div>
              <p className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{calcProgress}% Processado</p>
          </div>
      );
  }

  if (mode === 'menu') {
      return (
        <div className="w-full h-full font-sans overflow-y-auto pb-32 animate-in fade-in duration-300">
            <div className="max-w-[1800px] mx-auto px-6 md:px-12 py-10 space-y-10">
                
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 shadow-sm">
                                <BrainCircuit size={24} />
                            </div>
                            <span className="text-sm font-black text-blue-500 uppercase tracking-[0.2em]">Teste de Afinidade</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                            Descubra sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-500">Bancada Ideal</span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 font-medium text-lg md:text-xl mt-4 max-w-3xl leading-relaxed">
                            Responda a questões reais do Congresso e veja quem vota como você.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button 
                        onClick={() => startGame('dynamic')} 
                        className="group relative text-left h-[340px] w-full transition-all hover:-translate-y-2 outline-none overflow-hidden rounded-[3rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:border-orange-200 dark:hover:border-orange-900/50 flex flex-col justify-between p-10"
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Flame size={200} className="text-orange-500"/>
                        </div>
                        
                        <div className="relative z-10">
                             <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-3xl flex items-center justify-center border border-orange-100 dark:border-orange-900/30 group-hover:scale-110 transition-transform shadow-md mb-8">
                                 <Flame size={32} className="fill-current" />
                             </div>

                             <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Em Alta <span className="text-orange-500 text-xl align-top">🔥</span></h3>
                             <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed max-w-[90%]">
                                 Baseado nas polêmicas que <strong>acabaram de acontecer</strong> no Plenário. Votos reais e quentes.
                             </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-3 text-orange-600 font-black text-xs uppercase tracking-widest group-hover:gap-5 transition-all mt-4">
                             Começar Agora <ArrowRight size={18}/>
                        </div>
                    </button>

                     <button 
                        onClick={() => startGame('static')} 
                        className="group relative text-left h-[340px] w-full transition-all hover:-translate-y-2 outline-none overflow-hidden rounded-[3rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-900/50 flex flex-col justify-between p-10"
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Compass size={200} className="text-blue-500"/>
                        </div>
                        
                        <div className="relative z-10">
                             <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center border border-blue-100 dark:border-blue-900/30 group-hover:scale-110 transition-transform shadow-md mb-8">
                                 <Compass size={32} className="fill-current" />
                             </div>

                             <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Clássico</h3>
                             <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed max-w-[90%]">
                                 Perguntas atemporais sobre Economia, Social e Costumes para definir seu perfil ideológico.
                             </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-3 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest group-hover:gap-5 transition-all mt-4">
                             Começar Agora <ArrowRight size={18}/>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      );
  }

  const currentQ = questions[step];
  const progress = ((step) / questions.length) * 100;
  
  const dragPercentage = Math.min(Math.max(dragX / 200, -1), 1); 
  const opacityYes = Math.max(0, dragPercentage);
  const opacityNo = Math.max(0, -dragPercentage);
  const rotate = dragX * 0.05;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative font-sans">
        
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {/* Feedback visual durante swipe */}
        <div 
            className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-orange-500/10 to-transparent flex items-center justify-start pl-6 transition-opacity duration-200 pointer-events-none z-10"
            style={{ opacity: opacityNo }}
        >
            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-orange-100 dark:border-orange-900/30 scale-110">
                <X size={32} className="text-orange-500" strokeWidth={3}/>
            </div>
        </div>

        <div 
            className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/10 to-transparent flex items-center justify-end pr-6 transition-opacity duration-200 pointer-events-none z-10"
            style={{ opacity: opacityYes }}
        >
             <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-blue-100 dark:border-blue-900/30 scale-110">
                <Check size={32} className="text-blue-500" strokeWidth={3}/>
            </div>
        </div>

        <div className="w-full max-w-[1800px] mx-auto px-6 pt-8 pb-4 z-20 shrink-0">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setMode('menu')} className="p-3 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95 text-gray-500 hover:text-blue-600 dark:hover:text-white">
                    <ChevronLeft size={22} />
                </button>
                
                <div className="flex flex-col items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Progresso</span>
                     <div className="flex items-center gap-3">
                         <div className="w-48 h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                         </div>
                         <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">{step + 1}/{questions.length}</span>
                     </div>
                </div>

                <div className="p-3 opacity-0 pointer-events-none">
                     <ChevronLeft size={22} />
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative px-4 z-20">
            
            {step < questions.length - 1 && (
                <div 
                    className="absolute w-full max-w-lg aspect-[3/4.2] bg-gray-200 dark:bg-gray-800 rounded-[3rem] border border-gray-300 dark:border-gray-700 shadow-sm pointer-events-none transition-transform duration-300 ease-out top-1/2 -translate-y-1/2"
                    style={{ 
                        transform: `translate(-50%, -50%) scale(${0.92 + (Math.abs(dragPercentage) * 0.04)}) translateY(${30 - (Math.abs(dragPercentage) * 15)}px)`,
                        left: '50%'
                    }}
                ></div>
            )}

            <div 
                ref={cardRef}
                className="w-full max-w-lg bg-white dark:bg-gray-900 text-blue-900 dark:text-white rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-700 p-8 md:p-10 flex flex-col relative cursor-grab active:cursor-grabbing touch-none select-none will-change-transform"
                style={{ 
                    transform: `translateX(${dragX}px) rotate(${rotate}deg)`, 
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    aspectRatio: '3/4.2' 
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <div 
                    className="absolute top-10 left-10 z-30 pointer-events-none border-[4px] border-blue-500 rounded-2xl px-6 py-2 opacity-0 transition-opacity"
                    style={{ opacity: opacityYes }}
                >
                     <span className="text-blue-500 font-black text-4xl uppercase tracking-tighter -rotate-12 block drop-shadow-sm">SIM</span>
                </div>

                <div 
                    className="absolute top-10 right-10 z-30 pointer-events-none border-[4px] border-orange-500 rounded-2xl px-6 py-2 opacity-0 transition-opacity"
                    style={{ opacity: opacityNo }}
                >
                     <span className="text-orange-500 font-black text-4xl uppercase tracking-tighter rotate-12 block drop-shadow-sm">NÃO</span>
                </div>

                <div className="relative z-10 flex flex-col h-full pointer-events-none select-none">
                    
                    <div className="flex justify-between items-start mb-8">
                        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300 flex items-center gap-2 border border-blue-100 dark:border-blue-900/30">
                            <Compass size={14}/> {currentQ.tema}
                        </div>
                        {currentQ.realVoteId && (
                            <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-full border border-purple-100 dark:border-purple-900/30">
                                <Sparkles size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-wide">Traduzido por IA</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {currentQ.context && (
                            <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-2 text-gray-400 dark:text-gray-500">
                                    <BookOpen size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">O Cenário</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic">
                                    "{currentQ.context}"
                                </p>
                            </div>
                        )}

                        {currentQ.proposal && (
                            <div className="mb-8 animate-in fade-in slide-in-from-bottom-3 delay-100">
                                <div className="flex items-center gap-2 mb-2 text-blue-400 dark:text-blue-500">
                                    <FileText size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">A Proposta</span>
                                </div>
                                <p className="text-xl font-black text-blue-900 dark:text-white leading-tight">
                                    {currentQ.proposal}
                                </p>
                            </div>
                        )}

                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 animate-in zoom-in duration-300 delay-200">
                            <div className="flex justify-center mb-3 text-blue-500">
                                <HelpCircle size={28} />
                            </div>
                            <h2 className="text-center text-2xl font-black text-blue-600 dark:text-blue-400 leading-tight">
                                <Glossary term={currentQ.tema}>{currentQ.description}</Glossary>
                            </h2>
                        </div>

                        {/* NOVO: Raio-X da Votação */}
                        {currentQ.stats && (
                            <div className="mt-8 border-t border-gray-100 dark:border-gray-700/50 pt-6 animate-in slide-in-from-bottom-4 delay-300">
                                <div className="flex items-center gap-2 mb-4 text-gray-400 dark:text-gray-500">
                                    <PieChart size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Raio-X da Votação</span>
                                </div>
                                
                                {/* Approval Bar */}
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-xs font-black text-green-600 dark:text-green-400 whitespace-nowrap">{currentQ.stats.approvalRate}% Aprovaram</span>
                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full shadow-inner" style={{ width: `${currentQ.stats.approvalRate}%` }}></div>
                                    </div>
                                </div>

                                {/* Parties Context */}
                                <div className="grid grid-cols-2 gap-3 text-[10px]">
                                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/20">
                                        <p className="font-black text-green-700 dark:text-green-400 uppercase mb-1">Quem apoiou</p>
                                        <p className="text-gray-600 dark:text-gray-300 font-bold text-xs">{currentQ.stats.partiesYes.join(', ') || 'N/A'}</p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/20">
                                        <p className="font-black text-red-600 dark:text-red-400 uppercase mb-1">Quem rejeitou</p>
                                        <p className="text-gray-600 dark:text-gray-300 font-bold text-xs">{currentQ.stats.partiesNo.join(', ') || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                        {currentQ.sourceUrl && (
                            <a 
                                href={currentQ.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="pointer-events-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-blue-500 transition-colors"
                                onPointerDown={(e) => e.stopPropagation()} 
                            >
                                <ExternalLink size={12} /> Fonte Oficial
                            </a>
                        )}
                        <div className="text-[9px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">
                            PapoReto &copy;
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Optical Alignment applied here: slightly offset icons */}
        <div className="px-6 pb-24 md:pb-12 pt-8 flex items-center justify-center gap-8 md:gap-12 z-20 shrink-0">
            <button 
                onClick={() => handleVote('NAO')}
                className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900/30 text-orange-500 flex items-center justify-center hover:scale-110 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all shadow-xl group active:scale-95"
                aria-label="Discordo"
            >
                <X size={40} strokeWidth={3} className="group-hover:rotate-90 transition-transform"/>
            </button>

            <button 
                onClick={() => handleVote('SKIP')}
                className="px-8 py-4 rounded-full bg-white dark:bg-gray-800 text-blue-400 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-lg active:scale-95 transition-all flex flex-col items-center gap-1.5"
            >
                <SkipForward size={24} className="ml-0.5"/>
                Pular
            </button>

            <button 
                onClick={() => handleVote('SIM')}
                className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900/30 text-blue-500 flex items-center justify-center hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-xl group active:scale-95"
                aria-label="Concordo"
            >
                {/* Check icon usually looks better slightly offset to left due to its shape */}
                <Check size={40} strokeWidth={3} className="group-hover:scale-125 transition-transform -ml-1"/>
            </button>
        </div>
    </div>
  );
};

export default MatchView;
