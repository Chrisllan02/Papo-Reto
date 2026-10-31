import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, Sparkles, Zap, MapPin, Search, BrainCircuit, X, Loader2, StopCircle } from 'lucide-react';
import { chatWithGemini, generateCampaignImage, transcribeAudio } from '../services/ai';
import { ChatMessage, ChatMode } from '../types';
import Modal from '../components/Modal';
import { safeHttpUrl } from '../utils/url';

interface ChatViewProps {
    onBack?: () => void;
    initialContext?: string;
}

type ModeColor = 'yellow' | 'blue' | 'green' | 'red' | 'purple';

const MODE_STYLES: Record<ModeColor, { active: string; icon: string }> = {
    yellow: { active: 'border-yellow-700 text-yellow-800 dark:border-yellow-300 dark:text-yellow-200', icon: 'text-yellow-700 dark:text-yellow-300' },
    blue: { active: 'border-blue-700 text-blue-700 dark:border-blue-300 dark:text-blue-200', icon: 'text-blue-700 dark:text-blue-300' },
    green: { active: 'border-green-700 text-green-800 dark:border-green-300 dark:text-green-200', icon: 'text-green-700 dark:text-green-300' },
    red: { active: 'border-red-700 text-red-700 dark:border-red-300 dark:text-red-200', icon: 'text-red-700 dark:text-red-300' },
    purple: { active: 'border-purple-700 text-purple-700 dark:border-purple-300 dark:text-purple-200', icon: 'text-purple-700 dark:text-purple-300' },
};

const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];

const FALLBACK_ERROR_TEXT = 'Não consegui responder agora. Tente novamente em instantes.';

interface ModeButtonProps {
    m: ChatMode;
    activeMode: ChatMode;
    onSelect: (mode: ChatMode) => void;
    icon: React.ElementType;
    label: string;
    color: ModeColor;
}

