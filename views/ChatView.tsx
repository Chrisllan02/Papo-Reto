import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, Sparkles, Zap, MapPin, Search, BrainCircuit, X, Loader2, ChevronDown, StopCircle } from 'lucide-react';
import { chatWithGemini, generateCampaignImage, transcribeAudio } from '../services/ai';
import { ChatMessage, ChatMode } from '../types';

interface ChatViewProps {
    onBack?: () => void;
    initialContext?: string;
}

interface ModeButtonProps {
    m: ChatMode;
    icon: React.ElementType;
    label: string;
    color: string;
}

const ChatView: React.FC<ChatViewProps> = ({ onBack, initialContext }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            id: 'welcome', 
            role: 'model', 
            text: 'E aí! Sou o Assistente PapoReto. Posso te ajudar a entender leis, buscar dados atualizados, analisar perfis ou até criar imagens de campanha. Como posso ajudar?', 
            timestamp: Date.now() 
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [mode, setMode] = useState<ChatMode>('standard');
    const [isLoading, setIsLoading] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
    const [isRecording, setIsRecording] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const hasProcessedContext = useRef(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Process Initial Context automatically
    useEffect(() => {
        if (initialContext && !hasProcessedContext.current) {
            hasProcessedContext.current = true;
            const autoSend = async () => {
                const userMsg: ChatMessage = { 
                    id: Date.now().toString(), 
                    role: 'user', 
                    text: initialContext, 
                    timestamp: Date.now() 
                };
                setMessages(prev => [...prev, userMsg]);
                setIsLoading(true);

                // For context explanations, we prefer standard or search mode
                const response = await chatWithGemini(initialContext, 'standard', []);
                
                const modelMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: response.text,
                    groundingMetadata: {
                        search: response.searchSources,
                        maps: response.mapSources
                    },
                    timestamp: Date.now()
                };

                setMessages(prev => [...prev, modelMsg]);
                setIsLoading(false);
            };
            autoSend();
        }
    }, [initialContext]);

    // --- AUDIO HANDLING ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    setIsLoading(true);
                    const text = await transcribeAudio(base64Audio, 'audio/webm');
                    setIsLoading(false);
                    if (text) setInputValue(prev => prev + (prev ? ' ' : '') + text);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Erro ao acessar microfone", err);
            alert("Permissão de microfone negada ou indisponível.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // --- IMAGE GENERATION ---
    const handleGenerateImage = async () => {
        if (!inputValue.trim()) {
            alert("Digite uma descrição para a imagem primeiro.");
            return;
        }
        setShowImageModal(false);
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: `Gerar imagem (${selectedAspectRatio}): ${inputValue}`, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        const base64Image = await generateCampaignImage(userMsg.text || "", selectedAspectRatio);
        
        const modelMsg: ChatMessage = { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: base64Image ? "Aqui está a imagem gerada:" : "Desculpe, não consegui gerar a imagem.",
            image: base64Image || undefined,
            timestamp: Date.now() 
        };
        
        setMessages(prev => [...prev, modelMsg]);
        setIsLoading(false);
    };

    // --- TEXT CHAT ---
    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;
        
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // Prepare history for API (last 10 messages)
        const history = messages.slice(-10).map(m => ({
            role: m.role,
            parts: [{ text: m.text || "" }]
        }));

        const response = await chatWithGemini(userMsg.text || "", mode, history);

        const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.text,
            groundingMetadata: {
                search: response.searchSources,
                maps: response.mapSources
            },
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, modelMsg]);
        setIsLoading(false);
    };

    const ModeButton: React.FC<ModeButtonProps> = ({ m, icon: Icon, label, color }) => (
        <button 
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                mode === m 
                ? `bg-white dark:bg-gray-800 border-${color}-500 text-${color}-600 shadow-sm scale-105` 
                : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
            <Icon size={12} className={mode === m ? `text-${color}-500` : ''} strokeWidth={2.5} />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-transparent relative">
            
            {/* Header / Mode Selector - Floating Style */}
            <div className="absolute top-0 left-0 right-0 z-20 p-2">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 p-2 rounded-[2rem] shadow-sm max-w-2xl mx-auto">
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide justify-between sm:justify-center">
                        <ModeButton m="fast" icon={Zap} label="Rápido" color="yellow" />
                        <ModeButton m="standard" icon={Sparkles} label="Padrão" color="blue" />
                        <ModeButton m="search" icon={Search} label="Web" color="green" />
                        <ModeButton m="location" icon={MapPin} label="Local" color="red" />
                        <ModeButton m="thinking" icon={BrainCircuit} label="Pro" color="purple" />
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-20 pb-4 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] p-5 shadow-sm relative group transition-transform ${
                            msg.role === 'user' 
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-[1.5rem] rounded-tr-sm shadow-blue-500/20' 
                            : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-800 dark:text-gray-100 rounded-[1.5rem] rounded-tl-sm border border-white/40 dark:border-white/10'
                        }`}>
                            {msg.image && (
                                <img src={msg.image} alt="Generated" className="w-full rounded-xl mb-3 border border-white/20 shadow-md" />
                            )}
                            
                            <div className="prose dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {msg.text}
                            </div>

                            {/* Grounding Sources */}
                            {msg.groundingMetadata?.search && msg.groundingMetadata.search.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                                    <p className="text-[9px] font-black uppercase opacity-60 mb-2">Fontes Verificadas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.groundingMetadata.search.map((s, i) => (
                                            <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1">
                                                <Search size={10}/> {s.title}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.groundingMetadata?.maps && msg.groundingMetadata.maps.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                                    <p className="text-[9px] font-black uppercase opacity-60 mb-2">Localização</p>
                                    {msg.groundingMetadata.maps.map((m, i) => (
                                        <div key={i} className="mb-2 bg-gray-50/50 dark:bg-black/20 p-2 rounded-lg border border-black/5 dark:border-white/5">
                                            <p className="text-xs font-bold">{m.title}</p>
                                            <p className="text-[10px] opacity-70 mb-1">{m.source}</p>
                                            <a href={m.uri} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white px-2 py-1 rounded inline-flex items-center gap-1 hover:bg-blue-600 transition-colors">
                                                <MapPin size={8}/> Ver no Mapa
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 py-3 rounded-[1.5rem] rounded-tl-sm shadow-sm flex items-center gap-3 border border-white/40 dark:border-white/10">
                            <Loader2 size={16} className="animate-spin text-blue-500" />
                            <span className="text-xs font-bold text-gray-400 animate-pulse uppercase tracking-wider">
                                {mode === 'thinking' ? 'Analisando dados complexos...' : 
                                 mode === 'search' ? 'Conectando à internet...' : 
                                 'Processando...'}
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Floating Modern Look */}
            <div className="p-4 pt-0">
                <div className="max-w-3xl mx-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] shadow-xl p-2 flex items-center gap-2 relative z-30">
                    
                    <button 
                        onClick={() => setShowImageModal(true)}
                        className="p-3 text-gray-400 hover:text-blue-500 transition-colors rounded-full hover:bg-blue-50 dark:hover:bg-gray-800"
                        title="Gerar Imagem"
                    >
                        <ImageIcon size={20} strokeWidth={2} />
                    </button>

                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={isRecording ? "Ouvindo sua voz..." : "Pergunte ao PapoReto..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 h-10"
                        disabled={isRecording}
                    />

                    {inputValue.trim() ? (
                        <button 
                            onClick={handleSendMessage}
                            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                        >
                            <Send size={18} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <button 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-3 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-800'}`}
                        >
                            {isRecording ? <StopCircle size={20} strokeWidth={2.5}/> : <Mic size={20} strokeWidth={2} />}
                        </button>
                    )}
                </div>
                <div className="text-center mt-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                        IA Gemini 2.5 • Pode cometer erros
                    </p>
                </div>
            </div>

            {/* Image Settings Modal */}
            {showImageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative border border-white/20">
                        <button onClick={() => setShowImageModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20}/></button>
                        <h3 className="font-black text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                            <ImageIcon size={20} className="text-blue-500"/> Criar Imagem
                        </h3>
                        
                        <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">Escolha o formato e descreva o cenário no chat para gerar imagens de campanha ou simulações.</p>
                        
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {['1:1', '3:4', '4:3', '9:16', '16:9'].map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setSelectedAspectRatio(ratio)}
                                    className={`py-3 px-2 rounded-2xl text-[10px] font-black transition-all ${
                                        selectedAspectRatio === ratio 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={handleGenerateImage}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl"
                        >
                            Gerar Agora
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatView;