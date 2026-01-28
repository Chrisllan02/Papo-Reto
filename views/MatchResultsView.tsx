
import React, { useState, useRef } from 'react';
import { RefreshCw, Share2, Shield, User, ChevronRight, Download, Zap, Loader2, Check } from 'lucide-react';
import { Politician } from '../types';
import html2canvas from 'html2canvas';
import { formatPartyName } from '../services/camaraApi';

interface MatchResultsViewProps {
  results: Politician[];
  onSelectProfile: (pol: Politician) => void;
  onRetake: () => void;
}

const MatchResultsView: React.FC<MatchResultsViewProps> = ({ results, onSelectProfile, onRetake }) => {
  const topMatch = results[0];
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getArchetype = (party: string) => {
      const p = party.toUpperCase();
      // Progressista -> Solar Orange (Warm/Change)
      if (['PT', 'PSOL', 'PCDOB', 'PSB', 'REDE', 'PV', 'PDT'].includes(p)) return { 
          title: "Progressista", 
          desc: "Foco no social e Estado forte.",
          color: "from-orange-500 to-red-500", 
          shadow: "shadow-orange-500/50",
          emoji: "🚩",
          bg: "bg-gray-900" // Neutral dark background
      };
      // Liberal -> Solar Blue (Cool/Structure)
      if (['PL', 'NOVO', 'PP', 'REPUBLICANOS', 'PATRIOTA', 'PRTB'].includes(p)) return { 
          title: "Liberal", 
          desc: "Liberdade econômica e valores.",
          color: "from-blue-600 to-blue-800",
          shadow: "shadow-blue-500/50",
          emoji: "🦁",
          bg: "bg-gray-900"
      };
      // Pragmático -> Solar Yellow (Warning/Caution)
      if (['MDB', 'PSD', 'PSDB', 'UNIÃO', 'PODEMOS', 'SOLIDARIEDADE'].includes(p)) return { 
          title: "Pragmático", 
          desc: "Equilíbrio e governabilidade.",
          color: "from-yellow-500 to-orange-500",
          shadow: "shadow-yellow-500/50",
          emoji: "⚖️",
          bg: "bg-gray-900"
      };
      // Independente -> Solar Dark Blue
      return { 
          title: "Independente", 
          desc: "Análise caso a caso.",
          color: "from-blue-700 to-indigo-900",
          shadow: "shadow-blue-500/50",
          emoji: "🦅",
          bg: "bg-gray-900"
      };
  };

  const archetype = getArchetype(topMatch.party);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
        const canvas = await html2canvas(cardRef.current, {
            useCORS: true,
            scale: 2, // Retina quality
            backgroundColor: null
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `meu-match-politico-${topMatch.name.split(' ')[0]}.png`;
        link.click();
        
        // Tentar compartilhar nativo se for mobile
        if (navigator.share) {
             const blob = await (await fetch(image)).blob();
             const file = new File([blob], "match.png", { type: "image/png" });
             await navigator.share({
                 title: 'Meu Match Político no PapoReto',
                 text: `Deu ${topMatch.matchScore}% com ${topMatch.name}! Qual o seu perfil?`,
                 files: [file]
             });
        }
    } catch (err) {
        console.error("Erro ao gerar imagem", err);
    } finally {
        setGenerating(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] ${archetype.bg} overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-500`}>
        
        {/* Animated Background Mesh */}
        <div className={`absolute top-0 left-0 right-0 h-[80dvh] bg-gradient-to-b ${archetype.color} opacity-40 blur-[100px] pointer-events-none`}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>

        <div className="relative z-10 max-w-lg mx-auto min-h-full flex flex-col p-6">
            
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-6">
                 <button onClick={onRetake} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors">
                     <RefreshCw size={20}/>
                 </button>
                 <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-xl">
                    <Zap size={14} className="text-yellow-400 fill-current animate-pulse"/>
                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Resultado</span>
                </div>
                <div className="w-10"></div>
            </div>

            {/* MAIN BATTLE CARD (CAPTURE AREA) */}
            <div className="perspective-[1000px] mb-8">
                <div 
                    ref={cardRef}
                    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-1 shadow-2xl relative group overflow-hidden transform transition-transform duration-500"
                >
                    {/* Background Dynamic Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${archetype.color} opacity-30`}></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                    
                    <div className="bg-gray-900/90 rounded-[2.8rem] p-8 relative z-10 flex flex-col items-center text-center h-full border border-white/5">
                        
                        {/* Header Text */}
                        <div className="mb-6">
                            <span className="text-white/60 text-[10px] uppercase tracking-[0.3em] font-bold block mb-2">Seu Arquétipo</span>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none drop-shadow-2xl flex items-center justify-center gap-3">
                                {archetype.title} <span className="text-4xl">{archetype.emoji}</span>
                            </h1>
                             <p className="text-white/70 font-medium text-sm mt-2 max-w-xs mx-auto">
                                {archetype.desc}
                            </p>
                        </div>

                        {/* VS Visuals */}
                        <div className="w-full flex justify-between items-end mb-8 relative px-2">
                             
                             {/* Line & Score */}
                             <div className="absolute top-12 left-12 right-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                                 <div className={`h-full bg-gradient-to-r ${archetype.color} w-full animate-[shimmer_2s_infinite]`}></div>
                             </div>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] z-20">
                                <div className={`bg-gray-900 p-2 rounded-2xl border-4 border-gray-800 ${archetype.shadow}`}>
                                    <div className={`bg-gradient-to-br ${archetype.color} text-white w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-lg`}>
                                        <span className="text-lg font-black leading-none">{topMatch.matchScore}%</span>
                                        <span className="text-[8px] font-bold uppercase opacity-80">Match</span>
                                    </div>
                                </div>
                             </div>

                            {/* User Avatar */}
                            <div className="flex flex-col items-center gap-3 relative z-10">
                                <div className="w-20 h-20 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center shadow-lg relative">
                                    <User size={32} className="text-gray-500"/>
                                    <div className="absolute -bottom-2 bg-gray-700 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Você</div>
                                </div>
                            </div>

                            {/* Politician Avatar */}
                            <div className="flex flex-col items-center gap-3 relative z-10">
                                <div className={`w-24 h-24 rounded-full border-4 border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] overflow-hidden bg-gray-800 relative`}>
                                    <img src={topMatch.photo} alt={topMatch.name} className="w-full h-full object-cover" crossOrigin="anonymous"/>
                                </div>
                                <div className="text-center bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 -mt-2">
                                    <h3 className="text-white font-black text-sm leading-tight whitespace-nowrap">{topMatch.name.split(' ')[0]}</h3>
                                    <span className={`text-[9px] font-bold uppercase bg-gradient-to-r ${archetype.color} bg-clip-text text-transparent`}>
                                        {formatPartyName(topMatch.party)} • {topMatch.state}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Branding */}
                        <div className="mt-auto opacity-40">
                             <p className="text-[10px] font-bold text-white uppercase tracking-widest">PapoReto.app • Transparência Radical</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
                <button 
                    onClick={handleShare}
                    disabled={generating}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-3 shadow-xl bg-white text-black`}
                >
                    {generating ? <Loader2 className="animate-spin"/> : <Share2 size={18}/>}
                    {generating ? 'Gerando Card...' : 'Compartilhar Resultado'}
                </button>
                
                <button 
                    onClick={() => onSelectProfile(topMatch)} 
                    className="w-full bg-white/10 text-white border border-white/20 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    Ver Perfil <ChevronRight size={16}/>
                </button>
            </div>
        </div>
    </div>
  );
};

export default MatchResultsView;
