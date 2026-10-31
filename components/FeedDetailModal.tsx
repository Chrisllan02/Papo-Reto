
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Clock, Scale, ArrowRight, ExternalLink, Share2, FileText, Users, GitCommit, Loader2, Mic2, Star, Target, Route } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import AudioPlayer from './AudioPlayer';
import Modal from './Modal';
import DataState from './DataState';
import { getFeedTypeMeta } from '../utils/feedType';
import { safeHttpUrl } from '../utils/url';
import { getDidacticContext, renderWithGlossary } from '../utils/legislativeTranslator';
import { fetchProposicaoDetails, fetchEventDetails } from '../services/camaraApi';
import { buildActivityAudioScript } from '../utils/audioNarration';
import { distinctSummary, feedCode, isRedundantText, resolveFeedTitle } from '../utils/feedText';

interface FeedDetailModalProps {
    item: FeedItem;
    politician?: Politician;
    onClose: () => void;
    onGoToProfile: (p: Politician) => void;
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({ item, politician, onClose, onGoToProfile }) => {
    const isVote = item.type === 'voto';
    const isProposition = item.type === 'proposicao';
    const hasTramitacao = isVote || isProposition;
    const isExpense = item.type === 'despesa';
    const isEvent = item.type === 'evento';
    const isLightBg = !hasTramitacao && !isExpense; 
    const typeMeta = getFeedTypeMeta(item.type);
    const sourceUrl = safeHttpUrl(item.sourceUrl);

    const [visible, setVisible] = useState(false);
    const [dragY, setDragY] = useState(0);
    const touchStartY = useRef<number | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Estado para detalhes profundos (fetch on demand)
    const [extraDetails, setExtraDetails] = useState<{
        authors: string[];
        fullTextUrl?: string;
        progress: number;
        label: string;
        closed?: boolean;
        guests?: string[];
        participants?: string[];
        requests?: string[];
        phases?: string[];
        organs?: string[];
        agendaDocumentUrl?: string;
        eventUrl?: string;
        detailedSummary?: string;
        justification?: string;
        keywords?: string[];
        statusDescription?: string;
        dispatch?: string;
        responsibleBody?: string;
        finalUrn?: string;
        relatedPropositions?: string[];
    } | null>(null);
    const [loadingExtras, setLoadingExtras] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [shareFeedback, setShareFeedback] = useState('');

    const didacticContent = useMemo(() => getDidacticContext(item.title, item.description, item.type), [item]);
    const glossaryContent = useMemo(() => renderWithGlossary(didacticContent.text), [didacticContent.text]);
    const audioScript = useMemo(() => buildActivityAudioScript(item, didacticContent.text, politician), [item, didacticContent.text, politician]);
    const resolvedTitle = resolveFeedTitle(item.title, item.description);
    const code = feedCode(item.title, item.description);
    const summary = distinctSummary(resolvedTitle, item.summary);
    const showDidactic = Boolean(didacticContent.text) && !isRedundantText(resolvedTitle, didacticContent.text) && !isRedundantText(summary, didacticContent.text);
    const originalText = distinctSummary(resolvedTitle, item.content || item.originalDescription || item.description);
    const agendaUrl = safeHttpUrl(extraDetails?.agendaDocumentUrl);
    const eventUrl = safeHttpUrl(extraDetails?.eventUrl);
    const fullTextUrl = safeHttpUrl(extraDetails?.fullTextUrl);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa o detalhe anterior antes de buscar o novo item na API
        setLoadError(false);
        setExtraDetails(null);

        const finish = (details: typeof extraDetails) => {
            if (cancelled) return;
            setExtraDetails(details);
            setLoadingExtras(false);
        };
        const fail = () => {
            if (cancelled) return;
            setLoadError(true);
            setLoadingExtras(false);
        };

        if (isEvent) {
            // Busca convidados para Eventos
            setLoadingExtras(true);
            fetchEventDetails(item.id)
                .then(data => finish({
                    guests: data.guests,
                    participants: data.participants,
                    requests: data.requests,
                    phases: data.phases,
                    organs: data.organs,
                    agendaDocumentUrl: data.agendaDocumentUrl,
                    eventUrl: data.eventUrl,
                    authors: [], 
                    progress: 0, 
                    label: '' 
                }))
                .catch(fail);
        } else if (hasTramitacao) {
            const idFromUrl = Number(/propostas-legislativas\/(\d+)/.exec(item.sourceUrl || '')?.[1]);
            const propId = item.propositionId ?? (idFromUrl || (isProposition ? item.id : undefined));

            if (propId) {
                setLoadingExtras(true);
                fetchProposicaoDetails(propId).then(finish).catch(fail);
            } else {
                setLoadingExtras(false);
            }
        } else {
            setLoadingExtras(false);
        }

        return () => {
            cancelled = true;
        };
    }, [item, isEvent, hasTramitacao, isProposition, retryKey]);

    useEffect(() => {
        if (!shareFeedback) return;
        const timer = setTimeout(() => setShareFeedback(''), 4000);
        return () => clearTimeout(timer);
    }, [shareFeedback]);

    const handleShare = async () => {
        if (!sourceUrl) return;
        const data = { title: item.title, text: item.summary || item.title, url: sourceUrl };
        try {
            if (typeof navigator.share === 'function') {
                await navigator.share(data);
                return;
            }
            await navigator.clipboard.writeText(`${item.title}\n${sourceUrl}`);
            setShareFeedback('Link copiado.');
        } catch (error) {
            if ((error as DOMException)?.name === 'AbortError') return;
            try {
                await navigator.clipboard.writeText(`${item.title}\n${sourceUrl}`);
                setShareFeedback('Link copiado.');
            } catch {
                setShareFeedback('Não foi possível compartilhar agora.');
            }
        }
    };

    // Gesture Handlers
    const isContentScrolled = (target: EventTarget) => {
        const scroller = scrollRef.current;
        return Boolean(scroller && scroller.contains(target as Node) && scroller.scrollTop > 0);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = isContentScrolled(e.target) ? null : e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current !== null && isContentScrolled(e.target)) {
            touchStartY.current = null;
            setDragY(0);
            return;
        }
        if (touchStartY.current !== null) {
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - touchStartY.current;
            if (deltaY > 0) { 
                setDragY(deltaY);
            }
        }
    };

    const handleTouchEnd = () => {
        if (dragY > 100) { 
            onClose();
        } else {
            setDragY(0); 
        }
        touchStartY.current = null;
    };

    const closeBtnClass = isLightBg 
        ? 'bg-white/60 hover:bg-white text-gray-900 border-white/40' 
        : 'bg-white/20 hover:bg-white/30 text-white border-white/20'; 

    return (
        <Modal
            onClose={onClose}
            labelledBy="modal-title"
            initialFocusRef={closeBtnRef}
            className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-midnight/60 dark:bg-black/80 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div
                className={`glass-panel w-full max-w-2xl rounded-t-3xl md:rounded-3xl relative overflow-hidden flex flex-col max-h-[95dvh] md:max-h-[85dvh] transition-transform duration-500 ease-out ${visible ? 'translate-y-0' : 'translate-y-full md:scale-95'}`}
                style={{ transform: visible ? `translateY(${dragY}px)` : undefined }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="md:hidden w-full h-6 absolute top-0 left-0 right-0 z-50 flex items-center justify-center cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded-full" aria-hidden="true"></div>
                </div>

                <div className={`h-24 md:h-32 shrink-0 relative flex items-start justify-end p-6 ${typeMeta.headerClass}`}>
                    <div className="absolute top-6 left-6 z-50 flex gap-2">
                        <AudioPlayer text={audioScript} isDarkText={isLightBg && !isEvent} />
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar detalhes"
                        className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors border focus-visible:ring-4 focus-visible:ring-blue-500/40 ${closeBtnClass}`}
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                    <div className="absolute -bottom-6 left-8 p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border-2 border-praxeti dark:border-midnight flex items-center justify-center">
                        <typeMeta.Icon size={28} className={typeMeta.iconClass} aria-hidden="true" />
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 pt-12 pb-safe">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${typeMeta.chipClass}`}>
                            {typeMeta.label}
                        </span>
                        {item.date && <span className="text-xs font-medium text-subtle flex items-center gap-1.5"><Clock size={14} aria-hidden="true" /> {item.date}</span>}
                    </div>

                    <h2 id="modal-title" className="text-2xl md:text-3xl font-black text-midnight dark:text-white leading-tight mb-4 break-words">{resolvedTitle}</h2>
                    {code && <p className="text-xs font-medium text-subtle -mt-2 mb-4">{code}</p>}

                    {(summary || item.whyItMatters || item.nextStep) && (
                        <div className="mb-8 grid gap-4">
                            {summary && (
                                <div className="bg-white/60 dark:bg-white/5 p-4 md:p-6 rounded-2xl border border-slate-200/70 dark:border-white/10">
                                    <p className="text-xs font-semibold text-subtle mb-2">Resumo cidadão</p>
                                    <p className="text-base font-bold leading-relaxed text-midnight dark:text-white">{summary}</p>
                                </div>
                            )}
                            {(item.whyItMatters || item.nextStep) && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {item.whyItMatters && (
                                        <div className="bg-blue-50/90 dark:bg-blue-900/15 p-4 md:p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
                                                <Target size={14} aria-hidden="true" />
                                                Por que importa
                                            </div>
                                            <p className="text-sm font-semibold leading-relaxed text-blue-950 dark:text-blue-100">{item.whyItMatters}</p>
                                        </div>
                                    )}
                                    {item.nextStep && (
                                        <div className="bg-slate-50/90 dark:bg-white/5 p-4 md:p-6 rounded-2xl border border-slate-200/70 dark:border-white/10">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-semibold mb-2">
                                                <Route size={14} aria-hidden="true" />
                                                Próximo passo
                                            </div>
                                            <p className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{item.nextStep}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {loadError && (
                        <div className="mb-8">
                            <DataState
                                variant="error"
                                title="Não foi possível carregar os detalhes"
                                description="A fonte oficial não respondeu agora. O restante da informação continua disponível."
                                actionLabel="Tentar de novo"
                                onAction={() => setRetryKey(key => key + 1)}
                            />
                        </div>
                    )}

                    {isEvent && (
                        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-purple-50 dark:bg-white/5 p-4 md:p-6 rounded-2xl border border-purple-100 dark:border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                                        <Mic2 size={14} aria-hidden="true" /> Mesa de convidados
                                    </h3>
                                    {loadingExtras && <Loader2 size={14} className="animate-spin text-purple-700 dark:text-purple-300" role="img" aria-label="Carregando" />}
                                </div>

                                {extraDetails?.guests && extraDetails.guests.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {extraDetails.guests.map((guest, idx) => {
                                            const isVIP = guest.toLowerCase().includes('ministro') || guest.toLowerCase().includes('secretário');
                                            return (
                                                <div key={`${guest}-${idx}`} className="flex items-start gap-3 p-2 rounded-xl bg-white/60 dark:bg-black/20">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isVIP ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {isVIP ? <Star size={14} fill="currentColor" aria-hidden="true" /> : <Users size={14} aria-hidden="true" />}
                                                    </div>
                                                    <p className={`text-sm font-semibold leading-snug self-center ${isVIP ? 'text-purple-900 dark:text-purple-200' : 'text-muted-strong'}`}>
                                                        {guest}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-subtle">
                                        {loadingExtras ? "Buscando lista de convidados..." : loadError ? "Lista de convidados indisponível no momento." : "Lista de convidados não disponível na pauta digital."}
                                    </p>
                                )}
                            </div>
                            {extraDetails && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {extraDetails.organs && extraDetails.organs.length > 0 && (
                                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="mb-2 text-xs font-semibold text-subtle">Órgãos responsáveis</p>
                                            <p className="text-sm font-semibold text-muted-strong">{extraDetails.organs.join(', ')}</p>
                                        </div>
                                    )}
                                    {extraDetails.participants && extraDetails.participants.length > 0 && (
                                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="mb-2 text-xs font-semibold text-subtle">Parlamentares participantes</p>
                                            <p className="text-sm font-semibold text-muted-strong">{extraDetails.participants.slice(0, 12).join(', ')}{extraDetails.participants.length > 12 ? ` e mais ${extraDetails.participants.length - 12}` : ''}</p>
                                        </div>
                                    )}
                                    {extraDetails.requests && extraDetails.requests.length > 0 && (
                                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="mb-2 text-xs font-semibold text-subtle">Requerimentos</p>
                                            <ul className="space-y-1 text-sm font-semibold text-muted-strong">{extraDetails.requests.slice(0, 8).map((value, index) => <li key={index}>• {value}</li>)}</ul>
                                        </div>
                                    )}
                                    {extraDetails.phases && extraDetails.phases.length > 0 && (
                                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                            <p className="mb-2 text-xs font-semibold text-subtle">Fases do evento</p>
                                            <ul className="space-y-1 text-sm font-semibold text-muted-strong">{extraDetails.phases.slice(0, 8).map((value, index) => <li key={index}>• {value}</li>)}</ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            {(agendaUrl || eventUrl) && (
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold">
                                    {agendaUrl && <a href={agendaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-11 rounded text-blue-700 dark:text-blue-300 underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40"><FileText size={14} aria-hidden="true" /> Pauta oficial<span className="sr-only"> (abre em nova aba)</span></a>}
                                    {eventUrl && <a href={eventUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-11 rounded text-blue-700 dark:text-blue-300 underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40"><ExternalLink size={14} aria-hidden="true" /> Registro oficial<span className="sr-only"> (abre em nova aba)</span></a>}
                                </div>
                            )}
                        </div>
                    )}

                    {hasTramitacao && (
                        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-slate-50 dark:bg-white/5 p-4 md:p-6 rounded-2xl border border-slate-200/70 dark:border-white/10">
                                <div className="flex justify-between items-center gap-4 mb-3">
                                    <h3 className="text-sm font-semibold text-muted-strong flex items-center gap-2">
                                        <GitCommit size={14} aria-hidden="true" /> Tramitômetro
                                    </h3>
                                    {loadingExtras && <Loader2 size={14} className="animate-spin text-blue-700 dark:text-blue-300" role="img" aria-label="Carregando" />}
                                    {!loadingExtras && extraDetails && extraDetails.label && (
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                            {extraDetails.label}
                                        </span>
                                    )}
                                </div>
                                {extraDetails?.closed ? (
                                    <p className="text-sm font-medium text-muted-strong">Tramitação encerrada sem virar lei.</p>
                                ) : !loadingExtras && !(extraDetails && extraDetails.progress > 0) ? (
                                    <p className="text-sm font-medium text-muted-strong">Etapa não disponível.</p>
                                ) : (
                                    <>
                                    <div
                                        role="progressbar"
                                        aria-label="Andamento da tramitação"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={extraDetails ? extraDetails.progress : 0}
                                        className="h-3 w-full bg-slate-200 dark:bg-white/15 rounded-full overflow-hidden relative"
                                    >
                                        <div
                                            className="h-full bg-nuit dark:bg-blue-400 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${extraDetails ? extraDetails.progress : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between mt-2 text-xs font-medium text-subtle">
                                        <span>Início</span>
                                        <span>Sanção</span>
                                    </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/70 dark:border-white/10">
                                    <h3 className="text-xs font-semibold text-subtle mb-2 flex items-center gap-1.5">
                                        <Users size={14} aria-hidden="true" /> Quem assina
                                    </h3>
                                    {loadingExtras ? (
                                        <div className="h-4 w-20 bg-slate-200 dark:bg-white/15 rounded animate-pulse"></div>
                                    ) : (
                                        <div className="text-sm font-semibold text-muted-strong leading-snug">
                                            {extraDetails && extraDetails.authors && extraDetails.authors.length > 0
                                                ? extraDetails.authors.slice(0, 3).join(', ') + (extraDetails.authors.length > 3 ? ` e +${extraDetails.authors.length - 3}` : '')
                                                : "Autoria não informada"}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 flex flex-col justify-center items-center text-center">
                                    {loadingExtras ? (
                                        <Loader2 size={20} className="animate-spin text-blue-700 dark:text-blue-300" role="img" aria-label="Carregando" />
                                    ) : fullTextUrl ? (
                                        <a href={fullTextUrl} target="_blank" rel="noopener noreferrer" className="w-full min-h-11 flex flex-col items-center justify-center gap-1 rounded text-blue-700 dark:text-blue-300 focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                            <FileText size={20} aria-hidden="true" />
                                            <span className="text-sm font-semibold underline-offset-2 hover:underline">Ler inteiro teor<span className="sr-only"> (abre em nova aba)</span></span>
                                        </a>
                                    ) : (
                                        <>
                                            <FileText size={20} className="text-subtle mb-1" aria-hidden="true" />
                                            <span className="text-sm font-medium text-subtle">PDF indisponível</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {item.approval !== undefined && (
                                <div className={`rounded-2xl border p-4 text-sm font-semibold ${Number(item.approval) === 1 ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'}`}>
                                    Resultado oficial: {Number(item.approval) === 1 ? 'aprovação registrada' : 'aprovação não registrada'}
                                </div>
                            )}
                            {extraDetails && (extraDetails.detailedSummary || extraDetails.justification || extraDetails.statusDescription || extraDetails.dispatch || extraDetails.keywords?.length || extraDetails.relatedPropositions?.length || extraDetails.finalUrn) && (
                                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 md:p-6 dark:border-white/10 dark:bg-white/5">
                                    <h3 className="mb-4 text-sm font-semibold text-muted-strong">Dados oficiais da proposição</h3>
                                    <div className="space-y-3 text-sm text-muted-strong">
                                        {extraDetails.statusDescription && <p><strong>Situação:</strong> {extraDetails.statusDescription}</p>}
                                        {extraDetails.responsibleBody && <p><strong>Órgão responsável:</strong> {extraDetails.responsibleBody}</p>}
                                        {extraDetails.detailedSummary && <p><strong>Ementa detalhada:</strong> {extraDetails.detailedSummary}</p>}
                                        {extraDetails.justification && <p><strong>Justificativa:</strong> {extraDetails.justification}</p>}
                                        {extraDetails.dispatch && <p><strong>Último despacho:</strong> {extraDetails.dispatch}</p>}
                                        {extraDetails.keywords && extraDetails.keywords.length > 0 && <p><strong>Palavras-chave:</strong> {extraDetails.keywords.join(', ')}</p>}
                                        {extraDetails.relatedPropositions && extraDetails.relatedPropositions.length > 0 && <p><strong>Proposições relacionadas:</strong> {extraDetails.relatedPropositions.join(', ')}</p>}
                                        {extraDetails.finalUrn && <p><strong>URN final:</strong> {extraDetails.finalUrn}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-8 space-y-4">
                        {showDidactic && (
                            <div className="bg-blue-50/90 dark:bg-blue-900/20 p-4 md:p-6 rounded-2xl border border-blue-100 dark:border-nuit/30 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-nuit dark:bg-blue-400"></div>
                                <div className="text-midnight dark:text-blue-100 text-base font-medium leading-relaxed">
                                    {glossaryContent}
                                </div>
                            </div>
                        )}

                        {didacticContent.constitution && (
                            <div className="bg-yellow-50/90 dark:bg-yellow-900/20 p-4 md:p-6 rounded-2xl border border-yellow-100 dark:border-spring/20 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-spring"></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Scale size={16} className="text-yellow-800 dark:text-spring" aria-hidden="true" />
                                    <span className="text-xs font-semibold text-yellow-800 dark:text-spring">Na Constituição ({didacticContent.constitution.art})</span>
                                </div>
                                <p className="text-midnight dark:text-yellow-100 text-sm md:text-base font-medium leading-relaxed italic">
                                    "{didacticContent.constitution.text}"
                                </p>
                            </div>
                        )}
                    </div>

                    {isExpense && item.amount && (
                        <div className="mb-8 p-4 md:p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold text-subtle mb-1">Valor</p>
                                <p className="text-2xl font-black text-midnight dark:text-white tracking-tight">{item.amount}</p>
                            </div>
                            {item.provider && (
                                <div className="text-right max-w-[50%]">
                                    <p className="text-xs font-semibold text-subtle mb-1">Fornecedor</p>
                                    <p className="text-sm font-semibold text-muted-strong line-clamp-2">{item.provider}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {originalText && (
                        <div className="text-muted-strong font-medium leading-relaxed mb-8 text-sm md:text-base">
                            <p className="mb-2 font-semibold text-xs text-subtle">Texto original</p>
                            <p>{originalText}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-4 mt-auto">
                        {politician && (
                            <button
                                onClick={() => { onClose(); onGoToProfile(politician); }}
                                aria-label={`Ver perfil completo de ${politician.name}`}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 hover:border-nuit bg-white/50 dark:bg-white/5 cursor-pointer transition-colors active:scale-[0.98] text-left group focus-visible:ring-4 focus-visible:ring-blue-500/40"
                            >
                                <img src={politician.photo} className="w-14 h-14 rounded-full object-cover border border-white dark:border-gray-600" alt="" loading="lazy" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-subtle mb-1">Responsável</p>
                                    <p className="text-base font-black text-midnight dark:text-white truncate">{politician.name}</p>
                                    <p className="text-xs font-medium text-subtle">{politician.party} - {politician.state}</p>
                                </div>
                                <div className="w-11 h-11 flex items-center justify-center bg-white/50 dark:bg-white/10 rounded-full text-subtle shrink-0 group-hover:text-nuit transition-colors">
                                    <ArrowRight size={20} aria-hidden="true" />
                                </div>
                            </button>
                        )}

                        <div className="flex gap-4">
                            {sourceUrl && (
                                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-11 py-3.5 rounded-2xl bg-midnight dark:bg-white text-white dark:text-black font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98] hover:bg-nuit focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                    Fonte oficial <ExternalLink size={16} aria-hidden="true" /><span className="sr-only">(abre em nova aba)</span>
                                </a>
                            )}
                            {sourceUrl && (
                                <button type="button" onClick={handleShare} aria-label="Compartilhar esta informação" className="min-w-11 min-h-11 px-6 py-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 text-muted-strong font-bold active:scale-[0.98] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                    <Share2 size={22} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                        <p role="status" className="text-center text-xs font-medium text-muted-strong min-h-[1rem]">{shareFeedback}</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default FeedDetailModal;
