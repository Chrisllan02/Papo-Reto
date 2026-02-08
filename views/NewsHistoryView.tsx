
import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, Newspaper, ExternalLink, Calendar, Search, X, Sparkles, Trash2, Share2, ImageOff, RefreshCw, Loader2, LayoutGrid, List as ListIcon, AlignLeft } from 'lucide-react';
import { getNewsHistory, clearNewsHistory, chatWithGemini } from '../services/ai';
import { NewsArticle } from '../types';
import html2canvas from 'html2canvas';

interface NewsHistoryViewProps {
    onBack: () => void;
}

// --- CUSTOM HOOKS ---

// Hook de Debounce para performance de busca
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// --- SUB-COMPONENTS ROBUSTER ---

// Componente de Imagem com Fallback em Cascata
const ImageWithFallback = ({ src, alt, className }: { src?: string, alt: string, className?: string }) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error' | 'fallback'>('loading');
    const fallbackSrc = "https://images.unsplash.com/photo-1541872703-74c5e4436bb7?q=80&w=800&auto=format&fit=crop";

    useEffect(() => {
        if (!src) setStatus('error');
        else setStatus('loading');
    }, [src]);

    const handleError = () => {
        if (status === 'loading' || status === 'loaded') {
            setStatus('fallback');
        } else if (status === 'fallback') {
            setStatus('error');
        }
    };

    if (status === 'error' || !src) {
        return (
            <div className={`flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-400 ${className}`}>
                <ImageOff size={24} strokeWidth={1.5} />
            </div>
        );
    }

    return (
        <img 
            src={status === 'fallback' ? fallbackSrc : src} 
            alt={alt}
            className={`${className} transition-opacity duration-500 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setStatus('loaded')}
            onError={handleError}
            loading="lazy"
            crossOrigin="anonymous" // Importante para html2canvas
        />
    );
};

// --- MAIN COMPONENT ---

const NewsHistoryView: React.FC<NewsHistoryViewProps> = ({ onBack }) => {
    const [history, setHistory] = useState<NewsArticle[]>([]);
    const [query, setQuery] = useState('');
    
    // Performance: Aguarda 350ms após a última digitação para atualizar o filtro
    const debouncedQuery = useDebounce(query, 350);
    
    const [selectedTag, setSelectedTag] = useState('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Estado de Visualização
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [summaryResult, setSummaryResult] = useState<string | null>(null);
    
    // Sharing State
    const [sharingItem, setSharingItem] = useState<NewsArticle | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        const loaded = getNewsHistory();
        setHistory(loaded);
    }, []);

    // Effect para gerar imagem quando sharingItem muda
    useEffect(() => {
        if (!sharingItem) return;

        const generateAndShare = async () => {
            // Pequeno delay para garantir que o DOM renderizou o card escondido
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const element = document.getElementById('share-card-capture');
            if (!element) {
                setIsSharing(false);
                setSharingItem(null);
                return;
            }

            try {
                const canvas = await html2canvas(element, {
                    useCORS: true,
                    scale: 2, // Melhor qualidade
                    backgroundColor: '#0F172A', // Midnight fallback
                    logging: false
                });

                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!blob) throw new Error("Falha ao criar imagem");

                const file = new File([blob], `paporeto-news-${sharingItem.id}.png`, { type: 'image/png' });
                const shareData = {
                    files: [file],
                    title: sharingItem.title,
                    text: `${sharingItem.summary.context}: ${sharingItem.summary.main}\n\nVia App PapoReto 🇧🇷`
                };

                if (navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                } else {
                    // Fallback para texto se arquivos não suportados
                    await navigator.share({
                        title: sharingItem.title,
                        text: `${sharingItem.summary.context}: ${sharingItem.summary.main}\n\nLeia mais: ${sharingItem.url}\n\nVia App PapoReto 🇧🇷`,
                        url: sharingItem.url
                    });
                }
            } catch (error) {
                console.error("Erro ao compartilhar:", error);
                // Último fallback: Copiar link
                try {
                    await navigator.clipboard.writeText(`${sharingItem.title}\n${sharingItem.url}`);
                    alert("Link copiado para a área de transferência!");
                } catch(e) {}
            } finally {
                setIsSharing(false);
                setSharingItem(null);
            }
        };

        generateAndShare();
    }, [sharingItem]);

    // 1. Filtragem Otimizada com useMemo e Debounce
    const filteredHistory = useMemo(() => {
        let items = history;

        // Filtro de Texto (Usa valor "debounced")
        if (debouncedQuery) {
            const lowerQ = debouncedQuery.toLowerCase();
            items = items.filter(h => 
                h.title.toLowerCase().includes(lowerQ) || 
                h.source.toLowerCase().includes(lowerQ) ||
                h.summary.main.toLowerCase().includes(lowerQ)
            );
        }

        // Filtro de Tags
        if (selectedTag !== 'Todos') {
            items = items.filter(h => 
                h.source.includes(selectedTag) || 
                h.summary.context.includes(selectedTag)
            );
        }

        return items;
    }, [history, debouncedQuery, selectedTag]);

    // 2. Agrupamento Temporal Avançado
    const groupedHistory = useMemo(() => {
        const groups: Record<string, NewsArticle[]> = { 
            'Hoje': [], 
            'Ontem': [], 
            'Esta Semana': [], 
            'Este Mês': [], 
            'Antigos': [] 
        };
        
        const now = new Date();
        now.setHours(0,0,0,0);

        filteredHistory.forEach(item => {
            let itemDate = new Date();
            try {
                // Tenta lidar com formatos "DD/MM/YYYY" e "DD/MM/YYYY às HH:mm"
                const datePart = item.time.includes('às') ? item.time.split('às')[0].trim() : item.time.trim();
                const [day, month, year] = datePart.split('/').map(Number);
                
                if (!day || !month || !year) throw new Error("Data inválida");
                
                itemDate = new Date(year, month - 1, day);
                itemDate.setHours(0,0,0,0);
            } catch (e) {
                // Se falhar o parse, considera "Antigos" para não quebrar a UI
                groups['Antigos'].push(item);
                return;
            }

            const diffTime = now.getTime() - itemDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) groups['Hoje'].push(item);
            else if (diffDays === 1) groups['Ontem'].push(item);
            else if (diffDays <= 7) groups['Esta Semana'].push(item);
            else if (diffDays <= 30) groups['Este Mês'].push(item);
            else groups['Antigos'].push(item);
        });

        return groups;
    }, [filteredHistory]);

    // 3. Ações
    const handleClearHistory = () => {
        if (confirm("Tem certeza que deseja limpar todo o histórico de notícias?")) {
            clearNewsHistory();
            setHistory([]);
        }
    };

    const triggerShare = (e: React.MouseEvent, item: NewsArticle) => {
        e.stopPropagation();
        if (isSharing) return;
        setIsSharing(true);
        setSharingItem(item);
    };

    const handleSmartSummary = async () => {
        if (filteredHistory.length === 0) return;
        setIsGeneratingSummary(true);
        try {
            const headlines = filteredHistory.slice(0, 8).map(h => `- ${h.title} (${h.summary.context})`).join('\n');
            const prompt = `Atue como um analista político sênior. Com base APENAS nas seguintes manchetes recentes do Congresso, gere um parágrafo único (máximo 50 palavras) resumindo a conjuntura política atual para um jovem da Geração Z. Seja direto e use linguagem acessível.\n\nManchetes:\n${headlines}`;
            
            const response = await chatWithGemini(prompt, 'fast');
            setSummaryResult(response.text);
        } catch (e) {
            setSummaryResult("Não foi possível gerar o resumo agora. Tente novamente.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const groupKeys = ['Hoje', 'Ontem', 'Esta Semana', 'Este Mês', 'Antigos'] as const;

    return (
        <div className="w-full h-full bg-transparent font-sans flex flex-col relative">
            
            {/* --- HIDDEN SHARE CARD TEMPLATE --- */}
            {sharingItem && (
                <div id="share-card-capture" className="fixed top-0 left-[-9999px] w-[1080px] h-[1080px] bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] p-16 flex flex-col justify-between text-white font-sans z-0 pointer-events-none">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                <Newspaper size={48} className="text-blue-400" strokeWidth={2}/>
                            </div>
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter leading-none">PapoReto</h1>
                                <p className="text-xl font-bold text-blue-300 uppercase tracking-widest mt-1">Transparência Radical</p>
                            </div>
                        </div>
                        <div className="px-6 py-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                            <span className="text-2xl font-black uppercase tracking-widest text-white/80">{sharingItem.source}</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-10">
                        <span className="inline-block px-8 py-3 rounded-2xl bg-blue-500 text-white text-2xl font-black uppercase tracking-widest shadow-lg">
                            {sharingItem.summary.context}
                        </span>
                        <h2 className="text-7xl font-black leading-[1.1] tracking-tight drop-shadow-lg">
                            {sharingItem.title}
                        </h2>
                        <div className="w-32 h-3 bg-blue-500 rounded-full"></div>
                        <p className="text-4xl font-medium leading-relaxed text-gray-200 max-w-4xl">
                            {sharingItem.summary.main}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end border-t border-white/10 pt-10">
                        <div>
                            <p className="text-2xl font-bold text-gray-400 mb-1">Atualizado em</p>
                            <p className="text-3xl font-black">{sharingItem.time}</p>
                        </div>
                        <div className="flex items-center gap-4 opacity-70">
                            <div className="w-4 h-4 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.8)]"></div>
                            <span className="text-2xl font-black uppercase tracking-widest">Dados Oficiais</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Modal Overlay */}
            {summaryResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSummaryResult(null)}>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] max-w-md w-full shadow-2xl relative border border-white/20" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSummaryResult(null)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20}/></button>
                        <div className="flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-400 font-black uppercase text-xs tracking-wider">
                            <Sparkles size={18} /> Resumo Inteligente
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 text-base font-medium leading-relaxed">
                            {summaryResult}
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setSummaryResult(null)} className="px-5 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-xs uppercase hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="sticky top-0 z-30 pt-4 px-3 md:px-6 pb-2">
                <div className="w-full glass rounded-[2.5rem] p-4 shadow-lg max-w-[2000px] mx-auto flex flex-col gap-4 border border-white/40 dark:border-white/10 bg-white/80 dark:bg-midnight/90 backdrop-blur-xl">
                    
                    {/* Top Row: Title, Back, Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={onBack} 
                                className="p-2.5 bg-gray-100/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-full transition-all active:scale-95 border border-white/20"
                            >
                                <ChevronLeft className="text-gray-700 dark:text-white" size={20}/>
                            </button>
                            <div>
                                <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white leading-none flex items-center gap-2">
                                    <Newspaper size={20} className="text-blue-600"/> Galeria
                                </h1>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acervo ({history.length})</p>
                            </div>
                        </div>

                        {/* Layout Toggle & Actions */}
                        <div className="flex gap-2">
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-white/10">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Visualização em Grade"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Visualização em Lista"
                                >
                                    <AlignLeft size={16} />
                                </button>
                            </div>

                            {history.length > 0 && (
                                <button 
                                    onClick={handleClearHistory}
                                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-200"
                                    title="Limpar Histórico"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Controls Row: Search & Chips */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input 
                                type="text"
                                placeholder="Buscar manchetes..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="block w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all"
                            />
                            {query && (
                                <button onClick={() => setQuery('')} className="absolute inset-y-0 right-0 pr-2 flex items-center">
                                    <div className="p-0.5 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 hover:text-red-500 transition-colors cursor-pointer">
                                        <X size={12} />
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Chips */}
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {['Todos', 'Câmara', 'Senado', 'Urgente'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${
                                        selectedTag === tag 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                        : 'bg-white dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10 hover:bg-gray-50'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Mobile Only Summary Button */}
                    <button 
                        onClick={handleSmartSummary}
                        disabled={isGeneratingSummary || history.length === 0}
                        className="md:hidden flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl font-bold text-xs border border-purple-200 dark:border-purple-800 active:scale-95 transition-all"
                    >
                        {isGeneratingSummary ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14} />}
                        Gerar Resumo Inteligente
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 px-safe">
                <div className="max-w-[2000px] mx-auto space-y-8">
                    
                    {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-60 text-center">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Newspaper className="h-10 w-10 text-gray-400" strokeWidth={1.5}/>
                            </div>
                            <h3 className="text-lg font-black text-gray-700 dark:text-white mb-2">Histórico Vazio</h3>
                            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                                Nenhuma notícia encontrada com os filtros atuais.
                            </p>
                            {history.length > 0 && (
                                <button onClick={() => { setQuery(''); setSelectedTag('Todos'); }} className="mt-6 text-blue-600 font-bold text-xs uppercase hover:underline">
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        groupKeys.map(groupName => {
                            const items = groupedHistory[groupName];
                            if (items.length === 0) return null;

                            return (
                                <div key={groupName} className="space-y-4">
                                    <h3 className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 tracking-widest pl-2 border-b border-gray-200 dark:border-white/5 pb-2">
                                        <Calendar size={12}/> {groupName}
                                    </h3>
                                    
                                    <div className={viewMode === 'grid' 
                                        ? "columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6" 
                                        : "flex flex-col gap-3"
                                    }>
                                        {items.map((item) => (
                                            <div 
                                                key={item.id || item.title + item.time}
                                                className={`group bg-white dark:bg-gray-900 overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 transition-all duration-300 relative break-inside-avoid ${
                                                    viewMode === 'list' 
                                                    ? 'flex flex-row items-center p-3 rounded-2xl gap-4 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 hover:shadow-md' 
                                                    : 'flex flex-col rounded-[2rem] hover:shadow-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:-translate-y-2'
                                                }`}
                                            >
                                                {/* Image Area */}
                                                <div className={`relative shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 ${
                                                    viewMode === 'list' 
                                                    ? 'w-20 h-20 rounded-xl' 
                                                    : 'h-44 w-full'
                                                }`}>
                                                    <ImageWithFallback 
                                                        src={item.imageUrl} 
                                                        alt={item.title} 
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                    />
                                                    
                                                    {viewMode === 'grid' && (
                                                        <>
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                                            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                                                <span className="bg-white/90 dark:bg-black/80 backdrop-blur-md text-black dark:text-white text-[9px] font-black uppercase px-2 py-1 rounded-md shadow-sm">
                                                                    {item.source}
                                                                </span>
                                                                <button 
                                                                    onClick={(e) => triggerShare(e, item)}
                                                                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                                                                        isSharing && sharingItem?.id === item.id
                                                                        ? 'bg-blue-600 text-white animate-pulse'
                                                                        : 'bg-white/20 hover:bg-white text-white hover:text-black'
                                                                    }`}
                                                                    title="Compartilhar Card"
                                                                    disabled={isSharing}
                                                                >
                                                                    {isSharing && sharingItem?.id === item.id ? <Loader2 size={12} className="animate-spin"/> : <Share2 size={12} />}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Content Area */}
                                                <div className={`flex flex-col flex-1 ${viewMode === 'list' ? 'py-1 pr-2 min-w-0' : 'p-5'}`}>
                                                    <h3 className={`font-black text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors ${
                                                        viewMode === 'list' ? 'text-sm mb-1.5 line-clamp-2' : 'text-sm md:text-base mb-3 line-clamp-3'
                                                    }`}>
                                                        {item.title}
                                                    </h3>
                                                    
                                                    {viewMode === 'grid' && (
                                                        <div className="mb-4">
                                                            <span className="inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase px-2 py-0.5 rounded mb-2 border border-blue-100 dark:border-blue-900/30">
                                                                {item.summary.context}
                                                            </span>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-4">
                                                                {item.summary.main}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {viewMode === 'list' && (
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[9px] font-black uppercase bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                                                {item.summary.context}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 font-bold truncate">
                                                                {item.time.split('às')[1] || item.time}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className={`flex justify-between items-center ${viewMode === 'grid' ? 'mt-auto pt-3 border-t border-gray-50 dark:border-white/5' : 'mt-1'}`}>
                                                        {viewMode === 'grid' && (
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                                                                {item.time.split('às')[1] || item.time}
                                                            </span>
                                                        )}
                                                        <div className="flex gap-2 ml-auto">
                                                            {viewMode === 'list' && (
                                                                <button 
                                                                    onClick={(e) => triggerShare(e, item)}
                                                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                    title="Compartilhar"
                                                                >
                                                                    {isSharing && sharingItem?.id === item.id ? <Loader2 size={14} className="animate-spin"/> : <Share2 size={14} />}
                                                                </button>
                                                            )}
                                                            <a 
                                                                href={item.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className={`text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 hover:underline rounded-lg transition-colors ${
                                                                    viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5' : 'px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                                }`}
                                                            >
                                                                Ler Mais <ExternalLink size={10}/>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewsHistoryView;
