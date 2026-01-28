import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Landmark, Banknote, Lightbulb, Filter, ArrowRight, ExternalLink, ChevronDown, CheckCircle2, XCircle, Clock, X, Share2, User, Sparkles, Loader2, MapPin, Thermometer, Volume2, VolumeX, Newspaper, ScrollText, Activity, Radio, Users, LocateFixed, Zap, GraduationCap, HeartPulse, Shield, Briefcase, Leaf, Gavel, Cpu, Palette, Bus, Plane, Scale, BookOpen } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import { speakContent } from '../services/ai';
import NewsTicker from '../components/NewsTicker';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: any[];
  onSelectCandidate: (pol: Politician) => void;
  onEducationClick: (id: number) => void;
  onSeeMore: () => void;
  onGoToExplore: (state: string) => void;
}

// 1. Dicionário Constitucional: Conecta temas a artigos da CF/88
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

// 2. Explicações Didáticas de Tipos Legislativos
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
    
    // Updated Colors to Match New Palette (Picture Green, Nuit Blue, Midnight)
    // Core Categories
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

    // Dicionário de Títulos Curtos para Cards
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

    // Limpezas Gerais para encurtar
    clean = clean
        .replace(/^Institui a /i, '')
        .replace(/^Institui o /i, '')
        .replace(/^Dispõe sobre a /i, '')
        .replace(/^Dispõe sobre o /i, '')
        .replace(/^Altera a Lei /i, 'Alteração na Lei ')
        .replace(/n\.º? ?/gi, '')
        .replace(/\/\d{4}/, ''); // Opcional: remove o ano para ficar mais limpo no card

    // Capitalize sentences
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    if (clean.length > 60) return clean.substring(0, 60) + '...';
    return clean;
};

// ... getDidacticContext (same as before)
const getDidacticContext = (title: string, description: string | undefined, type: string) => {
    // 1. Tradução de Despesas (Mantém lógica simples)
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

    // 2. Extração de Tipo Legislativo (O que é isso?)
    let legislativeExplanation = "";
    if (text.includes('PEC') || title.includes('PEC')) legislativeExplanation = LEGISLATIVE_TYPES['PEC'];
    else if (text.includes('MPV') || title.includes('MPV')) legislativeExplanation = LEGISLATIVE_TYPES['MPV'];
    else if (text.includes('PLP') || title.includes('PLP')) legislativeExplanation = LEGISLATIVE_TYPES['PLP'];
    else if (text.includes('PDL') || title.includes('PDL')) legislativeExplanation = LEGISLATIVE_TYPES['PDL'];
    else if (text.includes('Projeto de Lei') || title.includes('PL')) legislativeExplanation = LEGISLATIVE_TYPES['PL'];
    else if (text.includes('Requerimento') || title.includes('REQ')) legislativeExplanation = LEGISLATIVE_TYPES['REQ'];

    // 3. Tradução de Status (O que aconteceu?)
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
    
    // Se não achou status específico, tenta limpar o texto original
    if (!translatedStatus) {
        translatedStatus = text.replace(/Requerimento n\. \d+(\/\d+)?/gi, "o pedido").substring(0, 100) + (text.length > 100 ? "..." : "");
    }

    // 4. Conexão Constitucional (Onde está na CF/88?)
    const fullTextSearch = (title + " " + text).toLowerCase();
    for (const key in CONSTITUTION_TOPICS) {
        if (fullTextSearch.includes(key)) {
            constitutionRef = CONSTITUTION_TOPICS[key];
            break; // Pega o primeiro match relevante
        }
    }

    // Montagem final do texto didático
    didacticText = translatedStatus;
    if (legislativeExplanation) {
        didacticText += " " + legislativeExplanation; // Adiciona explicação do tipo
    }

    return { 
        text: didacticText, 
        constitution: constitutionRef,
        isExpense: false
    };
};

const AudioPlayer = ({ text }: { text: string }) => {
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
            className={`p-2.5 rounded-full transition-all flex items-center gap-2 backdrop-blur-md border border-white/20 shadow-lg ${isPlaying ? 'bg-orange-500/80 text-white animate-pulse' : 'bg-white/50 dark:bg-nuit/30 text-nuit dark:text-blue-400 hover:bg-white/80'}`}
        >
            {isLoading ? <Loader2 className="animate-spin" size={18}/> : isPlaying ? <VolumeX size={18}/> : <Volume2 size={18}/>}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                {isLoading ? "Processando..." : isPlaying ? "Ouvindo" : "Ouvir"}
            </span>
        </button>
    );
};

