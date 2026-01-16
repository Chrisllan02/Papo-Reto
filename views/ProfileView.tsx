
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Share2, ArrowLeftRight, Clock, Briefcase, FileText, Building2, Banknote, Mic2, Loader2, Globe, Plus, X, Phone, Mail, Instagram, Twitter, Facebook, Youtube, Code, ExternalLink, GraduationCap, Calendar, User, Users, Info, AlertCircle, TrendingUp, Landmark, MapPin, CheckCircle2, AlertTriangle, Database, Wallet, Vote, Lock, Download, Printer, Heart, Copy, Check, Gavel, FileCheck, MessageSquare, BriefcaseBusiness, Star, Presentation, BarChart2, PieChart, Sparkles, Newspaper, Scale, PersonStanding } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Politician, FeedItem, TimelineItem, LegislativeVote, Relatoria, Bill, Speech } from '../types';
import { enrichPoliticianData, fetchDiscursos, getGenderedRole, fetchVotacoesPorAno, fetchRelatorias } from '../services/camaraApi';
import { getSearchContext, AIResponse } from '../services/ai';
import { SkeletonProfileHeader } from '../components/Skeleton';
import { Glossary } from '../components/Glossary';

// DADOS OFICIAIS IBGE - PNAD Contínua 2023 (Rendimento médio mensal domiciliar per capita)
const IBGE_INCOME_BY_STATE: Record<string, number> = {
    'DF': 3357, 'SP': 2492, 'RJ': 2367, 'RS': 2304, 'SC': 2269, 'PR': 2115, 
    'MS': 2030, 'MT': 1991, 'GO': 1836, 'ES': 1782, 'MG': 1729, 'RO': 1527, 
    'TO': 1485, 'SE': 1278, 'RN': 1272, 'PB': 1228, 'AP': 1222, 'PI': 1215, 
    'PA': 1205, 'CE': 1166, 'AM': 1136, 'BA': 1129, 'PE': 1113, 'AL': 1110, 
    'RR': 1097, 'MA': 907, 'AC': 1095, 'BR': 1893 // Média Brasil
};

interface ProfileViewProps {
  candidate: Politician;
  onBack: () => void;
  onCompare: (pol: Politician) => void;
  onShare: () => void;
  feedItems: FeedItem[];
  onUpdate?: (pol: Politician) => void;
  allPoliticians?: Politician[];
  isFollowing?: boolean; 
  onToggleFollow?: () => void; 
}

const calculateTimeLeft = (endDateStr: string) => {
  if (!endDateStr) return "";
  let dateStr = endDateStr;
  if (endDateStr.includes('/')) {
      dateStr = endDateStr.split('/').reverse().join('-');
  }
  
  const end = new Date(dateStr);
  if (isNaN(end.getTime())) return "";

  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Encerrado";

  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
  const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));

  return `${years}a ${months}m ${days}d`;
};

const calculateMandateProgress = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    
    const parseDate = (s: string): number => {
        if (s.includes('/')) return new Date(s.split('/').reverse().join('-')).getTime();
        return new Date(s).getTime();
    };

    const start = parseDate(startStr);
    const end = parseDate(endStr);
    const now = new Date().getTime();
    
    if (isNaN(start) || isNaN(end)) return 0;
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
};

const getStatusColor = (status: string) => {
    switch(status) {
        case 'Aprovado': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800';
        case 'Em Tramitação': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800';
        case 'Arquivado': return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
        default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
};

const getBillStatusTooltip = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('aprovado') || s.includes('transformado')) return 'A proposta venceu todas as etapas, foi sancionada e agora é Lei ou Norma oficial.';
    if (s.includes('tramitação') || s.includes('comissão')) return 'O projeto está na fila, sendo analisado por comissões (grupos temáticos) antes de ir a Plenário.';
    if (s.includes('arquivado')) return 'Foi para a gaveta. O projeto foi rejeitado, retirado pelo autor ou o prazo de análise acabou.';
    if (s.includes('apresentado')) return 'Acabou de nascer. O texto foi entregue à Mesa Diretora e aguarda o início da análise.';
    if (s.includes('vetado')) return 'Barrado. O Congresso aprovou, mas o Presidente da República rejeitou (o veto ainda pode ser derrubado).';
    return 'Situação atual da proposta dentro do complexo trâmite legislativo.';
};

const TimelineIcon = ({ type }: { type: string }) => {
    switch(type) {
        case 'voto': return <div className="bg-green-100 text-green-600 p-2 rounded-full shadow-lg shadow-green-500/20 z-10 border-2 border-white dark:border-gray-800"><Vote size={16}/></div>;
        case 'despesa': return <div className="bg-blue-100 text-blue-600 p-2 rounded-full shadow-lg shadow-blue-500/20 z-10 border-2 border-white dark:border-gray-800"><Banknote size={16}/></div>;
        case 'discurso': return <div className="bg-yellow-100 text-yellow-600 p-2 rounded-full shadow-lg shadow-yellow-500/20 z-10 border-2 border-white dark:border-gray-800"><Mic2 size={16}/></div>;
        case 'projeto': return <div className="bg-gray-100 text-gray-600 p-2 rounded-full shadow-lg shadow-gray-500/20 z-10 border-2 border-white dark:border-gray-800"><FileText size={16}/></div>;
        case 'evento': return <div className="bg-purple-100 text-purple-600 p-2 rounded-full shadow-lg shadow-purple-500/20 z-10 border-2 border-white dark:border-gray-800"><Presentation size={16}/></div>;
        default: return <div className="bg-gray-100 text-gray-600 p-2 rounded-full shadow-sm z-10 border-2 border-white dark:border-gray-800"><Info size={16}/></div>;
    }
};

