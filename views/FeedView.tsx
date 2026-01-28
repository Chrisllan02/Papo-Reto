
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Landmark, Banknote, Lightbulb, Filter, ArrowRight, ExternalLink, ChevronDown, CheckCircle2, XCircle, Clock, X, Share2, User, Sparkles, Loader2, MapPin, Thermometer, Volume2, VolumeX, Newspaper, ScrollText, Activity, Radio, Users, LocateFixed, Zap, GraduationCap, HeartPulse, Shield, Briefcase, Leaf, Gavel, Cpu, Palette, Bus, Plane, Scale, BookOpen } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { speakContent } from '../services/ai';
import NewsTicker from '../components/NewsTicker';
import { useAppContext } from '../contexts/AppContext';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: any[];
  onSelectCandidate: (pol: Politician) => void;
  onEducationClick: (id: number) => void;
  onSeeMore: () => void;
  onGoToExplore: (state: string) => void;
}

// 1. Dicionário Constitucional
const CONSTITUTION_TOPICS: Record<string, { art: string, text: string }> = {
    'educação': { art: 'Art. 205', text: 'A educação é direito de todos e dever do Estado.' },
    'escola': { art: 'Art. 206', text: 'Ensino será ministrado com igualdade de condições.' },
    'saúde': { art: 'Art. 196', text: 'A saúde é direito de todos e dever do Estado.' },
    'sus': { art: 'Art. 198', text: 'Ações e serviços públicos de saúde integram uma rede regionalizada.' },
    'segurança': { art: 'Art. 144', text: 'Segurança pública é dever do Estado e responsabilidade de todos.' },
    'polícia': { art: 'Art. 144', text: 'Segurança pública é exercida para a preservação da ordem pública.' },
    'orçamento': { art: 'Art. 165', text: 'Leis de iniciativa do Executivo estabelecerão o plano plurianual.' },
    'dinheiro': { art: 'Art. 165', text: 'Orçamento fiscal referente aos poderes da União.' },
    'imposto': { art: 'Art. 145', text: 'A União, Estados e Municípios podem instituir tributos.' },
    'tribut': { art: 'Art. 145', text: 'O sistema tributário deve respeitar a capacidade econômica.' },
    'meio ambiente': { art: 'Art. 225', text: 'Todos têm direito ao meio ambiente ecologicamente equilibrado.' },
    'floresta': { art: 'Art. 225', text: 'Dever de defender e preservar o ambiente para futuras gerações.' },
    'trabalho': { art: 'Art. 6º', text: 'São direitos sociais a educação, a saúde e o trabalho.' },
    'salário': { art: 'Art. 7º', text: 'Direito a salário mínimo, fixado em lei.' },
    'cultura': { art: 'Art. 215', text: 'O Estado garantirá a todos o pleno exercício dos direitos culturais.' },
    'índio': { art: 'Art. 231', text: 'São reconhecidos aos índios sua organização social e terras.' },
    'indígena': { art: 'Art. 231', text: 'São reconhecidos aos índios sua organização social e terras.' },
    'mulher': { art: 'Art. 5º, I', text: 'Homens e mulheres são iguais em direitos e obrigações.' },
    'internet': { art: 'Art. 5º', text: 'É livre a manifestação do pensamento, vedado o anonimato.' },
    'transporte': { art: 'Art. 6º', text: 'Transporte é um direito social constitucional.' }
};

const LEGISLATIVE_TYPES: Record<string, string> = {
    'PEC': 'Esta é uma Proposta de Emenda à Constituição. É a mudança mais difícil e poderosa das leis, exigindo 3/5 dos votos para passar. Altera a base do país.',
    'PL': 'Este é um Projeto de Lei Ordinária. Define as regras do dia a dia. Precisa da maioria simples dos presentes para ser aprovado.',
    'MPV': 'Medida Provisória: tem força de lei imediata e é assinada pelo Presidente. O Congresso precisa confirmar depois.',
    'PLP': 'Projeto de Lei Complementar: detalha regras específicas exigidas pela Constituição. Requer maioria absoluta (257 deputados).',
    'PDL': 'Projeto de Decreto Legislativo: competência exclusiva do Congresso, geralmente para tratar de tratados internacionais ou sustar atos do Presidente.',
    'REQ': 'Requerimento: um pedido formal feito por parlamentares para cobrar informações, criar comissões ou mudar a pauta.'
};

