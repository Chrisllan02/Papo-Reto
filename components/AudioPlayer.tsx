import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { speakContent } from '../services/ai';

// --- SINGLETON AUDIO CONTEXT ---
// Previne vazamento de memória (máximo de 6 contextos por navegador)
let sharedAudioContext: AudioContext | null = null;

interface AudioPlayerProps {
    text: string;
    isDarkText: boolean;
    compact?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ text, isDarkText, compact = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const isMountedRef = useRef(true);

    // Cleanup Effect: Para o áudio se o componente for desmontado (ex: fechar modal)
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (sourceNodeRef.current) {
                try {
                    sourceNodeRef.current.stop();
                    sourceNodeRef.current.disconnect();
                } catch (e) {
                    // Ignora erro se o áudio já tiver parado
                }
                sourceNodeRef.current = null;
            }
        };
    }, []);

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Previne click no card
        
        if (isPlaying) {
            if (sourceNodeRef.current) {
                try { sourceNodeRef.current.stop(); } catch (e) {}
                sourceNodeRef.current = null;
            }
            setIsPlaying(false);
            return;
        }

        setIsLoading(true);
        try {
            const audioData = await speakContent(text);
            
            // Verifica se o componente ainda está montado após o await
            if (!isMountedRef.current) return;

            if (!audioData) throw new Error("Audio generation failed");

            // Initialize Singleton lazily on first user interaction
            if (!sharedAudioContext) {
                sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            // Resume if suspended (common browser policy)
            if (sharedAudioContext.state === 'suspended') {
                await sharedAudioContext.resume();
            }

            const buffer = await decodeAudioData(audioData, sharedAudioContext, 24000, 1);
            
            // Verifica novamente antes de tocar
            if (!isMountedRef.current) return;

            const source = sharedAudioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(sharedAudioContext.destination);
            
            source.onended = () => {
                if (isMountedRef.current) setIsPlaying(false);
            };
            
            source.start();
            sourceNodeRef.current = source;
            setIsPlaying(true);
        } catch (e) {
            console.error(e);
            if (isMountedRef.current) {
                alert("Erro ao gerar áudio. Tente novamente.");
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
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

    // Estilo Compacto (Apenas Ícone)
    if (compact) {
        return (
            <button 
                onClick={handlePlay}
                disabled={isLoading}
                aria-label={isPlaying ? "Parar áudio" : "Ouvir resumo"}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    isPlaying 
                    ? 'bg-orange-500 text-white animate-pulse' 
                    : 'bg-white/80 dark:bg-white/10 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-white/20'
                }`}
            >
                {isLoading ? <Loader2 className="animate-spin" size={16}/> : isPlaying ? <VolumeX size={16}/> : <Volume2 size={16}/>}
            </button>
        );
    }

    // Estilo Padrão (Modal)
    const buttonClass = isPlaying 
        ? 'bg-orange-500 text-white animate-pulse border-orange-400' 
        : isDarkText 
            ? 'bg-white/80 hover:bg-white text-gray-900 border-white/40 shadow-sm' 
            : 'bg-white/20 hover:bg-white/30 text-white border-white/20'; 

    return (
        <button 
            onClick={handlePlay}
            disabled={isLoading}
            aria-label={isPlaying ? "Parar áudio" : "Ouvir conteúdo"}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center gap-2 backdrop-blur-md border ${buttonClass}`}
        >
            {isLoading ? <Loader2 className="animate-spin" size={18}/> : isPlaying ? <VolumeX size={18}/> : <Volume2 size={18}/>}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline pt-[1px]">
                {isLoading ? "Processando..." : isPlaying ? "Ouvindo" : "Ouvir"}
            </span>
        </button>
    );
};

export default AudioPlayer;