// ... (ReceiptModal mantido) ...
// --- RECIBO DA VERGONHA MODAL 2.0 ---
const ReceiptModal = ({ expense, politician, onClose }: { expense: TimelineItem, politician: Politician, onClose: () => void }) => {
    const [generating, setGenerating] = useState(false);

    const handleDownload = async () => {
        setGenerating(true);
        const element = document.getElementById('viral-receipt');
        if (element) {
            try {
                const canvas = await html2canvas(element, { useCORS: true, scale: 2, backgroundColor: null });
                const link = document.createElement('a');
                link.download = `comprovante-fiscal-${politician.name.split(' ')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error("Erro ao gerar recibo", err);
            }
        }
        setGenerating(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                
                {/* O CUPOM FISCAL */}
                <div id="viral-receipt" className="w-[340px] bg-[#fffdf0] text-black font-mono p-6 shadow-2xl relative rotate-1 overflow-hidden">
                    {/* Efeito de Papel Rasgado */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-[url('https://i.imgur.com/w1pD5qO.png')] bg-contain bg-repeat-x opacity-60 -mt-2"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-[url('https://i.imgur.com/w1pD5qO.png')] bg-contain bg-repeat-x opacity-60 -mb-2 rotate-180"></div>
                    
                    {/* Texture Overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none mix-blend-multiply"></div>

                    <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4 relative z-10">
                        <div className="flex justify-center mb-2"><Landmark size={24}/></div>
                        <h2 className="text-xl font-bold uppercase tracking-widest">Extrato Cidadão</h2>
                        <p className="text-xs mt-1">República Federativa do Brasil</p>
                        <p className="text-xs">Transparência Radical v2.0</p>
                    </div>

                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <img src={politician.photo} className="w-16 h-16 rounded-full grayscale border-2 border-black object-cover" crossOrigin="anonymous"/>
                        <div>
                            <p className="font-bold uppercase text-sm">{politician.name}</p>
                            <p className="text-xs">{politician.party} - {politician.state}</p>
                            <p className="text-[10px] mt-1 font-bold">Origem: Cota Parlamentar</p>
                        </div>
                    </div>

                    <div className="mb-4 relative z-10">
                        <div className="flex justify-between text-xs font-bold border-b border-black pb-1 mb-2">
                            <span>ITEM</span>
                            <span>VALOR (R$)</span>
                        </div>
                        <div className="flex justify-between items-start text-sm mb-1">
                            <span className="max-w-[200px] uppercase leading-tight">{expense.description || expense.title}</span>
                            <span className="font-bold">{expense.value?.replace('R$ ', '')}</span>
                        </div>
                        <div className="text-[10px] uppercase text-gray-500 mb-2">
                             Data: {new Date(expense.date).toLocaleDateString('pt-BR')}
                        </div>
                    </div>

                    <div className="border-t-2 border-dashed border-gray-400 pt-2 mb-6 relative z-10">
                        <div className="flex justify-between text-xl font-bold">
                            <span>TOTAL</span>
                            <span>{expense.value}</span>
                        </div>
                        <p className="text-xs mt-2 uppercase text-center font-bold bg-black text-white py-1">Pago com Seus Impostos</p>
                    </div>

                    <div className="text-center opacity-60 relative z-10">
                         <div className="w-48 h-12 mx-auto bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png')] bg-contain bg-no-repeat bg-center mb-1"></div>
                         <p className="text-[10px] uppercase">Autenticação: {politician.id}X{Date.now().toString().slice(-6)}</p>
                         <p className="text-[10px] mt-1 font-bold">www.paporeto.app</p>
                    </div>

                    {/* Carimbo Animado */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[6px] border-red-600 rounded-full flex items-center justify-center opacity-0 animate-[stamp_0.5s_ease-out_0.5s_forwards] -rotate-12 pointer-events-none mix-blend-multiply">
                         <div className="text-red-600 font-black text-3xl uppercase text-center leading-none tracking-tighter">
                            Dinheiro<br/>Público
                         </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleDownload} 
                        disabled={generating}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                    >
                         {generating ? <Loader2 className="animate-spin"/> : <Download size={20}/>}
                         Baixar Recibo
                    </button>
                    <button 
                        onClick={onClose} 
                        className="bg-white text-gray-800 font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 hover:bg-gray-100"
                    >
                         <X size={20}/> Fechar
                    </button>
                </div>
            </div>
            
            <style>{`
                @keyframes stamp {
                    0% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
                    80% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1) rotate(-12deg); opacity: 0.3; }
                }
            `}</style>
        </div>
    );
};

const TimelineCard: React.FC<{ item: TimelineItem }> = ({ item }) => (
    <div className="relative pl-8 pb-8 group">
        <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800 group-last:hidden"></div>
        <div className="absolute left-0 top-0">
            <TimelineIcon type={item.type} />
        </div>
        <div className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-white/5 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full flex items-center gap-1">
                    {new Date(item.date).toLocaleDateString('pt-BR')} 
                    {item.type === 'evento' && <span className="opacity-50 mx-1">|</span>}
                    {item.type === 'evento' && new Date(item.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                </span>
                {item.value && item.type !== 'evento' && <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">{item.value}</span>}
                {item.status && <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${item.status === 'Sim' ? 'bg-green-100 text-green-700' : item.status === 'Não' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{item.status}</span>}
                {item.type === 'evento' && (
                    <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1 rounded-full">Agenda</span>
                )}
            </div>
            
            <h4 className="font-bold text-gray-900 dark:text-white mb-2 leading-tight text-lg">{item.title}</h4>
            
            {item.description && (
                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4 font-medium">
                   {item.description.split(' ').slice(0, 40).map((word, i) => (
                       <React.Fragment key={i}>
                           <Glossary term={word.replace(/[.,:;()]/g, '')}>{word}</Glossary>{' '}
                       </React.Fragment>
                   ))}
                   {item.description.split(' ').length > 40 && '...'}
                </div>
            )}

            {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
                    {item.type === 'despesa' ? 'Ver Nota Fiscal' : 'Fonte Oficial'} <ExternalLink size={10}/>
                </a>
            )}
        </div>
    </div>
);

const SimpleLineChart = ({ data }: { data: { label: string, value: number }[] }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.value)) * 1.1;
    const minVal = 0;
    const height = 100;
    const width = 300;
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.value - minVal) / (maxVal - minVal)) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-[150px] relative mt-4">
            <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-full overflow-visible">
                <line x1="0" y1="0" x2={width} y2="0" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-gray-800" />
                <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-gray-800" />
                <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-gray-800" />
                <polyline 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="3" 
                    points={points} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-md"
                />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * width;
                    const y = height - ((d.value - minVal) / (maxVal - minVal)) * height;
                    return (
                        <g key={i} className="group">
                            <circle cx={x} cy={y} r="4" className="fill-white stroke-blue-500 stroke-2 dark:fill-gray-900 group-hover:r-6 transition-all" />
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <rect x={x - 30} y={y - 35} width="60" height="25" rx="4" className="fill-black dark:fill-white" />
                                <text x={x} y={y - 18} textAnchor="middle" className="fill-white dark:fill-black text-[10px] font-bold">
                                    {Math.round(d.value/1000)}k
                                </text>
                            </g>
                            <text x={x} y={height + 15} textAnchor="middle" className="text-[8px] fill-gray-400 font-bold uppercase">{d.label}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const SpendingThermometer = ({ current, average }: { current: number, average: number }) => {
    const ratio = average > 0 ? current / average : 0;
    const barPercent = Math.min(Math.max((ratio * 50), 5), 100); 
    const isHigh = ratio > 1.2;
    const isLow = ratio < 0.8;
    const colorClass = isHigh ? 'bg-red-500' : isLow ? 'bg-green-500' : 'bg-blue-500';
    const textClass = isHigh ? 'text-red-500' : isLow ? 'text-green-500' : 'text-blue-500';
    const verdict = isHigh ? 'Gastador' : isLow ? 'Econômico' : 'Na Média';

    return (
        <div className="w-full mt-4 bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Termômetro da Cota</span>
                <span className={`text-xs font-black uppercase ${textClass}`}>{verdict}</span>
            </div>
            <div className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-visible">
                <div className="absolute top-[-4px] bottom-[-4px] left-[50%] w-0.5 bg-gray-400 dark:bg-gray-500 z-10"></div>
                <div className="absolute top-[-18px] left-[50%] -translate-x-1/2 text-[9px] font-bold text-gray-400 uppercase">Média</div>
                <div className={`h-full rounded-full transition-all duration-1000 ${colorClass} shadow-sm`} style={{ width: `${barPercent}%` }}></div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
                <span>R$ 0</span>
                <span>{ratio.toFixed(1)}x da Média</span>
            </div>
        </div>
    );
};

// --- COMPONENTE NOVO: Contexto Socioeconômico IBGE ---
const IBGEContextCard = ({ spending, state }: { spending: number, state: string }) => {
    const avgIncome = IBGE_INCOME_BY_STATE[state] || IBGE_INCOME_BY_STATE['BR'];
    const ratio = spending / avgIncome;
    const families = Math.round(ratio);

    return (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 p-6 rounded-[2.5rem] border border-green-100 dark:border-green-800/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                <Scale size={80} />
            </div>
            
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-full text-green-600 shadow-sm">
                    <PersonStanding size={20}/>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Realidade vs. Mandato</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Fonte: IBGE (PNAD 2023)</p>
                </div>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                    O gasto deste mês equivale à renda mensal de <span className="font-black text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg shadow-sm">{families} cidadãos</span> do estado de {state}.
                </p>

                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3 flex justify-between items-center border border-white/50 dark:border-white/5">
                    <div className="text-center">
                        <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Renda Média ({state})</p>
                        <p className="text-xs font-black text-gray-800 dark:text-white">R$ {avgIncome.toLocaleString()}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
                    <div className="text-center">
                        <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Cota Parlamentar</p>
                        <p className="text-xs font-black text-blue-600 dark:text-blue-400">R$ {spending.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfileView: React.FC<ProfileViewProps> = ({ candidate: initialCandidate, onBack, onCompare, onShare, feedItems, onUpdate, allPoliticians, isFollowing, onToggleFollow }) => {
  const [profileTab, setProfileTab] = useState<'timeline' | 'projects' | 'assets' | 'money' | 'speeches' | 'roles' | 'fronts'>('timeline');
  const [candidate, setCandidate] = useState<Politician>(initialCandidate);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [speechPage, setSpeechPage] = useState(1);
  const [loadingSpeeches, setLoadingSpeeches] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [hoveredExpenseIndex, setHoveredExpenseIndex] = useState<number | null>(null);
  
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<AIResponse | null>(null);

  const [selectedYear, setSelectedYear] = useState<number | null>(null); 
  const [detailedVotes, setDetailedVotes] = useState<LegislativeVote[]>([]);
  const [detailedRelatorias, setDetailedRelatorias] = useState<Relatoria[]>([]);
  const [loadingYearData, setLoadingYearData] = useState(false);
  const [activityTab, setActivityTab] = useState<'votes' | 'proposals' | 'relatorias' | 'speeches'>('votes');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<TimelineItem | null>(null);

  useEffect(() => {
      setCandidate(initialCandidate);
  }, [initialCandidate.id]);

  useEffect(() => {
      const hasStaticData = !!candidate.civilName || !!candidate.cabinet;
      const needsDynamicData = !candidate.timeline || candidate.timeline.length === 0 || !candidate.assets;
      const canLoad = candidate.hasApiIntegration; 

      if (canLoad && (needsDynamicData || !hasStaticData)) {
          if (!hasStaticData) {
              setLoadingDetails(true);
          }
          const loadDetails = async () => {
            try {
                const richData = await enrichPoliticianData(candidate);
                setCandidate(richData);
                if (onUpdate) onUpdate(richData);
            } catch (e) {
                console.warn("Falha no carregamento de detalhes", e);
            } finally {
                setLoadingDetails(false);
            }
          };
          loadDetails();
      }
  }, [candidate.id]);

  useEffect(() => {
      if (!selectedYear || !candidate.hasApiIntegration) return; 
      
      const loadYearData = async () => {
          setLoadingYearData(true);
          try {
              const [votes, relatorias] = await Promise.all([
                  fetchVotacoesPorAno(candidate.id, selectedYear),
                  fetchRelatorias(candidate.id, selectedYear)
              ]);
              setDetailedVotes(votes);
              setDetailedRelatorias(relatorias);
          } catch (e) {
              console.error("Erro ao carregar dados do ano", e);
          } finally {
              setLoadingYearData(false);
          }
      };
      loadYearData();
  }, [selectedYear, candidate.id]);

  const handleAiAnalysis = async () => {
      setShowAiSearch(true);
      if (!aiData) {
          setAiLoading(true);
          const term = `${candidate.role} ${candidate.name} ${candidate.party} polêmicas e projetos recentes`;
          const result = await getSearchContext(term);
          setAiData(result);
          setAiLoading(false);
      }
  };

  const timeLeft = calculateTimeLeft(candidate.mandate.end);
  const mandateProgress = calculateMandateProgress(candidate.mandate.start, candidate.mandate.end);
  const genderedRole = getGenderedRole(candidate.role, candidate.sex);

  const displayedStats = useMemo(() => {
      if (selectedYear && candidate.yearlyStats && candidate.yearlyStats[selectedYear]) {
          const y = candidate.yearlyStats[selectedYear];
          return {
              attendancePct: y.attendancePct,
              projects: y.projects,
              spending: y.spending
          };
      }
      return {
          attendancePct: candidate.stats.attendancePct,
          projects: candidate.stats.projects,
          spending: candidate.stats.spending
      };
  }, [candidate, selectedYear]);

  const comparisonData = useMemo(() => {
      const FALLBACK_GENERAL = 28500; 
      const FALLBACK_PARTY = 32000;

      if (!candidate || !allPoliticians) return { candidate: candidate.stats.spending, party: FALLBACK_PARTY, general: FALLBACK_GENERAL };
      
      const validGeneral = allPoliticians.filter(p => p.hasApiIntegration && p.stats.spending > 0);
      const avgGeneral = validGeneral.length > 50 
          ? validGeneral.reduce((acc, p) => acc + p.stats.spending, 0) / validGeneral.length 
          : FALLBACK_GENERAL;

      return {
          candidate: candidate.stats.spending,
          general: avgGeneral
      };
  }, [candidate, allPoliticians]);

  const topSuppliers = useMemo(() => {
      const expenses = candidate.timeline?.filter(t => t.type === 'despesa') || [];
      const map: Record<string, number> = {};
      expenses.forEach(e => {
          const parts = e.description?.split(':') || [];
          const supplier = parts.length > 1 ? parts[1].trim() : (parts[0] || 'Outros');
          const val = parseFloat(e.value?.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
          map[supplier] = (map[supplier] || 0) + val;
      });
      return Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, val]) => ({ name, val }));
  }, [candidate.timeline]);

  const handleLoadMoreSpeeches = async () => {
      setLoadingSpeeches(true);
      const nextPage = speechPage + 1;
      try {
          const newSpeeches = await fetchDiscursos(candidate.id, selectedYear || undefined, nextPage);
          if (newSpeeches.length > 0) {
              const updatedCandidate = {
                  ...candidate,
                  speeches: [...(candidate.speeches || []), ...newSpeeches]
              };
              setCandidate(updatedCandidate);
              setSpeechPage(nextPage);
              if (onUpdate) onUpdate(updatedCandidate);
          }
      } catch (e) {
          console.error("Erro ao carregar mais discursos", e);
      } finally {
          setLoadingSpeeches(false);
      }
  };

  const handleCopy = (text: string, field: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
  };

  const getSocialIcon = (url: string) => {
      if (url.includes('instagram')) return Instagram;
      if (url.includes('twitter') || url.includes('x.com')) return Twitter;
      if (url.includes('facebook')) return Facebook;
      if (url.includes('youtube')) return Youtube;
      return Globe;
  };

  const CHART_COLORS = ['#16a34a', '#eab308', '#2563eb', '#9ca3af', '#4ade80', '#facc15']; 
  const getChartData = () => {
    let accPercent = 0;
    return candidate.expensesBreakdown?.map((exp, i) => {
        const offset = 100 - accPercent + 25; 
        accPercent += exp.percent;
        return { ...exp, offset, color: CHART_COLORS[i % CHART_COLORS.length] };
    }) || [];
  };

  const chartSegments = getChartData();
  const activeExpense = hoveredExpenseIndex !== null ? candidate.expensesBreakdown?.[hoveredExpenseIndex] : null;

  // ... (ContactCard, YearSelector, ActivityList, StatsCard, TabButton, showSkeleton mantidos iguais) ...
  const ContactCard = () => (
      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/50 dark:border-white/5 shadow-sm space-y-4 h-full flex flex-col justify-between">
          <h3 className="font-black text-gray-900 dark:text-white text-lg flex items-center gap-2">
              <Mail size={20} className="text-green-600"/> Contatos Oficiais
          </h3>
          
          <div className="flex gap-4 items-start p-3 bg-gray-50/50 dark:bg-black/20 rounded-[1.5rem]">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-full text-gray-500 shadow-sm shrink-0">
                  <Building2 size={16}/>
              </div>
              <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Gabinete</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white leading-tight mt-0.5 truncate">
                      {candidate.cabinet?.room ? `Anexo ${candidate.cabinet.building || ''}, Sala ${candidate.cabinet.room}` : 'Não informado'}
                  </p>
              </div>
          </div>
          
          <div className="flex gap-2 items-center p-3 bg-gray-50/50 dark:bg-black/20 rounded-[1.5rem] group">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-full text-green-600 shadow-sm shrink-0">
                  <Phone size={16}/>
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Telefone</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{candidate.cabinet?.phone || 'N/A'}</p>
              </div>
              {candidate.cabinet?.phone && (
                  <button 
                    onClick={() => handleCopy(candidate.cabinet?.phone || '', 'phone')}
                    className="p-2 bg-white dark:bg-gray-700 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 transition-colors"
                  >
                      {copiedField === 'phone' ? <Check size={14} className="text-green-600"/> : <Copy size={14}/>}
                  </button>
              )}
          </div>
          
          <div className="flex gap-2 items-center p-3 bg-gray-50/50 dark:bg-black/20 rounded-[1.5rem] group">
              <a 
                href={candidate.email ? `mailto:${candidate.email}` : '#'} 
                className={`p-2 bg-white dark:bg-gray-700 rounded-full text-blue-600 shadow-sm shrink-0 hover:scale-110 transition-transform ${!candidate.email && 'opacity-50 cursor-not-allowed'}`}
                title="Enviar Email"
              >
                  <Mail size={16}/>
              </a>
              <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">E-mail</p>
                  <a href={candidate.email ? `mailto:${candidate.email}` : '#'} className="text-xs font-bold text-gray-900 dark:text-white truncate hover:underline block">{candidate.email || 'N/A'}</a>
              </div>
              {candidate.email && (
                  <button 
                    onClick={() => handleCopy(candidate.email || '', 'email')}
                    className="p-2 bg-white dark:bg-gray-700 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 transition-colors"
                  >
                      {copiedField === 'email' ? <Check size={14} className="text-green-600"/> : <Copy size={14}/>}
                  </button>
              )}
          </div>
          
          {candidate.socials && candidate.socials.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Redes Sociais</p>
                  <div className="flex flex-wrap gap-2">
                      {candidate.socials.slice(0, 4).map((url, idx) => {
                          const Icon = getSocialIcon(url);
                          return (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm">
                                  <Icon size={16} />
                              </a>
                          )
                      })}
                  </div>
              </div>
          )}
      </div>
  );

  const YearSelector = () => {
    const years = candidate.yearlyStats ? Object.keys(candidate.yearlyStats).map(Number).sort((a,b) => b - a) : [];
    
    if (years.length === 0) return null;

    return (
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
            <button 
                onClick={() => setSelectedYear(null)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedYear === null ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
            >
                Mandato Total
            </button>
            {years.map(year => (
                <button 
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedYear === year ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                >
                    {year}
                </button>
            ))}
        </div>
    );
  };

  const ActivityList = () => {
      if (!selectedYear) return null;

      if (loadingYearData) {
          return (
              <div className="py-8 text-center text-gray-400 flex flex-col items-center">
                  <Loader2 className="animate-spin mb-2" size={24}/>
                  <p className="text-xs font-bold">Carregando atividades de {selectedYear}...</p>
              </div>
          );
      }

      return (
          <div className="mt-6 border-t border-gray-100 dark:border-gray-700/50 pt-4">
              <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                  <button 
                    onClick={() => setActivityTab('votes')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activityTab === 'votes' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                      Votações
                  </button>
                  <button 
                    onClick={() => setActivityTab('relatorias')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activityTab === 'relatorias' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                      Relatorias
                  </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {activityTab === 'votes' && (
                      detailedVotes.length > 0 ? detailedVotes.map((v, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                              <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${v.vote.toLowerCase().includes('sim') ? 'bg-green-100 text-green-600' : v.vote.toLowerCase().includes('não') || v.vote.toLowerCase().includes('nao') ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                                  {v.vote.toLowerCase().includes('sim') ? <Check size={10}/> : v.vote.toLowerCase().includes('não') || v.vote.toLowerCase().includes('nao') ? <X size={10}/> : <div className="w-2.5 h-2.5 rounded-full bg-current"/>}
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">{v.description}</p>
                                  <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(v.date).toLocaleDateString('pt-BR')} • Voto: <span className="uppercase">{v.vote}</span></p>
                              </div>
                          </div>
                      )) : <p className="text-xs text-gray-400 text-center py-4 font-medium">Nenhuma votação registrada neste ano.</p>
                  )}

                  {activityTab === 'relatorias' && (
                      detailedRelatorias.length > 0 ? detailedRelatorias.map((r, i) => (
                          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                              <div className="flex justify-between mb-1">
                                  <span className="text-[10px] font-black bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded uppercase">{r.billType}</span>
                                  <span className="text-[10px] text-gray-400 font-bold">{new Date(r.date).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 leading-tight">{r.billTitle}</p>
                              <a href={r.externalLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 bg-white dark:bg-gray-700 px-2 py-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                                  Ver Proposta <ExternalLink size={10}/>
                              </a>
                          </div>
                      )) : <p className="text-xs text-gray-400 text-center py-4 font-medium">Nenhuma relatoria neste ano.</p>
                  )}
              </div>
          </div>
      );
  };

  const StatsCard = () => {
      // SENADORES - Ajuste de display para dados vazios
      if (candidate.role === 'Senador') {
          const hasVotes = candidate.stats.projects > 0;
          const hasSpeeches = candidate.speeches && candidate.speeches.length > 0;

          return (
             <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/50 dark:border-white/5 shadow-sm h-full flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Database className="text-blue-500" size={20}/>
                        <h4 className="font-bold text-gray-800 dark:text-white">Atividade no Senado</h4>
                    </div>
                    
                    {hasVotes || hasSpeeches ? (
                        <div className="grid grid-cols-1 gap-4 flex-1">
                            {hasVotes && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-[1.5rem] border border-blue-100 dark:border-blue-800/30 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Votações</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white">{candidate.stats.projects}</p>
                                    </div>
                                </div>
                            )}
                            {hasSpeeches && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-[1.5rem] border border-green-100 dark:border-green-800/30 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Discursos</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white">{candidate.speeches?.length || 0}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-4 text-center">
                            <p className="text-xs text-gray-500 font-medium">Dados de atividade detalhada não disponíveis via API pública neste momento.</p>
                        </div>
                    )}
                </div>
                
                {/* AI BUTTON */}
                <button 
                    onClick={handleAiAnalysis}
                    className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                    <Sparkles size={16}/> Raio-X Google IA
                </button>
             </div>
          );
      }

      // DEPUTADOS
      return (
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/50 dark:border-white/5 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Atividades na Câmara</h4>
                <button 
                    onClick={handleAiAnalysis}
                    className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                    <Sparkles size={12}/> Raio-X IA
                </button>
            </div>
            
            <YearSelector />

            <div className="grid grid-cols-1 gap-4 flex-1">
                <div className="flex gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-[1.5rem] border border-green-100 dark:border-green-800/30 flex-1">
                        <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Presença</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{displayedStats.attendancePct}%</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-[1.5rem] border border-blue-100 dark:border-blue-800/30 flex-1">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Projetos</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{displayedStats.projects}</p>
                    </div>
                </div>
                
                {/* TERMÔMETRO DE GASTOS (NOVO) */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-[1.5rem] border border-yellow-100 dark:border-yellow-800/30">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-1">
                            {selectedYear ? `Gastos em ${selectedYear}` : 'Gastos (Cota Total)'}
                        </p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">R$ {Math.round(displayedStats.spending).toLocaleString('pt-BR')}</p>
                    </div>
                    
                    {!selectedYear && (
                        <SpendingThermometer 
                            current={displayedStats.spending} 
                            average={comparisonData.general} 
                        />
                    )}
                </div>
            </div>
            
            <ActivityList />
        </div>
      );
  };

  const TabButton = ({ id, label, count }: { id: typeof profileTab, label: string, count?: number }) => (
      <button 
        onClick={() => setProfileTab(id)}
        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 relative overflow-hidden group
            ${profileTab === id ? 'text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'}`}
      >
        {profileTab === id && (
            <div className="absolute inset-0 bg-black dark:bg-white rounded-full transition-all duration-300"></div>
        )}
        <span className={`relative z-10 ${profileTab === id ? 'text-white dark:text-black' : ''}`}>{label}</span>
        {count !== undefined && (
            <span className={`relative z-10 text-[10px] py-0.5 px-2 rounded-full transition-colors ${profileTab === id ? 'bg-white/20 text-white dark:bg-black/10 dark:text-black' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {count}
            </span>
        )}
      </button>
  );

  const showSkeleton = loadingDetails && !candidate.civilName && !candidate.cabinet;

  if (showSkeleton) {
      return (
        <div className="w-full h-full bg-white dark:bg-black">
            <SkeletonProfileHeader />
        </div>
      );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-transparent animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] scrollbar-hide pb-32">
      
      {selectedReceipt && (
          <ReceiptModal 
            expense={selectedReceipt} 
            politician={candidate} 
            onClose={() => setSelectedReceipt(null)}
          />
      )}

      {/* AI SEARCH MODAL */}
      {showAiSearch && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowAiSearch(false)}>
              <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
                  <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 flex justify-between items-center text-white shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm"><Sparkles size={20}/></div>
                          <div>
                              <h3 className="font-black text-lg">Raio-X Inteligente</h3>
                              <p className="text-xs font-medium opacity-80">Google Search Grounding</p>
                          </div>
                      </div>
                      <button onClick={() => setShowAiSearch(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto flex-1">
                      {aiLoading ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                              <Loader2 size={48} className="text-purple-600 animate-spin mb-4"/>
                              <p className="text-gray-500 font-bold">Pesquisando e analisando dados recentes...</p>
                              <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns segundos.</p>
                          </div>
                      ) : aiData ? (
                          <div className="space-y-6">
                              <div className="prose dark:prose-invert prose-sm max-w-none">
                                  <p className="text-lg font-medium leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-200">
                                      {aiData.text}
                                  </p>
                              </div>
                              
                              {aiData.sources && aiData.sources.length > 0 && (
                                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                      <h4 className="text-xs font-black uppercase text-gray-400 mb-3 flex items-center gap-2">
                                          <Newspaper size={12}/> Fontes Verificadas
                                      </h4>
                                      <div className="flex flex-col gap-2">
                                          {aiData.sources.map((s, i) => (
                                              <a 
                                                key={i} 
                                                href={s.web?.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block"
                                              >
                                                  {s.web?.title || s.web?.uri}
                                              </a>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="text-center py-12 text-gray-400">
                              <p>Não foi possível carregar as informações.</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 text-center text-[10px] text-gray-400 font-medium">
                      Gerado por IA (Gemini 3.0 Flash). Verifique as fontes.
                  </div>
              </div>
          </div>
      )}

      {/* ... (Header Section Omitted for brevity, unchanged) ... */}
      <div className="relative w-full md:w-[calc(100%-2rem)] mx-auto mt-2 md:mt-4 overflow-hidden rounded-[3rem] shadow-xl bg-gray-900 min-h-[220px] md:min-h-[270px] flex items-end">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-yellow-500 to-blue-800"></div>
          <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg')] bg-cover bg-center opacity-20 mix-blend-soft-light"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90"></div>

          <div className="absolute top-4 left-4 right-4 z-50 bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-full flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95 group border border-transparent hover:border-white/30 text-white">
                    <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform"/>
                </button>
                <div className="hidden md:flex flex-col ml-1">
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none mb-0.5">Perfil Oficial</span>
                    <h2 className="font-black text-sm text-white leading-none truncate max-w-[200px]">{candidate.name}</h2>
                </div>
            </div>
            <div className="flex gap-2">
                 {/* FOLLOW BUTTON */}
                 {onToggleFollow && (
                     <button 
                        onClick={onToggleFollow}
                        className={`px-4 py-2.5 rounded-full transition-all active:scale-95 text-xs font-bold flex items-center gap-2 border shadow-lg ${isFollowing 
                            ? 'bg-red-500 text-white border-red-400 hover:bg-red-600' 
                            : 'bg-white/20 text-white border-white/10 hover:bg-white/30'}`}
                     >
                        <Heart size={16} className={isFollowing ? 'fill-white' : ''} /> 
                        <span className="hidden sm:inline">{isFollowing ? 'Seguindo' : 'Seguir'}</span>
                     </button>
                 )}
                 <button onClick={() => setShowAuditModal(true)} className="px-4 py-2.5 bg-white/20 text-white hover:bg-white/30 rounded-full transition-colors active:scale-95 text-xs font-bold flex items-center gap-2 border border-white/10 hidden sm:flex">
                    <Code size={16} /> <span className="hidden sm:inline">Auditar</span>
                 </button>
                 <button onClick={() => onCompare(candidate)} className="px-4 py-2.5 bg-white/20 text-white hover:bg-white/30 rounded-full transition-colors active:scale-95 text-xs font-bold flex items-center gap-2 border border-white/10">
                     <ArrowLeftRight size={16}/> <span className="hidden sm:inline">Comparar</span>
                 </button>
                 <button onClick={onShare} className="px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-full transition-colors active:scale-95 text-xs font-bold flex items-center gap-2 border border-green-500 shadow-lg">
                     <Share2 size={16}/> <span className="hidden sm:inline">Compartilhar</span>
                 </button>
            </div>
          </div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto pb-6 px-6 md:px-12 flex flex-col md:flex-row items-end gap-6 pt-20">
              <div className="shrink-0 flex items-end">
                  <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-[6px] border-white/20 shadow-2xl overflow-hidden bg-gray-800 relative pointer-events-none">
                      <img 
                          src={candidate.photo} 
                          className="w-full h-full object-cover" 
                          alt={candidate.name} 
                          onError={(e) => {
                              e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
                          }}
                      />
                  </div>
              </div>

              <div className="flex-1 text-center md:text-left text-white mb-2">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                      <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 uppercase tracking-wider">{candidate.party}</span>
                      <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 uppercase tracking-wider">{genderedRole}</span>
                      <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 uppercase tracking-wider">{candidate.state}</span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center md:items-end gap-4 mb-3">
                      <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none drop-shadow-lg">{candidate.name}</h1>
                      
                      {/* BOTÃO LINK PERFIL OFICIAL */}
                      <a 
                        href={candidate.externalLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-white text-black hover:bg-gray-200 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors shadow-lg"
                      >
                          Ver Perfil Oficial <ExternalLink size={10}/>
                      </a>
                  </div>
                  
                  {candidate.matchScore > 0 && (
                      <div className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-full font-bold shadow-lg shadow-green-500/30 animate-pulse text-sm">
                          <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
                          {candidate.matchScore}% de Afinidade
                      </div>
                  )}
              </div>

              {/* TEMPO DE MANDATO (MOVIDO PARA HEADER) */}
              <div className="hidden md:block bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 w-60 shrink-0 mb-2">
                  <div className="flex justify-between text-white/80 text-[10px] uppercase font-bold mb-2">
                      <span className="flex items-center gap-1"><Clock size={12}/> Mandato</span>
                      <span>{timeLeft}</span>
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]" style={{ width: `${mandateProgress}%` }}></div>
                  </div>
              </div>

          </div>
      </div>

      <div className="px-4 md:px-8 pb-32 max-w-[1800px] mx-auto mt-8 relative z-20">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <ContactCard />
               
               <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/50 dark:border-white/5 shadow-sm space-y-5 flex flex-col">
                   <h3 className="font-black text-gray-900 dark:text-white text-lg border-b border-gray-100 dark:border-gray-700/50 pb-3">Sobre</h3>
                   
                   <div className="space-y-4 flex-1">
                       <div>
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Nome Civil</p>
                           <p className="text-sm font-bold text-gray-800 dark:text-white">{candidate.civilName || candidate.name}</p>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <p className="text-[10px] text-gray-400 font-bold uppercase">Naturalidade</p>
                               <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{candidate.birthCity ? `${candidate.birthCity} - ${candidate.birthState}` : 'Não informado'}</p>
                           </div>
                           <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Nascimento</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{candidate.birthDate || 'N/A'}</p>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 shrink-0"><GraduationCap size={18} /></div>
                            <div><p className="text-[10px] text-gray-400 font-bold uppercase">Escolaridade</p><p className="text-sm font-bold text-gray-800 dark:text-white">{candidate.education || 'Não informado'}</p></div>
                       </div>

                       {/* NOVO: CARREIRA (Histórico Ocupacional) */}
                       {candidate.occupations && candidate.occupations.length > 0 && (
                           <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
                               <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Carreira Prévia</p>
                               <div className="flex flex-wrap gap-2">
                                   {candidate.occupations.slice(0, 3).map((job, i) => (
                                       <span key={i} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                           <BriefcaseBusiness size={10}/> {job.title}
                                       </span>
                                   ))}
                                   {candidate.occupations.length > 3 && <span className="text-[10px] text-gray-400 font-bold">+{candidate.occupations.length - 3}</span>}
                               </div>
                           </div>
                       )}

                       {/* NOVO: SUPLENTES (SENADO) */}
                       {candidate.suplentes && candidate.suplentes.length > 0 && (
                           <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
                               <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Suplentes (Em caso de licença)</p>
                               <div className="flex flex-col gap-1">
                                   {candidate.suplentes.map((sup, i) => (
                                       <div key={i} className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                                           <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div> {sup}
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}
                   </div>
               </div>
               
               <StatsCard />
          </div>

          <div className="min-w-0">
              <div className="sticky top-0 z-30 mx-auto max-w-full mb-6 pt-2 pb-2 pointer-events-none">
                  <div className="relative z-10 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl p-1.5 rounded-full border border-white/50 dark:border-white/10 shadow-lg overflow-x-auto scrollbar-hide flex gap-1 justify-start md:justify-center pointer-events-auto">
                     <TabButton id="timeline" label="Timeline" />
                     {candidate.roles && candidate.roles.length > 0 && (
                        <TabButton id="roles" label="Cargos" count={candidate.roles?.length} />
                     )}
                     <TabButton id="assets" label="Patrimônio" />
                     
                     {candidate.bills && candidate.bills.length > 0 && (
                        <TabButton id="projects" label="Projetos" count={candidate.bills?.length} />
                     )}
                     
                     {candidate.expensesBreakdown && candidate.expensesBreakdown.length > 0 && (
                        <TabButton id="money" label="Gastos" />
                     )}

                     {candidate.speeches && candidate.speeches.length > 0 && (
                        <TabButton id="speeches" label="Falas" count={candidate.speeches?.length} />
                     )}

                     {candidate.fronts && candidate.fronts.length > 0 && (
                        <TabButton id="fronts" label="Frentes" count={candidate.fronts.length} />
                     )}
                  </div>
              </div>

              <div className="space-y-6 min-h-[50vh]">
                  {profileTab === 'timeline' && (
                      <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                          {candidate.timeline && candidate.timeline.length > 0 ? (
                              <div className="relative">
                                  <div className="space-y-0 pb-10">
                                      {candidate.timeline.map((item) => <TimelineCard key={item.id} item={item} />)}
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 dark:from-black/20 to-transparent pointer-events-none rounded-b-[2rem]"></div>
                              </div>
                          ) : (
                              <div className="text-center py-20 text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700">
                                  <Clock size={48} className="mx-auto mb-4 opacity-20"/>
                                  <p className="font-bold text-sm">Linha do tempo indisponível.</p>
                                  <p className="text-xs mt-1 opacity-70 max-w-[250px] mx-auto">
                                      {candidate.hasApiIntegration 
                                          ? 'Ainda não há dados recentes para este perfil.' 
                                          : `Dados detalhados do Executivo não são centralizados via API.`}
                                  </p>
                              </div>
                          )}
                      </div>
                  )}

                  {/* ... (Outras abas mantidas inalteradas, omitidas por brevidade no diff) ... */}
                  {profileTab === 'roles' && (
                      <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {candidate.roles && candidate.roles.length > 0 ? candidate.roles.map((role, idx) => {
                              const isTitular = role.title.toLowerCase().includes('titular');
                              const isPresidente = role.title.toLowerCase().includes('presidente') || role.title.toLowerCase().includes('líder');
                              
                              return (
                                  <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                                      <div>
                                          <div className="flex justify-between items-start mb-3">
                                              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 ${
                                                  isPresidente ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                  isTitular ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                              }`}>
                                                  {isPresidente && <Star size={10} className="fill-current"/>}
                                                  {role.title}
                                              </span>
                                              <span className="text-[10px] font-bold text-gray-400">{role.acronym}</span>
                                          </div>
                                          <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight mb-2">{role.name}</h4>
                                          <p className="text-xs text-gray-500 font-medium">{role.type}</p>
                                      </div>
                                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                          <Calendar size={12}/> Desde {new Date(role.startDate).toLocaleDateString('pt-BR')}
                                      </div>
                                  </div>
                              )
                          }) : (
                              <div className="col-span-2 text-center py-20 text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700">
                                  <BriefcaseBusiness size={48} className="mx-auto mb-4 opacity-20"/>
                                  <p className="font-bold text-sm">Nenhum cargo ou comissão registrado atualmente.</p>
                              </div>
                          )}
                      </div>
                  )}

                  {profileTab === 'assets' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                           <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[2rem] border border-amber-200 dark:border-amber-800/50 flex flex-col md:flex-row gap-5 items-start shadow-sm mb-6">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full shrink-0">
                                    <Lock size={24}/>
                                </div>
                                <div>
                                    <h3 className="font-black text-amber-900 dark:text-amber-300 text-lg mb-1">Dados de Patrimônio</h3>
                                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed opacity-90">
                                        Por questões de segurança da API do Tribunal Superior Eleitoral (DivulgaCand), o acesso automatizado a bens e doações é restrito. Para garantir a veracidade, consulte diretamente a fonte oficial.
                                    </p>
                                    <a href="https://divulgacandcontas.tse.jus.br/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-4 py-2 rounded-full text-xs font-bold hover:bg-amber-300 transition-colors">
                                        Acessar DivulgaCand (TSE) <ExternalLink size={12}/>
                                    </a>
                                </div>
                           </div>
                      </div>
                  )}

                  {profileTab === 'projects' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
                          {candidate.bills && candidate.bills.length > 0 ? (
                              <div className="space-y-4 pb-4">
                                  {candidate.bills.map((bill, idx) => (
                                      <a key={idx} href={bill.externalLink} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-all shadow-sm group hover:shadow-xl hover:scale-[1.01]">
                                          <div className="flex justify-between items-start mb-4">
                                              <span className="text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/30 px-4 py-1.5 rounded-full flex items-center gap-1 shadow-sm">{bill.type} {bill.number}/{bill.year} <ExternalLink size={10}/></span>
                                              
                                              {/* TOOLTIP DE STATUS */}
                                              <div className="relative group/tooltip">
                                                  <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border cursor-help ${getStatusColor(bill.status)}`}>
                                                      {bill.status}
                                                  </span>
                                                  <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-900 text-white text-[10px] p-3 rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 text-right shadow-xl border border-gray-700">
                                                      <p className="font-bold mb-1 text-gray-300">O que significa?</p>
                                                      {getBillStatusTooltip(bill.status)}
                                                      <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900"></div>
                                                  </div>
                                              </div>

                                          </div>
                                          <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-xl leading-tight group-hover:text-green-600 transition-colors">{bill.title}</h4>
                                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                            {bill.description.split(' ').map((word, i) => (
                                                <React.Fragment key={i}><Glossary term={word.replace(/[.,]/g, '')}>{word}</Glossary>{' '}</React.Fragment>
                                            ))}
                                          </p>
                                      </a>
                                  ))}
                              </div>
                          ) : <div className="text-center py-20 text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700">Nenhum projeto recente encontrado na API.</div>}
                      </div>
                  )}

                  {profileTab === 'money' && (
                       <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pr-2">
                           <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-xl flex flex-col items-center relative overflow-hidden">
                               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-10">Raio-X dos Gastos</h3>
                               {candidate.expensesBreakdown && candidate.expensesBreakdown.length > 0 ? (
                                   <div className="relative w-full max-w-[320px] aspect-square mb-10 group">
                                        <svg viewBox="0 0 40 40" className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                                            <circle cx="20" cy="20" r="15.91549430918954" fill="transparent" stroke="#e5e7eb" strokeWidth="4" className="dark:stroke-gray-700 opacity-20" />
                                            {chartSegments.map((segment, i) => (
                                                <circle key={i} cx="20" cy="20" r="15.91549430918954" fill="transparent" stroke={segment.color} strokeWidth={hoveredExpenseIndex === i ? "6" : "4"} strokeDasharray={`${segment.percent} ${100 - segment.percent}`} strokeDashoffset={segment.offset} strokeLinecap="round" className="transition-all duration-500 ease-out cursor-pointer hover:opacity-80" onMouseEnter={() => setHoveredExpenseIndex(i)} onMouseLeave={() => setHoveredExpenseIndex(null)}/>
                                            ))}
                                        </svg>
                                        <div className="absolute inset-6 bg-white dark:bg-gray-800 rounded-full flex flex-col items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.05)] z-10 pointer-events-none transition-all duration-300 border border-gray-100 dark:border-gray-700">
                                            <span className="text-2xl font-black text-gray-900 dark:text-white">R$ {Math.round(activeExpense ? activeExpense.value : candidate.stats.spending).toLocaleString()}</span>
                                        </div>
                                   </div>
                               ) : (
                                   <div className="text-center py-12"><Banknote size={32} className="mx-auto mb-4 opacity-20"/><p>Sem dados de gastos recentes.</p></div>
                               )}
                           </div>

                           {/* CARD DE CONTEXTO IBGE */}
                           {candidate.expensesBreakdown && candidate.expensesBreakdown.length > 0 && (
                                <IBGEContextCard 
                                    spending={candidate.stats.spending} 
                                    state={candidate.state}
                                />
                           )}

                           {/* NOVO: TOP FORNECEDORES (RANKING FINANCEIRO) */}
                           {topSuppliers.length > 0 && (
                               <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
                                   <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                                       <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600"><PieChart size={16}/></div>
                                       <div>
                                           <h3 className="font-bold text-gray-900 dark:text-white">Quem recebe?</h3>
                                           <p className="text-[10px] text-gray-500 font-bold uppercase">Maiores fornecedores (mês)</p>
                                       </div>
                                   </div>
                                   <div className="space-y-3">
                                       {topSuppliers.map((sup, idx) => (
                                           <div key={idx} className="flex items-center justify-between">
                                               <div className="flex items-center gap-3">
                                                   <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">#{idx + 1}</div>
                                                   <span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate max-w-[150px] md:max-w-[200px]">{sup.name}</span>
                                               </div>
                                               <span className="text-xs font-black text-gray-900 dark:text-white">R$ {sup.val.toLocaleString('pt-BR')}</span>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           )}

                           {/* NOVO: GRAFICO DE LINHA (EVOLUCAO) */}
                           {candidate.expensesHistory && candidate.expensesHistory.length > 0 && (
                               <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden">
                                   <div className="flex items-center gap-2 mb-2">
                                       <TrendingUp size={20} className="text-blue-500" />
                                       <h3 className="font-bold text-gray-900 dark:text-white">Evolução Mensal</h3>
                                   </div>
                                   <SimpleLineChart data={candidate.expensesHistory} />
                               </div>
                           )}

                           <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
                                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-4 pl-2 border-l-4 border-blue-500">Últimos Recibos (Oficiais)</h3>
                                <div className="space-y-3">
                                    {candidate.timeline && candidate.timeline.filter(t => t.type === 'despesa').length > 0 ? (
                                        candidate.timeline.filter(t => t.type === 'despesa').slice(0, 10).map((receipt, idx) => {
                                            const numericValue = parseFloat(receipt.value?.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
                                            const isHighValue = numericValue > 2000;

                                            return (
                                                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{receipt.title}</p>
                                                            {isHighValue && (
                                                                <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <AlertTriangle size={8} /> ALERTA
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{receipt.description}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(receipt.date).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                                        <p className="font-black text-blue-600 dark:text-blue-400 text-sm">{receipt.value}</p>
                                                        <div className="flex gap-2">
                                                            {receipt.link && (
                                                                <a href={receipt.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-500 bg-white dark:bg-gray-800 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm transition-transform active:scale-95">
                                                                    Ver Nota <ExternalLink size={10}/>
                                                                </a>
                                                            )}
                                                            <button 
                                                                onClick={() => setSelectedReceipt(receipt)}
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-full shadow-sm transition-transform active:scale-95"
                                                            >
                                                                Comprovante <Printer size={10}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center text-gray-400 py-4">Nenhum recibo recente encontrado na API.</p>
                                    )}
                                </div>
                           </div>
                       </div>
                  )}

                  {profileTab === 'speeches' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                          {/* NOVO: CLOUD DE TOPICOS (DNA DO MANDATO) */}
                          {candidate.speeches && candidate.speeches.length > 0 && (
                              <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                                  <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
                                          <MessageSquare size={20}/>
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">DNA do Mandato</h3>
                                          <p className="text-xs text-gray-500">Os temas mais abordados nos discursos recentes.</p>
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 justify-center">
                                      {Array.from(new Set(candidate.speeches.flatMap(s => s.keywords || []))).slice(0, 15).map((kw, i) => {
                                          const size = i < 3 ? 'text-lg px-4 py-2 bg-purple-100 text-purple-700 border-purple-200' : i < 7 ? 'text-sm px-3 py-1.5 bg-gray-100 text-gray-700 border-gray-200' : 'text-xs px-2 py-1 bg-gray-50 text-gray-500 border-gray-100';
                                          const darkClass = i < 3 ? 'dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
                                          
                                          return (
                                              <span key={i} className={`rounded-full font-black border uppercase tracking-wide ${size} ${darkClass}`}>
                                                  #{kw}
                                              </span>
                                          )
                                      })}
                                  </div>
                              </div>
                          )}

                          {candidate.speeches && candidate.speeches.length > 0 ? (
                              <>
                              <div className="space-y-6 pb-4">
                                  {candidate.speeches.map((speech, idx) => (
                                      <div key={idx} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
                                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Mic2 size={64}/></div>
                                          <div className="flex justify-between items-start mb-3">
                                              <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full uppercase tracking-wider">{speech.type}</span>
                                              <span className="text-xs font-bold text-gray-400">{new Date(speech.date).toLocaleDateString('pt-BR')}</span>
                                          </div>
                                          <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed italic mb-6">"{speech.summary}"</p>
                                          <a href={speech.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black px-6 py-3 rounded-full hover:opacity-80 transition-opacity shadow-lg">
                                              Ler Transcrição <ExternalLink size={12}/>
                                          </a>
                                      </div>
                                  ))}
                                  <button 
                                      onClick={handleLoadMoreSpeeches} 
                                      disabled={loadingSpeeches}
                                      className="w-full py-4 rounded-[1.5rem] bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex justify-center gap-2"
                                  >
                                      {loadingSpeeches ? <Loader2 className="animate-spin" size={20}/> : <Plus size={20}/>}
                                      Carregar mais discursos
                                  </button>
                              </div>
                              </>
                          ) : <div className="text-center py-20 text-gray-400">Nenhum discurso recente encontrado.</div>}
                      </div>
                  )}

                  {profileTab === 'fronts' && (
                       <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 grid grid-cols-1 md:grid-cols-2 gap-4">
                           {candidate.fronts && candidate.fronts.length > 0 ? candidate.fronts.map(front => (
                               <a key={front.id} href={front.externalLink} target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg transition-all flex items-center gap-4 group h-fit">
                                   <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 group-hover:text-green-600 group-hover:bg-green-50 dark:group-hover:bg-green-900/30 transition-colors shrink-0">
                                       <Users size={20} />
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-gray-800 dark:text-white text-sm leading-tight group-hover:text-green-600 transition-colors">{front.title}</h4>
                                   </div>
                               </a>
                           )) : (
                               <div className="col-span-2 text-center py-20 text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700">
                                   Não participa de frentes parlamentares registradas.
                               </div>
                           )}
                       </div>
                  )}

              </div>
          </div>
      </div>

      {showAuditModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setShowAuditModal(false)}>
              <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-0 max-w-lg w-full shadow-2xl relative border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[80vh] scale-100 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <div><h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Code size={20} className="text-green-600" /> Auditoria Cidadã</h3></div>
                      <button onClick={() => setShowAuditModal(false)} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto font-mono text-xs bg-[#0d1117] text-green-400">
                      <pre className="whitespace-pre-wrap break-all leading-relaxed">{JSON.stringify(candidate, null, 2)}</pre>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProfileView;
