
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, Sparkles, Zap, MapPin, Search, BrainCircuit, X, Loader2, ChevronDown, StopCircle } from 'lucide-react';
import { chatWithGemini, generateCampaignImage, transcribeAudio } from '../services/ai';
import { ChatMessage, ChatMode } from '../types';

interface ChatViewProps {
    onBack?: () => void;
    initialContext?: string;
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

    const ModeButton = ({ m, icon: Icon, label, color }: any) => (
        <button 
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                mode === m 
                ? `bg-white dark:bg-gray-800 border-${color}-500 text-${color}-600 shadow-sm` 
                : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
            <Icon size={14} className={mode === m ? `text-${color}-500` : ''} />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-[#F3F4F6] dark:bg-black relative">
            
            {/* Header / Mode Selector */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-3 z-20">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 max-w-full">
                    <ModeButton m="fast" icon={Zap} label="Rápido" color="yellow" />
                    <ModeButton m="standard" icon={Sparkles} label="Padrão" color="blue" />
                    <ModeButton m="search" icon={Search} label="Pesquisa" color="green" />
                    <ModeButton m="location" icon={MapPin} label="Local" color="red" />
                    <ModeButton m="thinking" icon={BrainCircuit} label="Profundo" color="purple" />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
                        }`}>
                            {msg.image && (
                                <img src={msg.image} alt="Generated" className="w-full rounded-xl mb-3 border border-white/20" />
                            )}
                            
                            <div className="prose dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                            </div>

                            {/* Grounding Sources */}
                            {msg.groundingMetadata?.search && msg.groundingMetadata.search.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Fontes</p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.groundingMetadata.search.map((s, i) => (
                                            <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate max-w-full block bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                                {s.title}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.groundingMetadata?.maps && msg.groundingMetadata.maps.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Localização</p>
                                    {msg.groundingMetadata.maps.map((m, i) => (
                                        <div key={i} className="mb-2 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                                            <p className="text-xs font-bold">{m.title}</p>
                                            <p className="text-xs text-gray-500 mb-1">{m.source}</p>
                                            <a href={m.uri} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-500 text-white px-2 py-1 rounded inline-flex items-center gap-1">
                                                <MapPin size={10}/> Ver no Mapa
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
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-blue-500" />
                            <span className="text-xs font-bold text-gray-400 animate-pulse">
                                {mode === 'thinking' ? 'Analisando profundamente...' : 
                                 mode === 'search' ? 'Pesquisando na web...' : 
                                 'Digitando...'}
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <div className="relative flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-[1.5rem] border border-transparent focus-within:border-blue-500 transition-colors">
                    
                    <button 
                        onClick={() => setShowImageModal(true)}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Gerar Imagem"
                    >
                        <ImageIcon size={20} />
                    </button>

                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={isRecording ? "Ouvindo..." : "Mensagem..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                        disabled={isRecording}
                    />

                    {inputValue.trim() ? (
                        <button 
                            onClick={handleSendMessage}
                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform active:scale-95 shadow-md"
                        >
                            <Send size={18} />
                        </button>
                    ) : (
                        <button 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {isRecording ? <StopCircle size={20}/> : <Mic size={20} />}
                        </button>
                    )}
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-gray-400">
                        IA pode cometer erros. Verifique informações importantes.
                    </p>
                </div>
            </div>

            {/* Image Settings Modal */}
            {showImageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setShowImageModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        <h3 className="font-black text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                            <ImageIcon size={20} className="text-blue-500"/> Criar Imagem
                        </h3>
                        
                        <p className="text-xs text-gray-500 mb-4">Escolha a proporção e digite a descrição no chat.</p>
                        
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {['1:1', '3:4', '4:3', '9:16', '16:9', '21:9'].map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setSelectedAspectRatio(ratio)}
                                    className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition-all ${
                                        selectedAspectRatio === ratio 
                                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                                        : 'border-gray-100 dark:border-gray-800 text-gray-500'
                                    }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={handleGenerateImage}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg"
                        >
                            Gerar com Texto Atual
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatView;