const FeedDetailModal = ({ item, politician, onClose, onGoToProfile }: { item: FeedItem, politician?: Politician, onClose: () => void, onGoToProfile: (p: Politician) => void }) => {
    const isVote = item.type === 'voto';
    const isExpense = item.type === 'despesa';
    const [visible, setVisible] = useState(false);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Geração local de conteúdo didático
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
            <div className={`bg-praxeti dark:bg-midnight backdrop-blur-3xl w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl dark:shadow-[0_-20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh] transition-transform duration-500 ease-out border border-white/20 dark:border-white/10 ${visible ? 'translate-y-0' : 'translate-y-full md:scale-95'}`}>
                <div className="md:hidden w-12 h-1.5 bg-gray-300/50 dark:bg-gray-700/50 rounded-full mx-auto my-4 shrink-0" aria-hidden="true"></div>
                
                <div className={`h-24 md:h-32 shrink-0 relative flex items-start justify-end p-4 ${isVote ? 'bg-nuit/90' : isExpense ? 'bg-orange-600/90' : 'bg-spring/90'} backdrop-blur-md`}>
                    <div className="absolute top-4 left-4 z-50 flex gap-2">
                        <AudioPlayer text={`${item.title}. ${didacticContent.text}`} />
                    </div>
                    <button 
                        ref={closeBtnRef}
                        onClick={onClose} 
                        aria-label="Fechar Detalhes"
                        className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                    <div className="absolute -bottom-6 left-6 md:left-8 p-3 bg-white/80 dark:bg-gray-900/80 rounded-[1.5rem] shadow-xl border-4 border-praxeti dark:border-midnight backdrop-blur-xl flex items-center justify-center">
                        {isVote ? <Landmark size={24} className="text-nuit" aria-hidden="true" /> : isExpense ? <Banknote size={24} className="text-orange-600" aria-hidden="true" /> : <Lightbulb size={24} className="text-yellow-600" aria-hidden="true" />}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-10 pb-safe">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full backdrop-blur-md shadow-sm ${isVote ? 'bg-nuit/10 text-nuit' : isExpense ? 'bg-orange-100/50 text-orange-700' : 'bg-spring/30 text-yellow-800'}`}>
                            {item.type}
                        </span>
                        {item.date && <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Clock size={10} aria-hidden="true" /> {item.date}</span>}
                    </div>

                    <h2 id="modal-title" className="text-xl md:text-3xl font-black text-midnight dark:text-white leading-tight mb-6">{item.title}</h2>

                    {/* BLOC0 DIDÁTICO PRINCIPAL */}
                    <div className="mb-8 space-y-4">
                        {/* 1. Explicação Papo Reto - REMOVIDO "ENTENDA" BADGE/ICON */}
                        <div className="bg-nuit/5 dark:bg-nuit/10 p-5 rounded-3xl border border-nuit/10 dark:border-nuit/20 backdrop-blur-md relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-nuit"></div>
                            {/* REMOVIDO CABEÇALHO "ENTENDA" COM SPARKLES AQUI TAMBÉM SE HOUVESSE, MAS NO CARD PRINCIPAL QUE FOI PEDIDO */}
                            <p className="text-midnight dark:text-blue-100 text-sm md:text-base font-bold leading-relaxed">
                                {didacticContent.text}
                            </p>
                        </div>

                        {/* 2. Conexão Constitucional (Se houver) */}
                        {didacticContent.constitution && (
                            <div className="bg-spring/20 dark:bg-spring/5 p-5 rounded-3xl border border-spring/50 dark:border-spring/10 backdrop-blur-md relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-spring"></div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Scale size={14} className="text-yellow-800 dark:text-spring" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-yellow-800 dark:text-spring">Na Constituição ({didacticContent.constitution.art})</span>
                                </div>
                                <p className="text-midnight dark:text-yellow-100 text-sm font-medium leading-relaxed italic">
                                    "{didacticContent.constitution.text}"
                                </p>
                            </div>
                        )}
                    </div>

                    {isExpense && item.amount && (
                        <div className="mb-6 p-4 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Valor</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{item.amount}</p>
                            </div>
                            {item.provider && (
                                <div className="text-right max-w-[50%]">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Fornecedor</p>
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{item.provider}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed mb-6 text-sm md:text-base">
                        <p className="mb-2 font-bold text-xs uppercase text-gray-500 tracking-wider">Texto Original:</p>
                        <p>{item.content || item.description}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {politician && (
                            <button 
                                onClick={() => { onClose(); onGoToProfile(politician); }} 
                                aria-label={`Ver perfil completo de ${politician.name}`}
                                className="flex items-center gap-4 p-4 rounded-3xl border border-gray-200 dark:border-white/10 hover:border-nuit bg-white/50 dark:bg-white/5 cursor-pointer transition-all active:scale-[0.98] text-left backdrop-blur-md shadow-sm hover:shadow-md"
                            >
                                <img src={politician.photo} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-md" alt="" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">Responsável</p>
                                    <p className="text-sm font-black text-midnight dark:text-white truncate">{politician.name}</p>
                                    <p className="text-[10px] font-medium text-gray-500">{politician.party} - {politician.state}</p>
                                </div>
                                <div className="p-2 bg-white/50 dark:bg-white/10 rounded-full text-gray-400 shrink-0">
                                    <ArrowRight size={16} aria-hidden="true" />
                                </div>
                            </button>
                        )}

                        <div className="flex gap-3">
                            {item.sourceUrl && (
                                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-4 rounded-2xl bg-midnight dark:bg-white text-white dark:text-black font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl">
                                    Fonte Oficial <ExternalLink size={16} aria-hidden="true" />
                                </a>
                            )}
                            <button aria-label="Compartilhar esta informação" className="px-5 py-4 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold active:scale-[0.98] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors bg-white/20 dark:bg-black/20 backdrop-blur-sm">
                                <Share2 size={20} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StateSpotlightWidget = ({ politicians, onSelectCandidate, onGoToExplore }: { politicians: Politician[], onSelectCandidate: (p: Politician) => void, onGoToExplore: (state: string) => void }) => {
    const [selectedState, setSelectedState] = useState<string>('');
    const [statePoliticians, setStatePoliticians] = useState<Politician[]>([]);
    const [isLocal, setIsLocal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!politicians || politicians.length === 0) return;

        const setRandomState = () => {
             const states = Array.from(new Set(politicians.map(p => p.state).filter(Boolean)));
             if (states.length > 0) {
                const random = states[Math.floor(Math.random() * states.length)];
                updateState(random);
                setIsLocal(false);
             }
             setIsLoading(false);
        };

        const updateState = (uf: string) => {
            setSelectedState(uf);
            const filtered = politicians
                .filter(p => p.state === uf)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            setStatePoliticians(filtered);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
                        const data = await response.json();
                        const uf = data.principalSubdivisionCode ? data.principalSubdivisionCode.split('-')[1] : null;
                        
                        if (uf && politicians.some(p => p.state === uf)) {
                            updateState(uf);
                            setIsLocal(true);
                        } else {
                            setRandomState();
                        }
                    } catch (e) {
                        console.error("Erro na geolocalização:", e);
                        setRandomState();
                    } finally {
                        setIsLoading(false);
                    }
                },
                (error) => {
                    console.log("Geolocalização negada ou indisponível:", error);
                    setRandomState();
                }
            );
        } else {
            setRandomState();
        }
    }, [politicians]);

    if (isLoading) return <div className="h-48 w-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-md rounded-[2.5rem] animate-pulse mb-8 border border-white/10"></div>;
    if (statePoliticians.length === 0) return null;

    return (
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-500 relative">
            <div className="absolute inset-0 bg-white/95 dark:bg-midnight/40 backdrop-blur-3xl rounded-[3rem] -mx-4 md:mx-0 z-0 border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_60px_rgba(0,0,0,0.5)]"></div>

            <div className="relative z-10 p-4 md:p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl shadow-lg backdrop-blur-md ${isLocal ? 'bg-picture/90 text-white' : 'bg-spring/90 text-midnight'}`}>
                            {isLocal ? <LocateFixed size={20} /> : <MapPin size={20} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-midnight dark:text-white leading-none">
                                {selectedState}
                            </h2>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                {isLocal ? 'Sua Bancada' : 'Giro pelos Estados'}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onGoToExplore(selectedState)}
                        className="px-4 py-2 bg-white/60 dark:bg-midnight/80 backdrop-blur-xl rounded-full text-[10px] font-black text-nuit dark:text-blue-400 uppercase tracking-widest shadow-sm border border-white/30 dark:border-white/10 active:scale-95 transition-all hover:bg-white/80 dark:hover:bg-gray-800/80"
                    >
                        Ver Todos
                    </button>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory px-1">
                    {statePoliticians.map((pol) => (
                        <div 
                            key={pol.id} 
                            onClick={() => onSelectCandidate(pol)}
                            className="snap-center shrink-0 w-36 bg-white/95 dark:bg-midnight/90 backdrop-blur-xl rounded-[2rem] p-4 flex flex-col items-center text-center shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/20 dark:border-white/10 cursor-pointer hover:scale-[1.03] hover:bg-white dark:hover:bg-midnight hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nuit to-midnight opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-gray-200 to-white dark:from-gray-700 dark:to-gray-800 mb-3 shadow-inner relative group-hover:from-nuit group-hover:to-midnight transition-colors">
                                <img src={pol.photo} alt={pol.name} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-900" loading="lazy" decoding="async" />
                            </div>
                            
                            <h3 className="text-xs font-black text-midnight dark:text-white leading-tight mb-1 line-clamp-2 min-h-[2.5em]">
                                {pol.name}
                            </h3>
                            
                            <div className="mt-2 w-full">
                                <span className="block w-full py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide border border-gray-100/50 dark:border-white/10 group-hover:bg-nuit/10 group-hover:text-nuit dark:group-hover:bg-nuit/20 dark:group-hover:text-blue-400 transition-colors">
                                    {pol.party}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const HeaderGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Olá';

    if (hour >= 5 && hour < 12) greeting = 'Bom dia';
    else if (hour >= 12 && hour < 18) {
        greeting = 'Boa tarde';
    } else {
        greeting = 'Boa noite';
    }

    return (
        <header className="flex items-center justify-between gap-4 w-full mb-6 pt-safe">
            <div className="min-w-0">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-midnight to-nuit dark:from-white dark:to-blue-300 tracking-tighter truncate leading-tight py-1 drop-shadow-sm">
                    {greeting}, Cidadão!
                </h1>
            </div>
        </header>
    );
};

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, articles, onSelectCandidate, onEducationClick, onSeeMore, onGoToExplore }) => {
  const [visibleCount, setVisibleCount] = useState(4);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

  const displayedItems = useMemo(() => {
    return feedItems.slice(0, visibleCount);
  }, [feedItems, visibleCount]);

  return (
    <div id="main-content" className="w-full h-full bg-transparent font-sans flex flex-col">
        {selectedItem && (
            <FeedDetailModal 
                item={selectedItem} 
                politician={selectedItem.candidateId ? politicians.find(p => p.id === selectedItem.candidateId) : undefined}
                onClose={() => setSelectedItem(null)}
                onGoToProfile={onSelectCandidate}
            />
        )}

        <div className="flex-1 overflow-hidden">
            <div className="h-full w-full overflow-y-auto pb-32 px-4 md:px-8 pt-4 md:pt-8 custom-scrollbar">
                
                <HeaderGreeting />

                {/* 1: DESTAQUE DO DIA */}
                <div className="mb-8">
                    <div className="mb-3 flex items-center gap-2 px-1 opacity-80">
                        <div className="p-1.5 bg-red-100/50 dark:bg-red-900/30 rounded-lg text-red-600 backdrop-blur-sm">
                            <Newspaper size={14} />
                        </div>
                        <h2 className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                            Destaques do Dia
                        </h2>
                    </div>
                    <NewsTicker />
                </div>

                {/* 2: SUA BANCADA */}
                <StateSpotlightWidget politicians={politicians} onSelectCandidate={onSelectCandidate} onGoToExplore={onGoToExplore} />

                {/* 3: ATIVIDADES RECENTES */}
                <div className="mb-12">
                    <div className="mb-4 flex items-center gap-2 px-1 opacity-80">
                        <div className="p-1.5 bg-nuit/10 dark:bg-blue-900/30 rounded-lg text-nuit backdrop-blur-sm">
                            <Activity size={14} />
                        </div>
                        <h2 className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                            Atividades Recentes
                        </h2>
                    </div>

                    <div className="grid md:auto-rows-[auto] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                        {displayedItems.length === 0 && (
                            <div className="col-span-full text-center py-20 opacity-50">
                                <p className="font-bold text-gray-500">Nenhuma atualização recente.</p>
                            </div>
                        )}

                        {displayedItems.map((item, i) => {
                            const candidate = item.candidateId ? politicians.find(p => p.id === item.candidateId) : null;
                            const isLarge = (i % 7 === 0) || (i % 7 === 6);
                            
                            // Context Logic
                            const context = getCategoryIcon(item.title + ' ' + (item.description || ''));
                            const ContextIcon = context.icon;
                            
                            // INTELLIGENT REWRITE (SYSTEM LOGIC)
                            const didacticContent = getDidacticContext(item.title, item.description, item.type);
                            const displayTitle = formatCardTitle(item.title, item.type);

                            return (
                                <article
                                    key={i}
                                    onClick={() => setSelectedItem(item)}
                                    className={`bg-white/[0.98] dark:bg-[#001F3F]/[0.98] backdrop-blur-2xl rounded-[2.5rem] p-5 border border-white/60 dark:border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:scale-[1.02] hover:border-spring dark:hover:border-spring transition-all duration-300 cursor-pointer flex flex-col gap-4 group active:scale-[0.99] ${isLarge ? "md:col-span-2" : ""}`}
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(item)}
                                    aria-haspopup="dialog"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md ${context.bg} ${context.color} shadow-sm border border-white/20`}>
                                            <ContextIcon size={24} />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] md:text-xs font-black uppercase px-2 py-1 rounded-lg mb-1 backdrop-blur-md ${context.bg} ${context.color}`}>
                                                {context.label}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500">{item.date}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-midnight dark:text-white mb-3 text-xl leading-tight group-hover:text-nuit dark:group-hover:text-blue-400 transition-colors">
                                            {displayTitle}
                                        </h3>
                                        
                                        {/* Styled Smart Summary Box Glass - Cleaned up per request */}
                                        <div className="relative bg-praxeti/60 dark:bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-gray-100/30 dark:border-white/10">
                                            {/* REMOVIDO ELEMENTO 'ENTENDA' COM SPARKLES CONFORME SOLICITADO */}
                                            <p className="text-xs text-midnight/80 dark:text-gray-300 font-medium leading-relaxed">
                                                {didacticContent.text}
                                            </p>

                                            {/* Constitution Reference Badge inside card */}
                                            {didacticContent.constitution && (
                                                <div className="mt-3 pt-2 border-t border-gray-200/30 dark:border-white/10 flex items-start gap-2">
                                                    <Scale size={12} className="text-nuit shrink-0 mt-0.5"/>
                                                    <div>
                                                        <p className="text-[9px] font-black text-nuit dark:text-blue-400 uppercase leading-none mb-0.5">
                                                            {didacticContent.constitution.art} (Constituição)
                                                        </p>
                                                        <p className="text-[9px] text-gray-500 dark:text-gray-400 italic leading-tight">
                                                            "{didacticContent.constitution.text}"
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50/20 dark:border-white/5">
                                        {candidate ? (
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src={candidate.photo} className="w-8 h-8 rounded-full bg-gray-200 object-cover shrink-0 border border-white dark:border-gray-700 shadow-sm" alt={`Foto de ${candidate.name}`} loading="lazy" decoding="async"/>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase leading-none mb-0.5">Envolvido</span>
                                                    <span className="text-xs font-bold text-midnight dark:text-gray-300 truncate">{candidate.name}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><Landmark size={12}/> Câmara dos Deputados</span>
                                        )}
                                        <div className="w-8 h-8 rounded-full bg-gray-50/50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-spring/30 group-hover:text-midnight dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 transition-all backdrop-blur-sm">
                                            <ArrowRight size={16} aria-hidden="true" />
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="w-full max-w-xl mx-auto mt-8 mb-4 px-4 space-y-4 px-safe">
                        {visibleCount < feedItems.length && (
                            <button 
                                onClick={() => setVisibleCount(prev => prev + 4)}
                                className="w-full py-4 bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-full text-sm font-bold text-nuit dark:text-blue-400 shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-midnight"
                            >
                                Ver Mais <ChevronDown size={16} aria-hidden="true" />
                            </button>
                        )}
                        
                        <button 
                            onClick={onSeeMore}
                            className="w-full py-4 text-[10px] font-black uppercase text-gray-400 hover:text-nuit transition-colors flex items-center justify-center gap-2 tracking-widest"
                        >
                            Histórico Completo <ArrowRight size={14} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FeedView;