const ModeButton: React.FC<ModeButtonProps> = ({ m, activeMode, onSelect, icon: Icon, label, color }) => {
    const isActive = activeMode === m;
    const styles = MODE_STYLES[color];
    return (
        <button 
            type="button"
            onClick={() => onSelect(m)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 min-h-11 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                isActive 
                ? `bg-white dark:bg-white/10 ${styles.active}` 
                : 'border-transparent text-muted-strong hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
        >
            <Icon size={14} className={isActive ? styles.icon : ''} strokeWidth={2.5} aria-hidden="true" />
            {label}
        </button>
    );
};

const ChatView: React.FC<ChatViewProps> = ({ initialContext }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
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
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);
    const hasProcessedContext = useRef(false);

    const releaseStream = () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            const recorder = mediaRecorderRef.current;
            if (recorder && recorder.state !== 'inactive') {
                recorder.onstop = null;
                recorder.stop();
            }
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

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

                try {
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

                    if (isMountedRef.current) setMessages(prev => [...prev, modelMsg]);
                } catch {
                    if (isMountedRef.current) {
                        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: FALLBACK_ERROR_TEXT, isError: true, timestamp: Date.now() }]);
                    }
                } finally {
                    if (isMountedRef.current) setIsLoading(false);
                }
            };
            autoSend();
        }
    }, [initialContext]);

    const pushErrorMessage = (text: string) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text, isError: true, timestamp: Date.now() }]);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                releaseStream();
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    if (!isMountedRef.current) return;
                    setIsLoading(true);
                    try {
                        const text = await transcribeAudio(base64Audio, 'audio/webm');
                        if (text && isMountedRef.current) setInputValue(prev => prev + (prev ? ' ' : '') + text);
                    } catch (err) {
                        console.error("Erro ao transcrever áudio", err);
                    } finally {
                        if (isMountedRef.current) setIsLoading(false);
                    }
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            releaseStream();
            console.error("Erro ao acessar microfone", err);
            pushErrorMessage("Permissão de microfone negada ou indisponível.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleGenerateImage = async () => {
        if (isLoading) return;
        if (!inputValue.trim()) {
            setShowImageModal(false);
            pushErrorMessage("Digite uma descrição para a imagem no campo de mensagem primeiro.");
            return;
        }
        setShowImageModal(false);
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: `Gerar imagem (${selectedAspectRatio}): ${inputValue}`, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            let base64Image: string | null = null;
            try {
                base64Image = await generateCampaignImage(userMsg.text || "", selectedAspectRatio);
            } catch {
                base64Image = null;
            }

            const modelMsg: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'model', 
                text: base64Image ? "Aqui está a imagem gerada:" : "Desculpe, não consegui gerar a imagem.",
                image: base64Image || undefined,
                timestamp: Date.now() 
            };
            
            if (isMountedRef.current) setMessages(prev => [...prev, modelMsg]);
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (isLoading || !inputValue.trim()) return;
        
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        const history = messages.filter(m => !m.isError).slice(-10).map(m => ({
            role: m.role,
            parts: [{ text: m.text || "" }]
        }));

        try {
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

            if (isMountedRef.current) setMessages(prev => [...prev, modelMsg]);
        } catch {
            if (isMountedRef.current) {
                setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: FALLBACK_ERROR_TEXT, isError: true, timestamp: Date.now() }]);
            }
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent relative">
            <div className="absolute top-0 left-0 right-0 z-20 p-2">
                <div className="glass-panel p-2 rounded-2xl max-w-2xl mx-auto">
                    <div role="group" aria-label="Modo do assistente" className="flex gap-1 overflow-x-auto scrollbar-hide justify-between sm:justify-center">
                        <ModeButton m="fast" activeMode={mode} onSelect={setMode} icon={Zap} label="Rápido" color="yellow" />
                        <ModeButton m="standard" activeMode={mode} onSelect={setMode} icon={Sparkles} label="Padrão" color="blue" />
                        <ModeButton m="search" activeMode={mode} onSelect={setMode} icon={Search} label="Web" color="green" />
                        <ModeButton m="location" activeMode={mode} onSelect={setMode} icon={MapPin} label="Local" color="red" />
                        <ModeButton m="thinking" activeMode={mode} onSelect={setMode} icon={BrainCircuit} label="Pro" color="purple" />
                    </div>
                </div>
            </div>

            <div role="log" aria-live="polite" aria-label="Conversa com o assistente" className="flex-1 overflow-y-auto px-4 pt-20 pb-4 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] p-4 md:p-6 relative ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                            : 'glass-panel text-midnight dark:text-gray-100 rounded-2xl rounded-tl-sm'
                        }`}>
                            {msg.image && (
                                <img src={msg.image} alt="Imagem gerada pelo assistente" className="w-full rounded-xl mb-3 border border-white/20" />
                            )}
                            <div role={msg.isError ? 'alert' : undefined} className={`prose dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap font-medium ${msg.isError ? 'text-red-700 dark:text-red-300' : ''}`}>
                                {msg.text}
                            </div>

                            {msg.groundingMetadata?.search && msg.groundingMetadata.search.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                                    <p className="text-xs font-semibold text-subtle mb-2">Fontes verificadas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.groundingMetadata.search.map((s, i) => {
                                            const href = safeHttpUrl(s.uri);
                                            if (!href) return null;
                                            return (
                                                <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="min-h-11 text-xs font-medium text-blue-700 dark:text-blue-300 underline-offset-2 hover:underline rounded flex items-center gap-1 focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                                    <Search size={12} aria-hidden="true" /> {s.title}<span className="sr-only"> (abre em nova aba)</span>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {msg.groundingMetadata?.maps && msg.groundingMetadata.maps.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                                    <p className="text-xs font-semibold text-subtle mb-2">Localização</p>
                                    {msg.groundingMetadata.maps.map((m, i) => {
                                        const href = safeHttpUrl(m.uri);
                                        return (
                                            <div key={i} className="mb-2 bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200/70 dark:border-white/10">
                                                <p className="text-xs font-bold">{m.title}</p>
                                                <p className="text-xs text-subtle mb-1">{m.source}</p>
                                                {href && (
                                                    <a href={href} target="_blank" rel="noopener noreferrer" className="min-h-11 text-xs font-medium text-blue-700 dark:text-blue-300 underline-offset-2 hover:underline rounded inline-flex items-center gap-1 focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                                        <MapPin size={12} aria-hidden="true" /> Ver no mapa<span className="sr-only"> (abre em nova aba)</span>
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start" role="status">
                        <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-3">
                            <Loader2 size={16} className="animate-spin text-blue-700 dark:text-blue-300" aria-hidden="true" />
                            <span className="text-xs font-medium text-subtle">
                                {mode === 'thinking' ? 'Analisando dados complexos...' : 
                                 mode === 'search' ? 'Conectando à internet...' : 
                                 'Processando...'}
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 pt-0">
                <div className="max-w-3xl mx-auto glass-panel rounded-2xl p-2 flex items-center gap-2 relative z-30">
                    <button 
                        type="button"
                        onClick={() => setShowImageModal(true)}
                        className="w-11 h-11 flex items-center justify-center text-subtle hover:text-blue-700 transition-colors rounded-full hover:bg-blue-50 dark:hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-blue-500/40"
                        title="Gerar imagem"
                        aria-label="Gerar imagem"
                        aria-haspopup="dialog"
                    >
                        <ImageIcon size={20} strokeWidth={2} aria-hidden="true" />
                    </button>

                    <input 
                        type="text" 
                        aria-label="Mensagem para o assistente"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSendMessage();
                        }}
                        placeholder={isRecording ? "Ouvindo sua voz..." : "Pergunte ao PapoReto..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-midnight dark:text-white placeholder:text-subtle h-11"
                        disabled={isRecording}
                    />

                    {inputValue.trim() ? (
                        <button 
                            type="button"
                            onClick={handleSendMessage}
                            disabled={isLoading}
                            aria-label="Enviar mensagem"
                            className="w-11 h-11 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            aria-label={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                            className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40 ${isRecording ? 'bg-red-700 text-white' : 'text-subtle hover:text-red-700 hover:bg-red-50 dark:hover:bg-white/10'}`}
                        >
                            {isRecording ? <StopCircle size={20} strokeWidth={2.5} aria-hidden="true" /> : <Mic size={20} strokeWidth={2} aria-hidden="true" />}
                        </button>
                    )}
                </div>
                <div className="text-center mt-2">
                    <p className="text-xs font-medium text-subtle">
                        IA opcional • Pode cometer erros
                    </p>
                </div>
            </div>

            {showImageModal && (
                <Modal onClose={() => setShowImageModal(false)} labelledBy="chat-imagem-titulo" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-3xl w-full max-w-sm relative">
                        <button type="button" onClick={() => setShowImageModal(false)} aria-label="Fechar" className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-subtle hover:bg-slate-100 dark:hover:bg-white/10 rounded-full focus-visible:ring-4 focus-visible:ring-blue-500/40"><X size={20} aria-hidden="true" /></button>
                        <h3 id="chat-imagem-titulo" className="font-black text-lg mb-4 pr-10 text-midnight dark:text-white flex items-center gap-2">
                            <ImageIcon size={20} className="text-blue-700 dark:text-blue-300" aria-hidden="true" /> Criar imagem
                        </h3>
                                        <p className="text-sm text-muted-strong font-medium mb-6 leading-relaxed">Escolha o formato e descreva o cenário no chat para gerar imagens de campanha ou simulações.</p>
                        
                        <div className="grid grid-cols-3 gap-3 mb-6" role="group" aria-label="Formato da imagem">
                            {ASPECT_RATIOS.map(ratio => (
                                <button
                                    key={ratio}
                                    type="button"
                                    onClick={() => setSelectedAspectRatio(ratio)}
                                    aria-pressed={selectedAspectRatio === ratio}
                                    className={`min-h-11 py-3 px-2 rounded-2xl text-xs font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                                        selectedAspectRatio === ratio 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-slate-100 dark:bg-white/10 text-muted-strong hover:bg-slate-200 dark:hover:bg-white/20'
                                    }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>

                        <button 
                            type="button"
                            onClick={handleGenerateImage}
                            className="w-full min-h-11 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-colors active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-blue-500/40"
                        >
                            Gerar agora
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ChatView;
