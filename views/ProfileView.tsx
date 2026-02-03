
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, Clock, Building2, Banknote, Mic2, Loader2, Globe, Phone, Mail, Instagram, Twitter, Facebook, Youtube, ExternalLink, GraduationCap, Users, Info, MapPin, Wallet, Vote, PlayCircle, FolderOpen, Contact, CalendarDays, Linkedin, BarChart3, X, FileText, CheckCircle2, Search, Briefcase, FileSearch, Flag, PieChart, Tag, Plane, Volume2 } from 'lucide-react';
import { Politician, FeedItem, YearStats } from '../types';
import { Skeleton, SkeletonFeedItem, SkeletonStats } from '../components/Skeleton';
import { usePoliticianProfile } from '../hooks/useCamaraData';

export interface ProfileViewProps {
  candidate: Politician;
  onBack: () => void;
  onShare: () => void;
  feedItems: FeedItem[];
  onUpdate?: (pol: Politician) => void;
  allPoliticians?: Politician[];
  isFollowing?: boolean;
  onToggleFollow?: () => void;
}

const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('aprovado')) return 'bg-blue-100/50 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200'; 
    if (s.includes('tramitação')) return 'bg-yellow-100/50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100/50 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300';
};

const SocialIcon: React.FC<{ url: string }> = ({ url }) => {
    let Icon = Globe;
    let label = 'Site';
    let colorClass = 'text-gray-500 hover:text-blue-600';

    if (url.includes('instagram.com')) { Icon = Instagram; label = 'Instagram'; colorClass = 'text-pink-600 hover:text-pink-700'; }
    else if (url.includes('twitter.com') || url.includes('x.com')) { Icon = Twitter; label = 'Twitter'; colorClass = 'text-blue-400 hover:text-blue-500'; }
    else if (url.includes('facebook.com')) { Icon = Facebook; label = 'Facebook'; colorClass = 'text-blue-700 hover:text-blue-800'; }
    else if (url.includes('youtube.com')) { Icon = Youtube; label = 'YouTube'; colorClass = 'text-red-600 hover:text-red-700'; }
    else if (url.includes('linkedin.com')) { Icon = Linkedin; label = 'LinkedIn'; colorClass = 'text-blue-800 hover:text-blue-900'; }

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-xl bg-gray-100/50 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${colorClass}`} title={label}>
            <Icon size={20} className="stroke-[1.5]" />
        </a>
    );
};

const PresenceBar = ({ label, present, justified, unjustified, total }: { label: string, present: number, justified: number, unjustified: number, total: number }) => {
    if (total === 0) {
        return (
            <div className="w-full">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
                </div>
                <div className="w-full h-10 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-400">
                    <FolderOpen size={14} />
                    <span className="text-xs font-bold uppercase tracking-wide">Sem dados</span>
                </div>
            </div>
        );
    }
    const pctPresent = total > 0 ? (present / total) * 100 : 0;
    const pctJustified = total > 0 ? (justified / total) * 100 : 0;
    const pctUnjustified = total > 0 ? (unjustified / total) * 100 : 0;

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{Math.round(pctPresent)}% Presença</span>
            </div>
            <div className="w-full h-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-full overflow-hidden flex shadow-inner">
                <div style={{ width: `${pctPresent}%` }} className="bg-green-500 h-full shadow-[0_0_10px_rgba(34,197,94,0.4)]" title="Presenças"></div>
                <div style={{ width: `${pctJustified}%` }} className="bg-yellow-400 h-full" title="Ausências Justificadas"></div>
                <div style={{ width: `${pctUnjustified}%` }} className="bg-red-500 h-full" title="Ausências Não Justificadas"></div>
            </div>
            <div className="flex justify-between mt-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {present}</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> {justified} Justif.</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {unjustified} Falta</div>
            </div>
        </div>
    );
};

// --- HELPER DE CATEGORIZAÇÃO VISUAL ---
// Centraliza a lógica de cores para usar tanto no gráfico quanto nas tags
const getFrontCategoryStyle = (title: string) => {
    const t = title.toLowerCase();
    
    if (t.match(/agro|rural|campo/)) return { name: 'Agropecuária', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-900/50', stroke: '#22c55e' };
    if (t.match(/saúde|médic|hospit|doença/)) return { name: 'Saúde', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-900/50', stroke: '#ef4444' };
    if (t.match(/econo|comércio|indústria|serviços|tribut|invest/)) return { name: 'Economia', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900/50', stroke: '#3b82f6' };
    if (t.match(/educ|ensino|escola|profess/)) return { name: 'Educação', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-900/50', stroke: '#eab308' };
    if (t.match(/seguran|polícia|armas|violência/)) return { name: 'Segurança', bg: 'bg-gray-200 dark:bg-gray-700/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', stroke: '#4b5563' };
    if (t.match(/ambien|verde|clima|sustent|florest/)) return { name: 'Meio Ambiente', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-900/50', stroke: '#10b981' };
    if (t.match(/mulher|idoso|criança|humanos|minoria|racial/)) return { name: 'Direitos Humanos', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-900/50', stroke: '#a855f7' };
    if (t.match(/digit|tecno|inov|internet|cyber/)) return { name: 'Tecnologia', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-900/50', stroke: '#6366f1' };
    if (t.match(/transp|logíst|energia|obras|urbano/)) return { name: 'Infraestrutura', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-900/50', stroke: '#f97316' };
    
    return { name: 'Outros', bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', stroke: '#94a3b8' };
};

// --- NEW EXPOSED SECTIONS (REPLACING MODALS) ---

const BioCard = ({ candidate, isLoading }: { candidate: Politician, isLoading: boolean }) => (
    <div className="bg-white/60 dark:bg-midnight/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/40 dark:border-white/10 shadow-sm h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                <Contact size={20} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none">Ficha Parlamentar</h3>
        </div>

        <div className="space-y-6 flex-1 relative">
            {isLoading && !candidate.email && (
                <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
            )}

            {/* Contatos */}
            <div>
                <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Canais Oficiais</p>
                <div className="space-y-3">
                    {isLoading && !candidate.email ? <Skeleton className="h-10 w-full"/> : (
                        candidate.email && (
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1"><Mail size={12} className="text-blue-500"/> E-mail</div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{candidate.email}</p>
                            </div>
                        )
                    )}
                    {isLoading && !candidate.cabinet?.phone ? <Skeleton className="h-10 w-3/4"/> : (
                        candidate.cabinet?.phone && (
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1"><Phone size={12} className="text-blue-500"/> Telefone</div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{candidate.cabinet.phone}</p>
                            </div>
                        )
                    )}

                    {/* Endereço Físico do Gabinete */}
                    {!isLoading && candidate.cabinet && (candidate.cabinet.room || candidate.cabinet.building) && (
                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                                <Building2 size={12} className="text-blue-500"/> Endereço do Gabinete
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                    {candidate.cabinet.building || 'Câmara dos Deputados'}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {candidate.cabinet.room ? `Sala ${candidate.cabinet.room}` : ''}
                                    {candidate.cabinet.room && candidate.cabinet.floor ? ' • ' : ''}
                                    {candidate.cabinet.floor ? `${candidate.cabinet.floor}º Andar` : ''}
                                </p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-1">
                                    <MapPin size={10} /> Brasília, DF
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Redes */}
            {candidate.socials && candidate.socials.length > 0 && (
                <div>
                    <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Redes Sociais</p>
                    <div className="flex flex-wrap gap-2">
                        {candidate.socials.map((url, i) => <SocialIcon key={i} url={url} />)}
                    </div>
                </div>
            )}

            {/* Bio Info */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><GraduationCap size={10} /> Escolaridade</p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{candidate.education || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><MapPin size={10} /> Naturalidade</p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{candidate.birthCity || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const StatsCard = ({ displayStats, selectedYear, setSelectedYear, availableYears, commissionGroups, isLoading, mandateInfo, loadingStatus }: any) => {
    // Determine which years to show.
    const sortedYears = [...availableYears].sort((a: any, b: any) => a - b);
    const currentYear = new Date().getFullYear();

    return (
        <div className="bg-white/60 dark:bg-midnight/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/40 dark:border-white/10 shadow-sm h-full flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                    <BarChart3 size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none">Desempenho</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-1">Evolução do Mandato</p>
                </div>
            </div>

            {isLoading && !displayStats.plenary ? (
                <div className="space-y-4 relative min-h-[300px] flex flex-col justify-center items-center">
                    {/* Background Skeletons for texture */}
                    <div className="absolute inset-0 space-y-4 opacity-30 pointer-events-none">
                        <Skeleton className="h-16 w-full rounded-2xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                    
                    {/* Active Loading Feedback */}
                    <div className="z-10 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300 bg-white/80 dark:bg-black/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 dark:border-white/10 shadow-xl">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Search size={16} className="text-blue-500" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide animate-pulse">
                                {loadingStatus || "Carregando..."}
                            </p>
                            <p className="text-xs font-bold text-gray-400 mt-1">Consultando bases da Câmara</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 flex-1 animate-in fade-in duration-500">
                    
                    {/* MANDATE TIMELINE FILTER */}
                    <div className="bg-white/50 dark:bg-black/20 p-5 rounded-3xl border border-white/40 dark:border-white/5 shadow-inner">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <Clock size={12} /> Linha do Tempo
                            </span>
                            <button 
                                onClick={() => setSelectedYear('total')}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-all ${selectedYear === 'total' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20'}`}
                            >
                                Mandato Completo
                            </button>
                        </div>
                        
                        {/* Interactive Timeline Track */}
                        <div className="relative h-14 flex items-center justify-between px-2 mx-1">
                            {/* Base Track */}
                            <div className="absolute left-0 right-0 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full top-1/2 -translate-y-1/2 z-0"></div>
                            
                            {/* Active Progress Track */}
                            <div 
                                className="absolute left-0 h-1.5 bg-blue-500 rounded-full top-1/2 -translate-y-1/2 z-0 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                style={{ width: `${Math.max(0, Math.min(100, mandateInfo.percentage))}%` }}
                            ></div>

                            {/* Year Nodes */}
                            {sortedYears.map((year: number) => {
                                const isActive = selectedYear === year;
                                const isCurrent = year === currentYear;
                                const isPast = year <= currentYear;
                                
                                return (
                                    <button
                                        key={year}
                                        onClick={() => setSelectedYear(year)}
                                        className={`group relative flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-300 z-10 active:scale-90 ${
                                            isActive 
                                            ? 'bg-blue-600 text-white shadow-xl scale-110 ring-4 ring-blue-100 dark:ring-blue-900/30' 
                                            : isPast 
                                                ? 'bg-white dark:bg-gray-800 text-blue-600 border-2 border-blue-500 hover:border-blue-400'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-2 border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        <span className={`text-xs font-black ${isActive ? 'text-white' : ''}`}>{year}</span>
                                        {isCurrent && !isActive && <span className="absolute -bottom-6 text-[9px] font-black uppercase text-blue-500 tracking-wider bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">Atual</span>}
                                        {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                            <span>Início: {mandateInfo.startStr}</span>
                            <span>Fim: {mandateInfo.endStr}</span>
                        </div>
                    </div>

                    <PresenceBar 
                        label={`Presença em Plenário (${selectedYear === 'total' ? 'Total' : selectedYear})`}
                        present={displayStats.plenary?.present || 0} 
                        justified={displayStats.plenary?.justified || 0} 
                        unjustified={displayStats.plenary?.unjustified || 0} 
                        total={displayStats.plenary?.total || 0}
                    />

                    <PresenceBar 
                        label={`Presença em Comissões (${selectedYear === 'total' ? 'Total' : selectedYear})`}
                        present={displayStats.commissions?.present || 0} 
                        justified={displayStats.commissions?.justified || 0} 
                        unjustified={displayStats.commissions?.unjustified || 0} 
                        total={displayStats.commissions?.total || 0}
                    />

                    <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between group hover:border-blue-200 transition-colors">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide group-hover:text-blue-500 transition-colors">Gastos de Gabinete ({selectedYear === 'total' ? 'Total' : selectedYear})</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                                    R$ {displayStats.spending?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-600 rounded-xl">
                                <Banknote size={24} />
                            </div>
                        </div>
                        
                        {commissionGroups.titular.length > 0 && (
                            <div className="mt-4 flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                                <span>Titular em Comissões</span>
                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">{commissionGroups.titular.length} Colegiados</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ActivityCard: React.FC<{ item: any }> = ({ item }) => {
    const [expanded, setExpanded] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const type = item._type;
    
    if (type === 'bill') {
        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-4 group hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 cursor-default animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-start">
                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full backdrop-blur-md ${getStatusColor(item.status)}`}>{item.status}</span>
                    <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Proposta de Lei</span>
                    <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-2 text-lg">{item.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">{item.description}</p>
                </div>
                {item.externalLink && (
                    <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="mt-auto text-xs font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5 hover:underline p-2 -ml-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/20 w-fit transition-colors">
                        Ver Íntegra <ExternalLink size={12} />
                    </a>
                )}
            </article>
        );
    }

    if (type === 'vote') {
        const isSim = item.vote.toLowerCase().includes('sim');
        const isNao = item.vote.toLowerCase().includes('não') || item.vote.toLowerCase().includes('nao');
        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-6 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-md ${isSim ? 'bg-green-100/50 text-green-600' : isNao ? 'bg-red-100/50 text-red-600' : 'bg-gray-100/50 text-gray-600'}`}>
                    <Vote size={28} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Votação Nominal</span>
                        <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <h4 className="font-bold text-base text-gray-900 dark:text-white leading-tight mb-2">{item.description}</h4>
                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-md inline-block backdrop-blur-md ${isSim ? 'bg-green-100/50 text-green-700' : isNao ? 'bg-red-100/50 text-red-700' : 'bg-gray-100/50 text-gray-700'}`}>
                        Votou: {item.vote}
                    </span>
                </div>
            </article>
        );
    }

    if (type === 'report') {
        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-3 relative overflow-hidden hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-3xl pointer-events-none"></div>
                <div className="flex justify-between items-start relative z-10">
                    <span className="bg-purple-100/50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-black uppercase px-3 py-1 rounded-full backdrop-blur-md">Relatoria</span>
                    <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1 text-lg">{item.billTitle}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Comissão: {item.commission}</p>
                </div>
            </article>
        );
    }

    if (type === 'speech') {
        const isAudioAvailable = item.externalLink && (item.externalLink.toLowerCase().endsWith('.mp3') || item.externalLink.toLowerCase().includes('/audio/'));

        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] group hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-red-100/50 dark:bg-red-900/20 text-red-600 rounded-full backdrop-blur-md">
                        <Mic2 size={18} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Discurso em Plenário</span>
                        <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
                
                {/* Full Transcript or Summary */}
                <div className="relative">
                    <p className={`text-sm md:text-base text-gray-700 dark:text-gray-300 italic mb-6 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
                        "{item.transcription || item.summary}"
                    </p>
                    {item.transcription && !expanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-black/80 to-transparent pointer-events-none"></div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {/* Audio Player Container */}
                    {showPlayer && isAudioAvailable && (
                        <div className="w-full bg-gray-100 dark:bg-black/20 rounded-xl p-2 mb-1 animate-in fade-in slide-in-from-top-1">
                            <audio controls autoPlay className="w-full h-8 outline-none" src={item.externalLink}>
                                Seu navegador não suporta áudio.
                            </audio>
                        </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                        {item.transcription && (
                            <button 
                                onClick={() => setExpanded(!expanded)} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl text-xs font-black uppercase text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors backdrop-blur-md"
                            >
                                <FileSearch size={14} className="pl-0.5" /> {expanded ? "Recolher" : "Ler Íntegra"}
                            </button>
                        )}
                        
                        {item.externalLink && (
                            isAudioAvailable ? (
                                <button 
                                    onClick={() => setShowPlayer(!showPlayer)} 
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-colors backdrop-blur-md ${showPlayer ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-50/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 group-hover:bg-red-50/50 dark:group-hover:bg-red-900/20 group-hover:text-red-600'}`}
                                >
                                    {showPlayer ? <X size={14} className="pl-0.5" /> : <PlayCircle size={14} className="pl-0.5" />}
                                    {showPlayer ? "Fechar Áudio" : "Ouvir Discurso"}
                                </button>
                            ) : (
                                <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50/50 dark:bg-white/5 rounded-xl text-xs font-black uppercase text-gray-600 dark:text-gray-300 group-hover:bg-red-50/50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 transition-colors backdrop-blur-md">
                                    <ExternalLink size={14} className="pl-0.5" /> Ver Fonte
                                </a>
                            )
                        )}
                    </div>
                </div>
            </article>
        );
    }

    return null;
};