const getCategoryIcon = (text: string) => {
    const t = text.toLowerCase();
    
    if (t.includes('educação') || t.includes('escola') || t.includes('ensino') || t.includes('fundeb')) 
        return { icon: GraduationCap, label: 'Educação', color: 'text-nuit dark:text-blue-400', bg: 'bg-nuit/10 dark:bg-blue-900/30' };
    
    if (t.includes('saúde') || t.includes('sus') || t.includes('médico') || t.includes('hospital') || t.includes('vacina')) 
        return { icon: HeartPulse, label: 'Saúde', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100/50 dark:bg-red-900/30' };
    
    if (t.includes('economia') || t.includes('tribut') || t.includes('imposto') || t.includes('dinheiro') || t.includes('orçamento') || t.includes('fiscal')) 
        return { icon: Banknote, label: 'Economia', color: 'text-picture dark:text-green-400', bg: 'bg-picture/10 dark:bg-green-900/30' };
    
    if (t.includes('segurança') || t.includes('polícia') || t.includes('crime') || t.includes('pena') || t.includes('armas')) 
        return { icon: Shield, label: 'Segurança', color: 'text-midnight dark:text-gray-300', bg: 'bg-gray-200/50 dark:bg-gray-800/50' };
    
    if (t.includes('trabalho') || t.includes('emprego') || t.includes('salário') || t.includes('clt')) 
        return { icon: Briefcase, label: 'Trabalho', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100/50 dark:bg-orange-900/30' };
    
    if (t.includes('ambiente') || t.includes('floresta') || t.includes('animais') || t.includes('clima') || t.includes('água')) 
        return { icon: Leaf, label: 'Ambiente', color: 'text-mantis dark:text-mantis', bg: 'bg-mantis/20 dark:bg-emerald-900/30' };
    
    if (t.includes('justiça') || t.includes('lei') || t.includes('direito') || t.includes('código') || t.includes('constituição')) 
        return { icon: Gavel, label: 'Legislação', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100/50 dark:bg-purple-900/30' };

    return { icon: Activity, label: 'Atividade', color: 'text-nuit dark:text-blue-400', bg: 'bg-gray-100/50 dark:bg-gray-800/50' };
};

const formatCardTitle = (title: string, type: string) => {
    if (type === 'despesa') return title;

    let clean = title.trim();

    if (clean.match(/^Retirado o Requerimento/i)) return "Requerimento Retirado da Pauta";
    if (clean.match(/^Aprovado o Requerimento de Urgência/i)) return "Urgência Aprovada";
    if (clean.match(/^Indeferido o Requerimento/i)) return "Pedido Negado";
    if (clean.match(/^Deferido o Requerimento/i)) return "Pedido Aceito";
    if (clean.match(/^Aprovada a Redação Final/i)) return "Texto Final Aprovado";
    if (clean.match(/^Encaminhada à publicação/i)) return "Projeto Publicado";
    if (clean.match(/^Designado Relator/i)) return "Relator Escolhido";
    if (clean.match(/^Parecer.*aprovado/i)) return "Parecer Aprovado";
    if (clean.match(/^Novo Despacho/i)) return "Atualização de Tramitação";
    if (clean.match(/^Rejeitado o Requerimento/i)) return "Pedido Rejeitado";

    clean = clean
        .replace(/^Institui a /i, '')
        .replace(/^Institui o /i, '')
        .replace(/^Dispõe sobre a /i, '')
        .replace(/^Dispõe sobre o /i, '')
        .replace(/^Altera a Lei /i, 'Alteração na Lei ')
        .replace(/n\.º? ?/gi, '')
        .replace(/\/\d{4}/, '');

    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    if (clean.length > 60) return clean.substring(0, 60) + '...';
    return clean;
};

const getDidacticContext = (title: string, description: string | undefined, type: string) => {
    if (type === 'despesa') {
        const desc = description || '';
        if (desc.includes('Emissão Bilhete Aéreo')) return { text: "✈️ Compra de passagens aéreas com dinheiro público.", const: null };
        if (desc.includes('Combustíveis')) return { text: "⛽ Abastecimento de veículos oficiais do gabinete.", const: null };
        if (desc.includes('Telefonia')) return { text: "📞 Pagamento de contas de telefone e internet móvel.", const: null };
        if (desc.includes('Divulgação')) return { text: "📢 Gastos com publicidade do mandato (redes sociais, panfletos).", const: null };
        return { text: desc || "Gasto operacional do gabinete.", const: null };
    }

    let text = description || title || "";
    let didacticText = "";
    let constitutionRef = null;

    let legislativeExplanation = "";
    if (text.includes('PEC') || title.includes('PEC')) legislativeExplanation = LEGISLATIVE_TYPES['PEC'];
    else if (text.includes('MPV') || title.includes('MPV')) legislativeExplanation = LEGISLATIVE_TYPES['MPV'];
    else if (text.includes('PLP') || title.includes('PLP')) legislativeExplanation = LEGISLATIVE_TYPES['PLP'];
    else if (text.includes('PDL') || title.includes('PDL')) legislativeExplanation = LEGISLATIVE_TYPES['PDL'];
    else if (text.includes('Projeto de Lei') || title.includes('PL')) legislativeExplanation = LEGISLATIVE_TYPES['PL'];
    else if (text.includes('Requerimento') || title.includes('REQ')) legislativeExplanation = LEGISLATIVE_TYPES['REQ'];

    const dictionary = [
        { regex: /Retirado o Requerimento.*em raz[ãa]o do deferimento.*/i, replace: "❌ Pedido cancelado pois um novo mais atual foi aceito." },
        { regex: /Retirado de pauta.*/i, replace: "⏹️ Votação adiada: o tema foi retirado da discussão de hoje." },
        { regex: /Rejeitado o Requerimento.*/i, replace: "👎 O pedido foi negado pela maioria ou pela Mesa." },
        { regex: /Deferido o Requerimento.*/i, replace: "✅ Pedido aceito! A solicitação do deputado foi atendida." },
        { regex: /Aprovado o Requerimento de Urgência.*/i, replace: "🔥 Urgência Aprovada: Este projeto vai pular a fila das comissões." },
        { regex: /Designado Relator.*/i, replace: "👤 Um deputado foi escolhido para analisar este projeto e dar seu parecer." },
        { regex: /Parecer.*pela aprovação/i, replace: "✅ O relator analisou e recomenda a APROVAÇÃO deste projeto." },
        { regex: /Parecer.*pela rejeição/i, replace: "❌ O relator analisou e recomenda a REJEIÇÃO deste projeto." },
        { regex: /Encaminhada à publicação.*/i, replace: "📄 O texto oficial foi publicado no diário da Câmara." },
        { regex: /Arquivado.*/i, replace: "🗄️ Projeto encerrado/arquivado e não deve virar lei por enquanto." },
        { regex: /Aprovada a Redação Final.*/i, replace: "📝 Texto final revisado e aprovado. Próximo passo: Senado ou Sanção." },
        { regex: /Remessa ao Senado Federal.*/i, replace: "🚀 Aprovado na Câmara! O projeto segue agora para o Senado." },
        { regex: /Transformado na Lei Ordinária.*/i, replace: "🏆 VITÓRIA: O projeto foi aprovado e virou Lei!" },
        { regex: /^Altera a Lei.*/i, replace: "Propõe mudanças em uma lei que já existe." },
        { regex: /^Institui.*/i, replace: "Cria um novo programa, data comemorativa ou regra." }
    ];

    let translatedStatus = "";
    for (const rule of dictionary) {
        if (rule.regex.test(text)) {
            translatedStatus = rule.replace;
            break;
        }
    }
    
    if (!translatedStatus) {
        translatedStatus = text.replace(/Requerimento n\. \d+(\/\d+)?/gi, "o pedido").substring(0, 100) + (text.length > 100 ? "..." : "");
    }

    const fullTextSearch = (title + " " + text).toLowerCase();
    for (const key in CONSTITUTION_TOPICS) {
        if (fullTextSearch.includes(key)) {
            constitutionRef = CONSTITUTION_TOPICS[key];
            break; 
        }
    }

    didacticText = translatedStatus;
    if (legislativeExplanation) {
        didacticText += " " + legislativeExplanation;
    }

    return { 
        text: didacticText, 
        constitution: constitutionRef,
        isExpense: false
    };
};

const AudioPlayer = ({ text, isDarkText }: { text: string, isDarkText: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const handlePlay = async () => {
        if (isPlaying) {
            sourceNodeRef.current?.stop();
            setIsPlaying(false);
            return;
        }

        setIsLoading(true);
        try {
            const audioData = await speakContent(text);
            if (!audioData) throw new Error("Audio generation failed");

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }

            const buffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => setIsPlaying(false);
            source.start();
            sourceNodeRef.current = source;
            setIsPlaying(true);
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar áudio. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    }

    return (
        <button 
            onClick={handlePlay}
            disabled={isLoading}
            aria-label={isPlaying ? "Parar áudio" : "Ouvir conteúdo"}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center gap-2 backdrop-blur-md border border-white/20 shadow-lg ${isPlaying ? 'bg-orange-500/80 text-white animate-pulse' : (isDarkText ? 'bg-white/50 text-midnight hover:bg-white/80' : 'bg-white/50 dark:bg-nuit/30 text-nuit dark:text-blue-400 hover:bg-white/80')}`}
        >
            {/* Optical Alignment: Icons centered, text slightly offset if needed */}
            {isLoading ? <Loader2 className="animate-spin" size={18}/> : isPlaying ? <VolumeX size={18}/> : <Volume2 size={18}/>}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline pt-[1px]">
                {isLoading ? "Processando..." : isPlaying ? "Ouvindo" : "Ouvir"}
            </span>
        </button>
    );
};

const FeedDetailModal = ({ item, politician, onClose, onGoToProfile }: { item: FeedItem, politician?: Politician, onClose: () => void, onGoToProfile: (p: Politician) => void }) => {
    const isVote = item.type === 'voto';
    const isExpense = item.type === 'despesa';
    const isLightBg = !isVote && !isExpense; 

    const [visible, setVisible] = useState(false);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    const didacticContent = useMemo(() => getDidacticContext(item.title, item.description, item.type), [item]);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        closeBtnRef.current?.focus();
    }, []);

    return (
        <div 
            className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-midnight/60 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} 
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className={`glass-card dark:bg-midnight backdrop-blur-3xl w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl dark:shadow-[0_-20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col max-h-[95dvh] md:max-h-[85dvh] transition-transform duration-500 ease-out border border-white/20 dark:border-white/10 ${visible ? 'translate-y-0' : 'translate-y-full md:scale-95'}`}>
                <div className="md:hidden w-12 h-1.5 bg-gray-300/50 dark:bg-gray-700/50 rounded-full mx-auto my-4 shrink-0" aria-hidden="true"></div>
                
                <div className={`h-24 md:h-32 shrink-0 relative flex items-start justify-end p-6 ${isVote ? 'bg-nuit/90' : isExpense ? 'bg-orange-600/90' : 'bg-spring/90'} backdrop-blur-md`}>
                    <div className="absolute top-6 left-6 z-50 flex gap-2">
                        <AudioPlayer text={`${item.title}. ${didacticContent.text}`} isDarkText={isLightBg} />
                    </div>
                    <button 
                        ref={closeBtnRef}
                        onClick={onClose} 
                        aria-label="Fechar Detalhes"
                        className={`p-2.5 rounded-full transition-colors backdrop-blur-md border border-white/10 ${isLightBg ? 'bg-white/30 text-midnight hover:bg-white/50' : 'bg-black/20 hover:bg-black/40 text-white'}`}
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
                        <div className="bg-nuit/5 dark:bg-nuit/10 p-6 rounded-3xl border border-nuit/10 dark:border-nuit/20 backdrop-blur-md relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-nuit"></div>
                            <p className="text-midnight dark:text-blue-100 text-base md:text-lg font-medium leading-relaxed">
                                {didacticContent.text}
                            </p>
                        </div>

                        {didacticContent.constitution && (
                            <div className="bg-spring/20 dark:bg-spring/5 p-6 rounded-3xl border border-spring/50 dark:border-spring/10 backdrop-blur-md relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-spring"></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Scale size={16} className="text-yellow-800 dark:text-spring" />
                                    <span className="text-xs font-black uppercase tracking-wider text-yellow-800 dark:text-spring">Na Constituição ({didacticContent.constitution.art})</span>
                                </div>
                                <p className="text-midnight dark:text-yellow-100 text-sm md:text-base font-medium leading-relaxed italic">
                                    "{didacticContent.constitution.text}"
                                </p>
                            </div>
                        )}
                    </div>

                    {isExpense && item.amount && (
                        <div className="mb-8 p-6 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-white/10 flex items-center justify-between">
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

                    <div className="text-gray-600 dark:text-gray-400 font-medium leading-loose mb-8 text-sm md:text-base">
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

const StateSpotlightWidget = ({ politicians, onSelectCandidate, onGoToExplore }: { politicians: Politician[], onSelectCandidate: (p: Politician) => void, onGoToExplore: (state: string) => void }) => {
    const { state: appState } = useAppContext();
    const { userLocation } = appState;
    
    const [selectedState, setSelectedState] = useState<string>('');
    const [statePoliticians, setStatePoliticians] = useState<Politician[]>([]);
    const [isLocal, setIsLocal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!politicians || politicians.length === 0) return;

        const updateState = (uf: string, local: boolean) => {
            setSelectedState(uf);
            setIsLocal(local);
            const filtered = politicians
                .filter(p => p.state === uf)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            setStatePoliticians(filtered);
            setIsLoading(false);
        };

        if (userLocation) {
            if (politicians.some(p => p.state === userLocation)) {
                updateState(userLocation, true);
            } else {
                const states = Array.from(new Set(politicians.map(p => p.state).filter(Boolean)));
                if (states.length > 0) updateState(states[Math.floor(Math.random() * states.length)], false);
            }
        } else {
            const states = Array.from(new Set(politicians.map(p => p.state).filter(Boolean)));
            if (states.length > 0) {
                if (!selectedState) {
                    const random = states[Math.floor(Math.random() * states.length)];
                    updateState(random, false);
                } else {
                    setIsLoading(false);
                }
            }
        }
    }, [politicians, userLocation]);

    if (isLoading) return <div className="h-48 w-full glass rounded-[2.5rem] animate-pulse mb-8"></div>;
    if (statePoliticians.length === 0) return null;

    return (
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-500 relative group/widget">
            <div className="absolute inset-0 glass-card rounded-[3rem] -mx-4 md:mx-0 z-0 border border-white/20 dark:border-white/5 shadow-sm"></div>

            <div className="relative z-10 p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-lg backdrop-blur-md ${isLocal ? 'bg-picture/90 text-white' : 'bg-spring/90 text-midnight'}`}>
                            {isLocal ? <LocateFixed size={22} /> : <MapPin size={22} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-midnight dark:text-white leading-none mb-1">
                                {selectedState}
                            </h2>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                {isLocal ? 'Sua Bancada' : 'Giro pelos Estados'}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onGoToExplore(selectedState)}
                        className="px-5 py-2.5 bg-white/60 dark:bg-midnight/80 backdrop-blur-xl rounded-full text-xs font-black text-nuit dark:text-blue-400 uppercase tracking-widest shadow-sm border border-white/30 dark:border-white/10 active:scale-95 transition-all hover:bg-white/80 dark:hover:bg-gray-800/80"
                    >
                        Ver Todos
                    </button>
                </div>

                <div className="relative">
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/90 dark:from-midnight/95 to-transparent pointer-events-none z-20 md:hidden rounded-r-[2rem]"></div>

                    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory px-1 scroll-smooth">
                        {statePoliticians.map((pol) => (
                            <div 
                                key={pol.id} 
                                onClick={() => onSelectCandidate(pol)}
                                className="snap-center shrink-0 w-40 glass rounded-[2.2rem] p-5 flex flex-col items-center text-center shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/40 dark:border-white/10 cursor-pointer hover:scale-[1.03] hover:bg-white dark:hover:bg-midnight hover:shadow-2xl transition-all duration-300"
                            >
                                <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-[3px] border-white/50 dark:border-gray-600 shadow-md">
                                    <img src={pol.photo} alt={pol.name} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                                <h3 className="text-sm font-black text-midnight dark:text-white leading-tight mb-1.5 line-clamp-2 min-h-[2.5em]">{pol.name}</h3>
                                <p className="text-xs font-bold text-gray-500 uppercase bg-gray-100/50 dark:bg-white/5 px-2 py-0.5 rounded-md">{pol.party}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, articles, onSelectCandidate, onEducationClick, onSeeMore, onGoToExplore }) => {
    const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return 'Bom dia';
        if (h >= 12 && h < 18) return 'Boa tarde';
        return 'Boa noite';
    }, []);

    return (
        <div className="w-full h-full bg-transparent font-sans overflow-y-auto pb-32 animate-in fade-in duration-500">
            {selectedFeedItem && (
                <FeedDetailModal 
                    item={selectedFeedItem} 
                    politician={politicians.find(p => p.id === selectedFeedItem.candidateId)}
                    onClose={() => setSelectedFeedItem(null)}
                    onGoToProfile={onSelectCandidate}
                />
            )}

            <div className="pt-safe px-4 md:px-8 py-8 md:py-10 max-w-[2000px] mx-auto">
                
                {/* Header */}
                <header className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-nuit to-blue-500 dark:from-white dark:to-blue-300">
                                {greeting}, Cidadão
                            </span>
                        </h1>
                        <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400">
                            Fiscalização em tempo real do Congresso.
                        </p>
                    </div>
                </header>

                {/* News Ticker */}
                <NewsTicker />

                {/* State Spotlight */}
                <StateSpotlightWidget politicians={politicians} onSelectCandidate={onSelectCandidate} onGoToExplore={onGoToExplore} />

                {/* Main Feed */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black text-midnight dark:text-white flex items-center gap-2.5">
                            <Activity size={24} className="text-nuit dark:text-blue-400"/>
                            Últimas Atividades
                        </h2>
                        <button onClick={onSeeMore} className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider hover:underline px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">
                            Ver Histórico
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        {feedItems.slice(0, 6).map((item) => {
                            const category = getCategoryIcon(item.title + ' ' + item.description);
                            const politician = item.candidateId ? politicians.find(p => p.id === item.candidateId) : null;
                            const isExpense = item.type === 'despesa';

                            return (
                                <article 
                                    key={item.id} 
                                    onClick={() => setSelectedFeedItem(item)}
                                    className="group relative bg-white/80 dark:bg-midnight/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/40 dark:border-white/5 shadow-sm hover:shadow-2xl hover:bg-white dark:hover:bg-midnight transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${category.bg} ${category.color} text-xs font-black uppercase tracking-wider`}>
                                                <category.icon size={14} />
                                                {category.label}
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                                                {item.date}
                                            </span>
                                        </div>

                                        <h3 className="text-lg md:text-xl font-black text-midnight dark:text-white leading-tight mb-3 group-hover:text-nuit dark:group-hover:text-blue-400 transition-colors line-clamp-3">
                                            {formatCardTitle(item.title, item.type)}
                                        </h3>

                                        {isExpense && item.amount && (
                                            <div className="mb-4">
                                                <p className="text-3xl font-black text-midnight dark:text-white tracking-tighter">{item.amount}</p>
                                                <p className="text-xs text-gray-500 uppercase font-bold truncate tracking-wide">{item.provider}</p>
                                            </div>
                                        )}

                                        {!isExpense && item.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed line-clamp-3 mb-6">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    {politician ? (
                                        <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 mt-auto">
                                            <img src={politician.photo} className="w-10 h-10 rounded-full object-cover border border-white dark:border-gray-700 shadow-sm" alt="" loading="lazy" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-midnight dark:text-white truncate">{politician.name}</p>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{politician.party} • {politician.state}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 mt-auto">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                                <Landmark size={18} className="text-gray-400"/>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Congresso Nacional</span>
                                        </div>
                                    )}
                                    
                                    {/* Hover Action Arrow */}
                                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                        <div className="w-12 h-12 rounded-full bg-nuit dark:bg-white text-white dark:text-midnight flex items-center justify-center shadow-lg">
                                            {/* Optical Center Adjustment */}
                                            <ArrowRight size={20} className="ml-0.5" />
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FeedView;
