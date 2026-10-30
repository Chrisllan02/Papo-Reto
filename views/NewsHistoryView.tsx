
import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, Newspaper, ExternalLink, Calendar, Search, X, Sparkles, Share2, ImageOff, RefreshCw, Loader2, LayoutGrid, AlignLeft, Download } from 'lucide-react';
import { getNewsHistory, chatWithGemini } from '../services/ai';
import { NewsArticle } from '../types';
import Modal from '../components/Modal';
import DataState from '../components/DataState';
import { parseLocalDate } from '../utils/date';
import { safeHttpUrl } from '../utils/url';

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

// Imagem da notícia; sem imagem válida mostra um espaço neutro (nunca uma foto genérica)
const ImageWithFallback = ({ src, alt, className }: { src?: string, alt: string, className?: string }) => {
    const [result, setResult] = useState<{ src: string; status: 'loaded' | 'error' } | null>(null);
    const status = result && result.src === src ? result.status : 'loading';

    if (status === 'error' || !src) {
        return (
            <div aria-hidden="true" className={`flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-400 ${className}`}>
                <ImageOff size={24} strokeWidth={1.5} />
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt}
            className={`${className} transition-opacity duration-500 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setResult({ src, status: 'loaded' })}
            onError={() => setResult({ src, status: 'error' })}
            loading="lazy"
        />
    );
};

// --- MAIN COMPONENT ---

const NewsHistoryView: React.FC<NewsHistoryViewProps> = ({ onBack }) => {
    const [history] = useState<NewsArticle[]>(getNewsHistory);
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
    const [shareNotice, setShareNotice] = useState<{ message: string; downloadUrl?: string; fileName?: string } | null>(null);

    useEffect(() => {
        const url = shareNotice?.downloadUrl;
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [shareNotice?.downloadUrl]);

    useEffect(() => {
        if (!shareNotice || shareNotice.downloadUrl) return;
        const timer = setTimeout(() => setShareNotice(null), 5000);
        return () => clearTimeout(timer);
    }, [shareNotice]);

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
                const { default: html2canvas } = await import('html2canvas');
                const canvas = await html2canvas(element, {
                    useCORS: true,
                    scale: 2, // Melhor qualidade
                    backgroundColor: '#0F172A', // Midnight fallback
                    logging: false
                });

                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!blob) throw new Error("Falha ao criar imagem");

                const fileName = `paporeto-news-${sharingItem.id ?? 'noticia'}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });
                const itemUrl = safeHttpUrl(sharingItem.url);
                const shareData = {
                    files: [file],
                    title: sharingItem.title,
                    text: `${sharingItem.summary?.context || ''}: ${sharingItem.summary?.main || ''}\n\nVia App PapoReto 🇧🇷`
                };

                // O navegador pode recusar o compartilhamento (ex.: ativação do usuário expirou durante a geração da imagem).
                // Nesse caso, oferecemos o download da imagem.
                const offerDownload = (message: string) =>
                    setShareNotice({ message, downloadUrl: URL.createObjectURL(blob), fileName });

                try {
                    if (navigator.canShare && navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                    } else if (typeof navigator.share === 'function') {
                        await navigator.share({
                            title: sharingItem.title,
                            text: `${sharingItem.summary?.context || ''}: ${sharingItem.summary?.main || ''}\n\nVia App PapoReto 🇧🇷`,
                            ...(itemUrl ? { url: itemUrl } : {})
                        });
                    } else {
                        offerDownload('Seu navegador não compartilha imagens. Baixe o card para enviar.');
                    }
                } catch (shareError) {
                    if ((shareError as DOMException)?.name !== 'AbortError') {
                        offerDownload('Não foi possível abrir o compartilhamento. Baixe o card para enviar.');
                    }
                }
            } catch (error) {
                console.error("Erro ao compartilhar:", error);
                // Último fallback: Copiar link
                try {
                    const itemUrl = safeHttpUrl(sharingItem.url);
                    await navigator.clipboard.writeText(itemUrl ? `${sharingItem.title}\n${itemUrl}` : sharingItem.title);
                    setShareNotice({ message: 'Link copiado para a área de transferência.' });
                } catch {
                    setShareNotice({ message: 'Não foi possível compartilhar agora.' });
                }
            } finally {
                setIsSharing(false);
                setSharingItem(null);
            }
        };

        generateAndShare();
    }, [sharingItem]);

    // 1. Filtragem Otimizada com Mapeamento Semântico
    const filteredHistory = useMemo(() => {
        let items = history;

        // Filtro de Texto (Usa valor "debounced")
        if (debouncedQuery) {
            const lowerQ = debouncedQuery.toLowerCase();
            items = items.filter(h => 
                (h.title || '').toLowerCase().includes(lowerQ) || 
                (h.source || '').toLowerCase().includes(lowerQ) ||
                (h.summary?.main || '').toLowerCase().includes(lowerQ)
            );
        }

        // Filtro de Tags (Lógica Semântica Corrigida)
        if (selectedTag !== 'Todos') {
            items = items.filter(h => {
                const source = (h.source || '').toLowerCase();
                const url = (h.url || '').toLowerCase();
                const context = (h.summary?.context || '').toLowerCase();
                const title = (h.title || '').toLowerCase();

                if (selectedTag === 'Câmara') {
                    // Pega tudo relacionado à Câmara
                    return source.includes('câmara') || source.includes('plenário') || source.includes('protocolo') || source.includes('agenda') || url.includes('camara.leg.br');
                }
                if (selectedTag === 'Senado') {
                    // Pega tudo relacionado ao Senado
                    return source.includes('senado') || url.includes('senado.leg.br');
                }
                
                if (selectedTag === 'Urgente') {
                    // Pega baseada em palavras-chave de impacto
                    const urgentKeywords = ['urgência', 'urgente', 'crise', 'polêmica', 'aprovado', 'rejeitado', 'sanção', 'veto', 'imediat'];
                    return urgentKeywords.some(k => context.includes(k) || title.includes(k));
                }

                return source.includes(selectedTag.toLowerCase());
            });
        }

        return items;
    }, [history, debouncedQuery, selectedTag]);

    // 2. Agrupamento Temporal Avançado (Baseado em Timestamp)
    const groupedHistory = useMemo(() => {
        const groups: Record<string, NewsArticle[]> = { 
            'Hoje': [], 
            'Ontem': [], 
            'Esta Semana': [], 
            'Este Mês': [], 
            'Antigos': [] 
        };
        
        const now = new Date();
        now.setHours(0,0,0,0); // Normaliza para meia-noite de hoje

        filteredHistory.forEach(item => {
            let itemDate: Date;

            // Prioridade total para o Timestamp numérico (mais preciso)
            if (item.timestamp) {
                itemDate = new Date(item.timestamp);
            } else {
                // Fallback para parse de string (Legado)
                const time = item.time || '';
                const datePart = time.includes('às') ? time.split('às')[0].trim() : time.trim();
                const parsed = parseLocalDate(datePart);
                if (!parsed) {
                    groups['Antigos'].push(item);
                    return;
                }
                itemDate = parsed;
            }
            
            // Zera horas para comparação de dias inteiros
            itemDate.setHours(0,0,0,0);

            const diffTime = now.getTime() - itemDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) groups['Hoje'].push(item);
            else if (diffDays === 1) groups['Ontem'].push(item);
            else if (diffDays <= 7) groups['Esta Semana'].push(item);
            else if (diffDays <= 30) groups['Este Mês'].push(item);
            else groups['Antigos'].push(item);
        });

        return groups;
    }, [filteredHistory]);

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
            const headlines = filteredHistory.slice(0, 8).map(h => `- ${h.title} (${h.summary?.context || ''})`).join('\n');
            const prompt = `Atue como um analista político sênior. Com base APENAS nas seguintes manchetes recentes do Congresso, gere um parágrafo único (máximo 50 palavras) resumindo a conjuntura política atual para um jovem da Geração Z. Seja direto e use linguagem acessível.\n\nManchetes:\n${headlines}`;
            
            const response = await chatWithGemini(prompt, 'fast');
            setSummaryResult(response.text);
        } catch {
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
                                <Newspaper size={48} className="text-blue-400" strokeWidth={2} aria-hidden="true" />
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
                            {sharingItem.summary?.context}
                        </span>
                        <h2 className="text-7xl font-black leading-[1.1] tracking-tight drop-shadow-lg">
                            {sharingItem.title}
                        </h2>
                        <div className="w-32 h-3 bg-blue-500 rounded-full"></div>
                        <p className="text-4xl font-medium leading-relaxed text-gray-200 max-w-4xl">
                            {sharingItem.summary?.main}
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
                <Modal onClose={() => setSummaryResult(null)} labelledBy="resumo-titulo" className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] max-w-md w-full shadow-2xl relative border border-white/20">
                        <button type="button" onClick={() => setSummaryResult(null)} aria-label="Fechar" className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-4 focus-visible:ring-blue-500/40"><X size={20} aria-hidden="true" /></button>
                        <div id="resumo-titulo" className="flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-400 font-black uppercase text-xs tracking-wider">
                            <Sparkles size={18} aria-hidden="true" /> Resumo Inteligente
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 text-base font-medium leading-relaxed">
                            {summaryResult}
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={() => setSummaryResult(null)} className="px-5 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-xs uppercase hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40">Fechar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {shareNotice && (
                <div role="status" className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] flex items-center gap-3 rounded-2xl bg-midnight text-white px-4 py-3 text-xs font-bold shadow-2xl border border-white/10">
                    <span>{shareNotice.message}</span>
                    {shareNotice.downloadUrl && (
                        <a href={shareNotice.downloadUrl} download={shareNotice.fileName} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 uppercase tracking-wider focus-visible:ring-4 focus-visible:ring-white/40">
                            <Download size={12} aria-hidden="true" /> Baixar imagem
                        </a>
                    )}
                    <button type="button" onClick={() => setShareNotice(null)} aria-label="Fechar aviso" className="p-1 rounded-full hover:bg-white/15 focus-visible:ring-4 focus-visible:ring-white/40">
                        <X size={14} aria-hidden="true" />
                    </button>
                </div>
            )}

            {/* Header Area */}
            <div className="sticky top-0 z-30 pt-4 px-3 md:px-6 pb-2">
                <div className="w-full glass-panel rounded-[2.5rem] p-4 max-w-[2000px] mx-auto flex flex-col gap-4">
                    
                    {/* Top Row: Title, Back, Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button 
                                type="button"
                                onClick={onBack} 
                                aria-label="Voltar para o Guia Cidadão"
                                className="p-2.5 bg-gray-100/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-full transition-all active:scale-95 border border-white/20 focus-visible:ring-4 focus-visible:ring-blue-500/40"
                            >
                                <ChevronLeft className="text-gray-700 dark:text-white" size={20} aria-hidden="true" />
                            </button>
                            <div>
                                <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white leading-none flex items-center gap-2">
                                    <Newspaper size={20} className="text-blue-600" aria-hidden="true" /> Galeria
                                </h1>
                                <p className="text-[10px] font-bold text-subtle uppercase tracking-wider">Acervo ({history.length})</p>
                            </div>
                        </div>

                        {/* Layout Toggle - Lixeira Removida */}
                        <div className="flex gap-2">
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    aria-label="Visualização em grade"
                                    aria-pressed={viewMode === 'grid'}
                                    className={`p-2 rounded-lg transition-all focus-visible:ring-4 focus-visible:ring-blue-500/40 ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm' : 'text-subtle hover:text-gray-600'}`}
                                    title="Visualização em Grade"
                                >
                                    <LayoutGrid size={16} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    aria-label="Visualização em lista"
                                    aria-pressed={viewMode === 'list'}
                                    className={`p-2 rounded-lg transition-all focus-visible:ring-4 focus-visible:ring-blue-500/40 ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm' : 'text-subtle hover:text-gray-600'}`}
                                    title="Visualização em Lista"
                                >
                                    <AlignLeft size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Controls Row: Search & Chips */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
                            </div>
                            <input 
                                type="text"
                                aria-label="Buscar manchetes"
                                placeholder="Buscar manchetes..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="block w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all"
                            />
                            {query && (
                                <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" className="absolute inset-y-0 right-0 pr-2 flex items-center rounded-xl focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                    <div className="p-0.5 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 hover:text-red-500 transition-colors cursor-pointer">
                                        <X size={12} aria-hidden="true" />
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Chips */}
                        <div role="group" aria-label="Filtrar por origem" className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {['Todos', 'Câmara', 'Senado', 'Urgente'].map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setSelectedTag(tag)}
                                    aria-pressed={selectedTag === tag}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                                        selectedTag === tag 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                        : 'bg-white dark:bg-white/5 text-subtle border-gray-200 dark:border-white/10 hover:bg-gray-50'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Mobile Only Summary Button */}
                    <button 
                        type="button"
                        onClick={handleSmartSummary}
                        disabled={isGeneratingSummary || history.length === 0}
                        className="focus-visible:ring-4 focus-visible:ring-blue-500/40 md:hidden flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl font-bold text-xs border border-purple-200 dark:border-purple-800 active:scale-95 transition-all"
                    >
                        {isGeneratingSummary ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
                        Gerar Resumo Inteligente
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 px-safe">
                <div className="max-w-[2000px] mx-auto space-y-8">
                    
                    {filteredHistory.length === 0 ? (
                        <div className="py-10 flex justify-center">
                            <DataState
                                title="Nenhum resultado"
                                description={history.length > 0
                                    ? `Nenhuma notícia encontrada com o filtro "${selectedTag}" ou a busca atual.`
                                    : 'O acervo de notícias ainda está vazio neste aparelho.'}
                                actionLabel={history.length > 0 ? 'Limpar filtros' : undefined}
                                onAction={history.length > 0 ? () => { setQuery(''); setSelectedTag('Todos'); } : undefined}
                            />
                        </div>
                    ) : (
                        groupKeys.map(groupName => {
                            const items = groupedHistory[groupName];
                            if (items.length === 0) return null;

                            return (
                                <div key={groupName} className="space-y-4">
                                    <h3 className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 tracking-widest pl-2 border-b border-gray-200 dark:border-white/5 pb-2">
                                        <Calendar size={12} aria-hidden="true" /> {groupName}
                                    </h3>
                                    
                                    <div className={viewMode === 'grid' 
                                        ? "columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6" 
                                        : "flex flex-col gap-3"
                                    }>
                                        {items.map((item) => (
                                            <div 
                                                key={item.id || item.title + item.time}
                                                className={`group glass-panel overflow-hidden shadow-sm transition-all duration-300 relative break-inside-avoid ${
                                                    viewMode === 'list' 
                                                    ? 'flex flex-row items-center p-3 rounded-2xl gap-4 hover:shadow-md' 
                                                    : 'flex flex-col rounded-[2rem] hover:shadow-2xl hover:-translate-y-2'
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
alt="" 
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
                                                                    type="button"
                                                                    onClick={(e) => triggerShare(e, item)}
                                                                    aria-label={`Compartilhar notícia: ${item.title}`}
                                                                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors focus-visible:ring-4 focus-visible:ring-white/60 ${
                                                                        isSharing && sharingItem === item
                                                                        ? 'bg-blue-600 text-white animate-pulse'
                                                                        : 'bg-white/20 hover:bg-white text-white hover:text-black'
                                                                    }`}
                                                                    title="Compartilhar card"
                                                                    disabled={isSharing}
                                                                >
                                                                    {isSharing && sharingItem === item ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Share2 size={12} aria-hidden="true" />}
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
                                                                {item.summary?.context}
                                                            </span>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-4">
                                                                {item.summary?.main}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {viewMode === 'list' && (
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[9px] font-black uppercase bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                                                {item.summary?.context}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 font-bold truncate">
                                                                {item.time?.split('às')[1] || item.time}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className={`flex justify-between items-center ${viewMode === 'grid' ? 'mt-auto pt-3 border-t border-gray-50 dark:border-white/5' : 'mt-1'}`}>
                                                        {viewMode === 'grid' && (
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                                                                {item.time?.split('às')[1] || item.time}
                                                            </span>
                                                        )}
                                                        <div className="flex gap-2 ml-auto">
                                                            {viewMode === 'list' && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => triggerShare(e, item)}
                                                                    aria-label={`Compartilhar notícia: ${item.title}`}
                                                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40"
                                                                    title="Compartilhar"
                                                                    disabled={isSharing}
                                                                >
                                                                    {isSharing && sharingItem === item ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
                                                                </button>
                                                            )}
                                                            {safeHttpUrl(item.url) && (
                                                                <a 
                                                                    href={safeHttpUrl(item.url)} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className={`text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 hover:underline rounded-lg transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                                                                        viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5' : 'px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                                    }`}
                                                                >
                                                                    Ler Mais <ExternalLink size={10} aria-hidden="true" /><span className="sr-only"> sobre {item.title} (nova aba)</span>
                                                                </a>
                                                            )}
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