const ProfileView: React.FC<ProfileViewProps> = ({ candidate: initialCandidate, onBack, onShare, onUpdate, isFollowing }) => {
  const [profileTab, setProfileTab] = useState<'activities' | 'projects' | 'money' | 'cabinet' | 'agenda' | 'career'>('activities');
  const [activityFilter, setActivityFilter] = useState<'all' | 'propositions' | 'reported' | 'votes' | 'speeches'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'total'>(2025);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // --- SWIPE TO BACK LOGIC ---
  const touchStartRef = useRef<number | null>(null);
  const [translateX, setTranslateX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
      // Inicia apenas se o toque for na borda esquerda (20% da tela)
      if (e.touches[0].clientX < window.innerWidth * 0.2) {
          touchStartRef.current = e.touches[0].clientX;
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStartRef.current !== null) {
          const delta = e.touches[0].clientX - touchStartRef.current;
          // Permite apenas arrastar para a direita (voltar)
          if (delta > 0) {
              setTranslateX(delta);
          }
      }
  };

  const handleTouchEnd = () => {
      if (touchStartRef.current !== null) {
          const threshold = window.innerWidth * 0.3; // 30% da tela para disparar
          if (translateX > threshold) {
              onBack();
          }
          setTranslateX(0);
          touchStartRef.current = null;
      }
  };

  const { candidate: enrichedCandidate, isLoadingDetails, loadingStatus } = usePoliticianProfile(initialCandidate);
  const candidate = enrichedCandidate || initialCandidate;

  // --- CATEGORIZAÇÃO DE FRENTES PARLAMENTARES (DNA DE INTERESSES) ---
  const frontCategories = useMemo(() => {
      if (!candidate.fronts || candidate.fronts.length === 0) return [];
      
      const categoryMap: Record<string, { count: number, color: string, bg: string, text: string, strokeColor: string, border: string }> = {
          'Agropecuária': { count: 0, color: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', strokeColor: '#22c55e', border: 'border-green-200 dark:border-green-900/50' },
          'Saúde': { count: 0, color: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', strokeColor: '#ef4444', border: 'border-red-200 dark:border-red-900/50' },
          'Economia': { count: 0, color: 'bg-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', strokeColor: '#3b82f6', border: 'border-blue-200 dark:border-blue-900/50' },
          'Educação': { count: 0, color: 'bg-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', strokeColor: '#eab308', border: 'border-yellow-200 dark:border-yellow-900/50' },
          'Segurança': { count: 0, color: 'bg-gray-600', bg: 'bg-gray-200 dark:bg-gray-700/30', text: 'text-gray-700 dark:text-gray-300', strokeColor: '#4b5563', border: 'border-gray-300 dark:border-gray-600' },
          'Meio Ambiente': { count: 0, color: 'bg-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', strokeColor: '#10b981', border: 'border-emerald-200 dark:border-emerald-900/50' },
          'Direitos Humanos': { count: 0, color: 'bg-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', strokeColor: '#a855f7', border: 'border-purple-200 dark:border-purple-900/50' },
          'Tecnologia': { count: 0, color: 'bg-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', strokeColor: '#6366f1', border: 'border-indigo-200 dark:border-indigo-900/50' },
          'Infraestrutura': { count: 0, color: 'bg-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', strokeColor: '#f97316', border: 'border-orange-200 dark:border-orange-900/50' },
          'Outros': { count: 0, color: 'bg-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', strokeColor: '#94a3b8', border: 'border-slate-200 dark:border-slate-700' }
      };

      candidate.fronts.forEach(f => {
          const style = getFrontCategoryStyle(f.title);
          if (categoryMap[style.name]) {
              categoryMap[style.name].count++;
          }
      });

      const total = candidate.fronts.length || 1;
      
      return Object.entries(categoryMap)
          .filter(([, data]) => data.count > 0)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([name, data]) => ({
              name,
              count: data.count,
              percent: (data.count / total) * 100, // Use precise percent for drawing
              ...data
          }));
  }, [candidate.fronts]);

  useEffect(() => {
      if (enrichedCandidate && enrichedCandidate !== initialCandidate && onUpdate) {
          onUpdate(enrichedCandidate);
      }
  }, [enrichedCandidate, initialCandidate, onUpdate]);

  useEffect(() => {
      const parseDate = (s: string) => {
          if (!s) return new Date();
          if (s.includes('/')) return new Date(s.split('/').reverse().join('-') + 'T23:59:59');
          return new Date(s);
      };
      
      const endDate = parseDate(candidate.mandate.end);

      const updateTimer = () => {
          const now = new Date();
          const difference = endDate.getTime() - now.getTime();

          if (difference > 0) {
              setTimeLeft({
                  days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                  hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                  minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                  seconds: Math.floor((difference % (1000 * 60)) / 1000)
              });
          } else {
              setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          }
      };

      const timerId = setInterval(updateTimer, 1000);
      updateTimer();

      return () => clearInterval(timerId);
  }, [candidate.mandate.end]);

  const displayStats = useMemo(() => {
      if (selectedYear === 'total' || !candidate.yearlyStats || !candidate.yearlyStats[selectedYear]) {
          return candidate.stats;
      }
      const yearData = candidate.yearlyStats[selectedYear];
      return {
          ...candidate.stats,
          attendancePct: yearData.attendancePct,
          totalSessions: yearData.totalSessions,
          presentSessions: yearData.presentSessions,
          absentSessions: yearData.absentSessions,
          spending: yearData.spending,
          projects: yearData.projects,
          plenary: yearData.plenary || { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
          commissions: yearData.commissions || { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 }
      };
  }, [candidate, selectedYear]);

  const availableYears = useMemo(() => {
      if (!candidate.yearlyStats) return [];
      return Object.keys(candidate.yearlyStats).map(y => parseInt(y)).sort((a,b) => b - a);
  }, [candidate.yearlyStats]);

  const combinedActivities = useMemo(() => {
      let activities: any[] = [];
      if (candidate.bills) activities = [...activities, ...candidate.bills.map(b => ({ ...b, _type: 'bill' }))];
      if (candidate.votingHistory) activities = [...activities, ...candidate.votingHistory.map(v => ({ ...v, _type: 'vote' }))];
      if (candidate.reportedBills) activities = [...activities, ...candidate.reportedBills.map(r => ({ ...r, _type: 'report' }))];
      if (candidate.speeches) activities = [...activities, ...candidate.speeches.map(s => ({ ...s, _type: 'speech' }))];

      if (activityFilter !== 'all') {
          if (activityFilter === 'propositions') activities = activities.filter(a => a._type === 'bill');
          if (activityFilter === 'votes') activities = activities.filter(a => a._type === 'vote');
          if (activityFilter === 'reported') activities = activities.filter(a => a._type === 'report');
          if (activityFilter === 'speeches') activities = activities.filter(a => a._type === 'speech');
      }
      return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [candidate, activityFilter]);

  const commissionGroups = useMemo(() => {
      const titular: string[] = [];
      if (candidate.roles) {
          candidate.roles.forEach(role => {
              if (role.type === 'Permanente' || role.type === 'Comissão') {
                  if (role.title.includes('Titular')) titular.push(role.name);
              }
          });
      }
      return { titular };
  }, [candidate.roles]);

  const mandateInfo = useMemo(() => {
      const parseDate = (s: string) => {
          if (!s) return new Date();
          if (s.includes('/')) return new Date(s.split('/').reverse().join('-'));
          return new Date(s);
      };
      
      const start = parseDate(candidate.mandate.start);
      const end = parseDate(candidate.mandate.end);
      const now = new Date();
      
      const totalTime = end.getTime() - start.getTime();
      const elapsedTime = now.getTime() - start.getTime();
      
      const totalDays = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24)));
      const daysPassed = Math.max(0, Math.ceil(elapsedTime / (1000 * 60 * 60 * 24)));
      
      const percentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
      const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      return { percentage, startStr: formatDate(start), endStr: formatDate(end) };
  }, [candidate.mandate]);

  // Donut Chart logic - Increased Size
  const DnaDonutChart = () => {
        const size = 220; // Increased size
        const strokeWidth = 35; // Increased stroke
        const center = size / 2;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        
        let accumulatedPercent = 0;

        return (
            <div className="relative w-56 h-56 flex items-center justify-center shrink-0">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                    {/* Background Circle */}
                    <circle 
                        cx={center} 
                        cy={center} 
                        r={radius} 
                        strokeWidth={strokeWidth} 
                        fill="none" 
                        className="text-gray-100 dark:text-gray-800" 
                        stroke="currentColor" 
                    />
                    
                    {/* Segments */}
                    {frontCategories.slice(0, 6).map((cat, i) => {
                        const strokeDasharray = `${(cat.percent / 100) * circumference} ${circumference}`;
                        const rotation = (accumulatedPercent / 100) * 360;
                        const offset = 0; 
                        
                        accumulatedPercent += cat.percent;

                        return (
                            <circle
                                key={cat.name}
                                cx={center}
                                cy={center}
                                r={radius}
                                strokeWidth={strokeWidth}
                                fill="none"
                                stroke={cat.strokeColor}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={offset}
                                strokeLinecap="round" 
                                transform={`rotate(${rotation} ${center} ${center})`}
                                className="transition-all duration-1000 ease-out drop-shadow-sm"
                            />
                        );
                    })}
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {candidate.fronts?.length || 0}
                    </span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frentes</span>
                </div>
            </div>
        );
  };

  return (
    <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto bg-transparent pb-32 scroll-smooth will-change-transform"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
            transform: `translateX(${translateX}px)`,
            transition: translateX === 0 ? 'transform 0.3s ease-out' : 'none' 
        }}
    >
      {/* FEEDBACK DE CARREGAMENTO GLOBAL (TOAST) - Mantido como backup */}
      {isLoadingDetails && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/80 dark:bg-white/90 text-white dark:text-black px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border border-white/10 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-500">
              <Loader2 size={18} className="animate-spin shrink-0"/>
              <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">{loadingStatus}</span>
          </div>
      )}

      {/* WRAPPER FOR COVER TO ALIGN WITH CONTENT */}
      <div className="px-4 md:px-12 max-w-[1800px] mx-auto pt-6 px-safe">
          <div className="relative w-full overflow-hidden rounded-[2.5rem] md:rounded-[4rem] shadow-2xl bg-gray-900 min-h-[240px] md:min-h-[280px] flex items-end group/header">
              {/* Background Layers */}
              <div className="absolute inset-0 bg-green-900"></div>
              <div className="absolute inset-0 opacity-50 mix-blend-overlay">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg" alt="Bandeira do Brasil" className="w-full h-full object-cover scale-110 brightness-75"/>
              </div>
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent z-20"></div>
              
              <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pt-safe">
                <button onClick={onBack} aria-label="Voltar para a lista" className="p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md active:scale-90 border border-white/10 shadow-lg">
                    <ChevronLeft size={24} aria-hidden="true" />
                </button>
              </div>
              
              <div className="relative z-30 w-full max-w-7xl mx-auto pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 pt-24 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="shrink-0 relative">
                      <div className="w-20 h-20 md:w-44 md:h-44 rounded-full shadow-2xl overflow-hidden bg-gray-800 border-[4px] border-white/10">
                          <img src={candidate.photo} className="w-full h-full object-cover" alt={`Foto de ${candidate.name}`} />
                      </div>
                  </div>
                  <div className="flex-1 text-center md:text-left text-white mb-2 min-w-0">
                      <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:gap-2 mb-2 md:mb-3">
                          <span className="bg-white/10 backdrop-blur-md px-3 py-0.5 md:px-4 md:py-1 rounded-full text-white text-xs font-black uppercase border border-white/10 tracking-widest shadow-sm">{candidate.party}</span>
                          <span className="bg-white/10 backdrop-blur-md px-3 py-0.5 md:px-4 md:py-1 rounded-full text-white text-xs font-black uppercase border border-white/10 tracking-widest shadow-sm">{candidate.state}</span>
                      </div>
                      <h1 className="text-2xl md:text-6xl font-black tracking-tighter leading-none drop-shadow-xl truncate">{candidate.name}</h1>
                      <p className="text-white/80 text-xs md:text-sm font-bold uppercase tracking-widest mt-1.5 flex items-center justify-center md:justify-start gap-2">
                        {candidate.role} <span className="w-1 h-1 bg-white/60 rounded-full"></span> Em Exercício
                      </p>
                  </div>
                  
                  {/* Mandate Timer Card (Desktop Only) - Mantido para efeito visual */}
                  <div className="hidden lg:block absolute right-12 bottom-12 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl min-w-[340px] group/mandate hover:bg-black/50 transition-colors">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5">
                            <Clock size={12} className="text-orange-500" /> Contagem Regressiva
                        </p>
                        <span className="text-xs font-black text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                            {mandateInfo.percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2 mb-4 text-center">
                          {[{ label: 'DIAS', value: timeLeft.days }, { label: 'HRS', value: timeLeft.hours }, { label: 'MIN', value: timeLeft.minutes }, { label: 'SEG', value: timeLeft.seconds }].map((time, i) => (
                              <div key={i} className="flex-1 bg-white/10 rounded-xl p-2 border border-white/5 backdrop-blur-sm shadow-inner group/timer hover:bg-white/15 transition-colors">
                                  <span className="block text-xl md:text-2xl font-black text-white tabular-nums tracking-tighter leading-none group-hover/timer:scale-110 transition-transform">
                                      {String(time.value).padStart(2, '0')}
                                  </span>
                                  <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider">{time.label}</span>
                              </div>
                          ))}
                      </div>
                      <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${mandateInfo.percentage}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase tracking-widest">
                          <span>Início: {mandateInfo.startStr}</span>
                          <span>Fim: {mandateInfo.endStr}</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="px-4 md:px-12 max-w-[1800px] mx-auto mt-6 relative z-20 space-y-6 px-safe">
          
          {/* MANDATE TIMER (MOBILE ONLY) */}
          <div className="lg:hidden mb-6 bg-white/60 dark:bg-midnight/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/40 dark:border-white/10 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Clock size={12} className="text-orange-500" /> Contagem Regressiva
                    </p>
                    <span className="text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-500/20">
                        {mandateInfo.percentage}%
                    </span>
                </div>
                <div className="flex justify-between items-center gap-2 mb-4 text-center">
                    {[{ label: 'DIAS', value: timeLeft.days }, { label: 'HRS', value: timeLeft.hours }, { label: 'MIN', value: timeLeft.minutes }, { label: 'SEG', value: timeLeft.seconds }].map((time, i) => (
                        <div key={i} className="flex-1 bg-white/50 dark:bg-white/5 rounded-xl p-2 border border-gray-100 dark:border-white/5 backdrop-blur-sm shadow-inner">
                            <span className="block text-xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter leading-none">
                                {String(time.value).padStart(2, '0')}
                            </span>
                            <span className="text-[7px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider">{time.label}</span>
                        </div>
                    ))}
                </div>
                <div className="relative w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${mandateInfo.percentage}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">
                    <span>Início: {mandateInfo.startStr}</span>
                    <span>Fim: {mandateInfo.endStr}</span>
                </div>
          </div>

          {/* EXPOSED SECTIONS (BIO & STATS) - Previously Hidden Modals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <BioCard candidate={candidate} isLoading={isLoadingDetails} />
              
              <StatsCard 
                  displayStats={displayStats} 
                  selectedYear={selectedYear} 
                  setSelectedYear={setSelectedYear} 
                  availableYears={availableYears} 
                  commissionGroups={commissionGroups}
                  isLoading={isLoadingDetails}
                  mandateInfo={mandateInfo}
                  loadingStatus={loadingStatus}
              />
          </div>

          <div className="min-w-0">
              {/* Tab Selector */}
              <div className="sticky top-0 z-40 bg-white/70 dark:bg-midnight/90 backdrop-blur-3xl p-1.5 rounded-2xl md:rounded-full border border-white/50 dark:border-white/10 shadow-xl overflow-x-auto scrollbar-hide flex gap-1 mb-8 px-safe" role="tablist" aria-label="Detalhes do mandato">
                 {(['activities', 'money', 'cabinet', 'agenda', 'career'] as const).map(tab => (
                     <button key={tab} id={`tab-${tab}`} role="tab" aria-selected={profileTab === tab} aria-controls={`panel-${tab}`} onClick={() => setProfileTab(tab)} className={`px-6 md:px-10 py-3 md:py-3.5 rounded-xl md:rounded-full text-xs md:text-sm font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex-1 ${profileTab === tab ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'text-blue-500 hover:bg-gray-100/50 dark:hover:bg-white/10'}`}>
                        {tab === 'money' ? 'Custos Detalhados' : tab === 'cabinet' ? 'Equipe' : tab === 'activities' ? 'Atuação & Votos' : tab === 'agenda' ? 'Agenda' : tab === 'career' ? 'Trajetória' : 'Leis'}
                     </button>
                 ))}
              </div>
              
              <div className="space-y-6 md:space-y-10 pb-32">
                  <div id={`panel-${profileTab}`} role="tabpanel" aria-labelledby={`tab-${profileTab}`} tabIndex={0} className="outline-none">
                    {profileTab === 'activities' && (
                        <div>
                            <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                                {['all', 'propositions', 'reported', 'votes', 'speeches'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => setActivityFilter(f as any)} 
                                        className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${activityFilter === f ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white/50 dark:bg-midnight/50 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-midnight'}`}
                                    >
                                        {f === 'all' ? 'Tudo' : f === 'propositions' ? 'Propostas' : f === 'reported' ? 'Relatorias' : f === 'votes' ? 'Votações' : 'Discursos'}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-4">
                                {isLoadingDetails && combinedActivities.length === 0 ? (
                                    <>
                                        <SkeletonFeedItem />
                                        <SkeletonFeedItem />
                                        <SkeletonFeedItem />
                                    </>
                                ) : (
                                    combinedActivities.length > 0 ? combinedActivities.map((item, i) => (
                                        <ActivityCard key={`${item._type}-${i}`} item={item} />
                                    )) : (
                                        <div className="text-center py-24 text-gray-400 text-sm font-bold uppercase tracking-[0.3em] opacity-50">Nenhuma atividade encontrada neste filtro</div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                    {profileTab === 'career' && (
                        <div className="space-y-6">
                            <div className="bg-white/70 dark:bg-midnight/90 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-10 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in fade-in">
                                <h3 className="font-black text-blue-900 dark:text-white text-lg mb-8 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
                                    <Briefcase size={20} className="text-blue-500"/> Histórico Profissional
                                </h3>
                                
                                {isLoadingDetails && (!candidate.occupations || candidate.occupations.length === 0) ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                    </div>
                                ) : (
                                    candidate.occupations && candidate.occupations.length > 0 ? (
                                        <div className="space-y-4 relative">
                                            {/* Linha vertical conectando */}
                                            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                            
                                            {candidate.occupations.sort((a,b) => (b.startYear || 0) - (a.startYear || 0)).map((job, i) => (
                                                <div key={i} className="flex gap-4 relative z-10 group">
                                                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 shadow-sm group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                                                        <Briefcase size={18} className="text-gray-400 group-hover:text-blue-500"/>
                                                    </div>
                                                    <div className="flex-1 bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-colors">
                                                        <h4 className="font-black text-gray-900 dark:text-white text-sm">{job.title}</h4>
                                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">{job.entity} {job.state ? `- ${job.state}` : ''}</p>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-[10px] font-bold bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                                                                {job.startYear} {job.endYear ? `- ${job.endYear}` : '- Atual'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest opacity-50">
                                            Informações de carreira não disponíveis na base oficial.
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Frentes Parlamentares */}
                            <div className="bg-white/70 dark:bg-midnight/90 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-10 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in fade-in">
                                <h3 className="font-black text-blue-900 dark:text-white text-lg mb-8 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
                                    <Flag size={20} className="text-blue-500"/> Frentes Parlamentares
                                </h3>
                                {isLoadingDetails ? (
                                    <Skeleton className="h-20 w-full rounded-2xl" />
                                ) : (candidate.fronts && candidate.fronts.length > 0 ? (
                                    <div className="flex flex-col lg:flex-row gap-10 items-start">
                                        
                                        {/* Chart & Cards Section */}
                                        <div className="bg-gray-50/50 dark:bg-black/20 p-6 md:p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8 shrink-0 w-full lg:w-auto">
                                            
                                            {/* Donut Chart Visual */}
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                                                        <PieChart size={18} />
                                                    </div>
                                                    <h4 className="text-sm font-black uppercase text-gray-700 dark:text-gray-200 tracking-wide">DNA de Interesses</h4>
                                                </div>
                                                <DnaDonutChart />
                                            </div>

                                            {/* Summary Cards Grid */}
                                            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                                                {frontCategories.slice(0, 4).map((cat) => (
                                                    <div key={cat.name} className={`p-4 rounded-2xl border ${cat.bg} ${cat.border} flex flex-col items-center justify-center min-w-[100px]`}>
                                                        <span className={`text-2xl font-black ${cat.text}`}>{cat.count}</span>
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider opacity-70 ${cat.text}`}>{cat.name}</span>
                                                    </div>
                                                ))}
                                                {frontCategories.length > 4 && (
                                                    <div className="col-span-2 p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-center border border-gray-200 dark:border-white/10">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                            +{candidate.fronts.length - frontCategories.slice(0,4).reduce((acc, c) => acc + c.count, 0)} Outras
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Colored Tags List */}
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center gap-2 mb-6">
                                                <Tag size={16} className="text-gray-400" />
                                                <p className="text-xs font-black uppercase text-gray-400 tracking-[0.2em]">Todas as Frentes</p>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 content-start max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                                {candidate.fronts.map(f => {
                                                    const style = getFrontCategoryStyle(f.title);
                                                    return (
                                                        <span 
                                                            key={f.id} 
                                                            className={`px-4 py-2 text-[10px] font-bold rounded-xl border cursor-default transition-transform hover:scale-105 ${style.bg} ${style.text} ${style.border}`}
                                                        >
                                                            {f.title}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-400 font-bold text-xs uppercase tracking-widest opacity-50">
                                        Nenhuma frente parlamentar registrada.
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {profileTab === 'agenda' && (
                        <div className="space-y-4">
                            {isLoadingDetails && (!candidate.agenda || candidate.agenda.length === 0) ? (
                                <Skeleton className="h-32 w-full rounded-[2.5rem]" />
                            ) : (
                                candidate.agenda && candidate.agenda.length > 0 ? candidate.agenda.map((event, i) => {
                                    const isLive = event.status?.toLowerCase().includes('andamento');
                                    return (
                                        <div key={i} className="bg-white/90 dark:bg-midnight/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/30 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 animate-in fade-in">
                                            {isLive && (<div className="absolute top-0 right-0 px-4 py-2 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl shadow-lg animate-pulse">Ao Vivo</div>)}
                                            <div className="flex md:flex-col items-center md:justify-center gap-3 shrink-0 md:w-32 md:border-r border-gray-100 dark:border-gray-800">
                                                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 backdrop-blur-sm"><CalendarDays size={24} /></div>
                                                <div className="text-center"><p className="text-xs font-black text-gray-900 dark:text-white uppercase">{event.startTime.split(' ')[0]}</p><p className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{event.startTime.split(' ')[1]}</p></div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap gap-2 mb-2"><span className="px-3 py-1 rounded-full bg-gray-100/50 dark:bg-white/5 text-[9px] font-black uppercase text-gray-500 tracking-wider backdrop-blur-sm">{event.type}</span><span className="px-3 py-1 rounded-full bg-gray-100/50 dark:bg-white/5 text-[9px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1 backdrop-blur-sm"><MapPin size={10}/> {event.location}</span></div>
                                                <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2 leading-tight">{event.description}</h4>
                                                <p className="text-sm text-gray-500 font-medium">Situação: {event.status}</p>
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="text-center py-24 text-gray-400 text-sm font-bold uppercase tracking-[0.3em] opacity-50">Nenhum evento agendado para os próximos 15 dias</div>
                                )
                            )}
                        </div>
                    )}
                    {profileTab === 'money' && (
                         <div className="space-y-6 md:space-y-10">
                             {/* Big Total Card */}
                             {isLoadingDetails && displayStats.spending === 0 ? <Skeleton className="h-64 w-full rounded-[3rem]" /> : (
                                 <div className="bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/10 px-8 py-12 md:py-20 rounded-[3rem] border border-green-200/50 dark:border-green-800/50 text-center shadow-inner dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden group backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2">
                                     <p className="text-[10px] md:text-xs font-black text-green-700 dark:text-green-300 uppercase mb-3 tracking-[0.3em]">{selectedYear === 'total' ? 'Recursos Públicos Utilizados (Total)' : `Recursos Utilizados em ${selectedYear}`}</p>
                                     <p className="text-4xl md:text-7xl font-black text-green-800 dark:text-green-400 tracking-tighter">R$ {displayStats.spending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                 </div>
                             )}
                             
                             {/* Amendments Section */}
                             {candidate.amendmentStats && candidate.amendmentStats.authorized > 0 && (
                                <section className="bg-white/60 dark:bg-midnight/90 backdrop-blur-2xl p-6 md:p-8 rounded-[3rem] border border-white/30 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden animate-in fade-in">
                                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-3"><div className="p-2 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 backdrop-blur-sm"><Wallet size={20} /></div><div><h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Emendas Individuais</h4><p className="text-[10px] text-gray-500 font-medium">Orçamento da União (Proposto)</p></div></div>
                                    <div className="space-y-6"><div><div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Valor Apresentado</span><span className="text-lg font-black text-purple-600 dark:text-purple-400">R$ {candidate.amendmentStats.authorized.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div className="w-full h-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><div className="h-full bg-purple-500 rounded-full w-full"></div></div></div></div>
                                    <div className="mt-6 p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl text-[10px] text-gray-500 italic text-center backdrop-blur-sm">* Valor total das emendas de autoria do parlamentar listadas na API. A execução financeira depende do Poder Executivo.</div>
                                </section>
                             )}

                             {/* --- VIAGENS OFICIAIS --- */}
                             {candidate.travels && candidate.travels.length > 0 && (
                                 <section className="bg-white/60 dark:bg-midnight/90 backdrop-blur-2xl p-6 md:p-8 rounded-[3rem] border border-white/30 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden animate-in fade-in">
                                     <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">
                                         <div className="p-2 bg-sky-100/50 dark:bg-sky-900/30 rounded-xl text-sky-600 dark:text-sky-400 backdrop-blur-sm">
                                             <Plane size={20} />
                                         </div>
                                         <div>
                                             <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Viagens Oficiais</h4>
                                             <p className="text-[10px] text-gray-500 font-medium">Deslocamentos com Cota Parlamentar</p>
                                         </div>
                                     </div>

                                     <div className="space-y-3">
                                         {candidate.travels.map((trip, i) => (
                                             <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-900 transition-colors group">
                                                 <div className="flex items-center gap-4">
                                                     <div className="flex flex-col items-center justify-center w-12 h-12 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm shrink-0">
                                                         <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(trip.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                                         <span className="text-lg font-black text-gray-800 dark:text-white leading-none">{new Date(trip.date).getDate()}</span>
                                                     </div>
                                                     <div>
                                                         <p className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wide group-hover:text-sky-600 transition-colors">{trip.destiny}</p>
                                                         <p className="text-[10px] text-gray-500 line-clamp-1">{trip.reason}</p>
                                                     </div>
                                                 </div>
                                                 <div className="text-right">
                                                     <p className="text-sm font-black text-sky-600 dark:text-sky-400">R$ {trip.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </section>
                             )}
                             
                             {/* Breakdown List */}
                             {isLoadingDetails && (!candidate.expensesBreakdown || candidate.expensesBreakdown.length === 0) ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-16 w-full rounded-2xl" />
                                    <Skeleton className="h-16 w-full rounded-2xl" />
                                    <Skeleton className="h-16 w-full rounded-2xl" />
                                </div>
                             ) : (
                                 candidate.expensesBreakdown && candidate.expensesBreakdown.length > 0 && (
                                      <section className="bg-white/60 dark:bg-midnight/90 backdrop-blur-2xl p-6 md:p-12 rounded-[3rem] border border-white/30 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-4">
                                          <h4 className="text-[11px] md:text-xs font-black uppercase text-gray-400 mb-8 tracking-[0.4em] border-b border-gray-50 dark:border-white/5 pb-3">Detalhamento dos Gastos</h4>
                                          <div className="space-y-4 md:space-y-6">
                                              {candidate.expensesBreakdown.map((exp, i) => (
                                                  <a 
                                                    key={i}
                                                    href={`https://www.camara.leg.br/deputados/${candidate.id}/despesas`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    title="Ver fonte oficial na Câmara"
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 bg-gray-50/50 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-transparent hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all group cursor-pointer hover:scale-[1.01]"
                                                  >
                                                      <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                                          <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-gray-700/50 flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                                                              <Banknote size={24} aria-hidden="true" />
                                                          </div>
                                                          <div>
                                                              <span className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-1 group-hover:text-blue-600 transition-colors">{exp.type}</span>
                                                              <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1 group-hover:text-blue-400">Fonte Oficial <ExternalLink size={8}/></span>
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center justify-between sm:justify-end gap-6 pl-16 sm:pl-0">
                                                          <div className="text-right">
                                                              <span className="text-sm md:text-lg font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                              <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-1.5 overflow-hidden" aria-hidden="true"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${exp.percent}%` }}></div></div>
                                                          </div>
                                                      </div>
                                                  </a>
                                              ))}
                                          </div>
                                      </section>
                                 )
                             )}
                         </div>
                    )}
                    
                    {profileTab === 'cabinet' && (
                        <div className="space-y-6">
                             <div className="bg-white/70 dark:bg-midnight/90 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-10 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in fade-in">
                                <h3 className="font-black text-blue-900 dark:text-white text-lg mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">Equipe de Gabinete</h3>
                                {isLoadingDetails && (!candidate.staff || candidate.staff.length === 0) ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                    </div>
                                ) : (
                                    candidate.staff && candidate.staff.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {candidate.staff.map((sec, i) => (
                                                <div key={i} className="flex items-center gap-4 p-5 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
                                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm text-lg">
                                                        {sec.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{sec.name}</p>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{sec.role}</p>
                                                        <p className="text-[9px] text-gray-400 mt-0.5">{sec.group}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest opacity-50">
                                            Informação de secretários não disponível.
                                        </div>
                                    )
                                )}
                             </div>
                        </div>
                    )}

                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ProfileView;
