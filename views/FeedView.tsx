import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronDown, CheckCircle2, FileText, Landmark, Loader2, LocateFixed, Vote, XCircle, type LucideIcon } from 'lucide-react';
import { FeedCategory, FeedItem, Politician } from '../types';
import { useAppContext } from '../contexts/AppContext';
import FeedDetailModal from '../components/FeedDetailModal';
import DataState from '../components/DataState';
import BancadaFaces from '../components/BancadaFaces';
import RegionPicker from '../components/RegionPicker';
import { formatCardTitle, getCategoryIcon } from '../utils/legislativeTranslator';
import { getFeedTypeMeta } from '../utils/feedType';
import { isUnknownPlace, resolveFeedTitle } from '../utils/feedText';
import { STATE_NAMES } from '../utils/location';
import { formatBrazilianDate, shortFeedTitle } from '../domain/legislative/text';

interface FeedViewProps {
  politicians: Politician[];
  feedItems: FeedItem[];
  onSelectCandidate: (pol: Politician) => void;
  onSeeMore: () => void;
  onGoToExplore: (state: string) => void;
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-spring';
const CARD_FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nuit dark:focus-visible:ring-spring';
interface ItemKind {
  text: string;
  Icon: LucideIcon;
  circle: string;
  tone: string;
}

const NEUTRAL_CIRCLE = 'bg-[#E6EDF8] text-midnight ring-[rgba(0,39,118,0.15)] dark:text-white';
const NEUTRAL_TONE = 'text-midnight dark:text-white';

const TYPE_KINDS: Partial<Record<FeedItem['type'], ItemKind>> = {
  evento: { text: 'Agenda', Icon: CalendarDays, circle: 'bg-[#FFF6BF] text-[#8A6A00] ring-[rgba(138,106,0,0.15)] dark:text-spring', tone: NEUTRAL_TONE },
  voto: { text: 'Votação', Icon: Vote, circle: NEUTRAL_CIRCLE, tone: NEUTRAL_TONE },
  proposicao: { text: 'Tramitação', Icon: FileText, circle: NEUTRAL_CIRCLE, tone: NEUTRAL_TONE },
};

const itemKind = (item: FeedItem): ItemKind => {
  if (item.approval === 1) return { text: 'Aprovado', Icon: CheckCircle2, circle: 'bg-[#E3F2E8] text-picture ring-[rgba(0,107,42,0.15)] dark:text-green-300', tone: 'text-picture dark:text-green-300' };
  if (item.approval === 0) return { text: 'Rejeitado', Icon: XCircle, circle: 'bg-[#FDE8E8] text-[#B91C1C] ring-[rgba(185,28,28,0.15)] dark:text-red-300', tone: 'text-red-800 dark:text-red-300' };
  const typeMeta = getFeedTypeMeta(item.type);
  return TYPE_KINDS[item.type] ?? { text: typeMeta.label, Icon: typeMeta.Icon, circle: NEUTRAL_CIRCLE, tone: NEUTRAL_TONE };
};

const itemCaption = (item: FeedItem) => {
  const category = item.category && item.category !== 'activity' ? getCategoryIcon(item.category) : undefined;
  const place = item.organ || item.eventOrgans?.[0] || (isUnknownPlace(item.location) ? undefined : item.location);
  return [
    category && { text: category.label, Icon: category.icon as LucideIcon },
    place && { text: place, Icon: Landmark },
  ].filter((part): part is { text: string; Icon: LucideIcon } => Boolean(part));
};

const FeedView: React.FC<FeedViewProps> = ({ politicians, feedItems, onSelectCandidate, onSeeMore, onGoToExplore }) => {
  const { state: appState, actions } = useAppContext();
  const { userLocation, isLocating } = appState;
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory | 'all'>('all');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);
  const stateName = userLocation ? STATE_NAMES[userLocation] ?? userLocation : '';
  const bancada = useMemo(
    () => (userLocation ? politicians.filter(pol => pol.state === userLocation) : []),
    [politicians, userLocation],
  );

  const categoryOptions = useMemo(() => {
    const counts = feedItems.reduce((acc, item) => {
      const category = item.category || 'activity';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<FeedCategory, number>);

    return (Object.entries(counts) as Array<[FeedCategory, number]>)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => {
        const meta = getCategoryIcon(id);
        return { id, count, Icon: meta.icon as LucideIcon, label: id === 'activity' ? 'Atividade geral' : meta.label };
      });
  }, [feedItems]);

  const filteredFeedItems = useMemo(() => {
    if (selectedCategory === 'all') return feedItems;
    return feedItems.filter(item => (item.category || 'activity') === selectedCategory);
  }, [feedItems, selectedCategory]);

  const pillClass = (active: boolean) => `shrink-0 h-11 px-4 rounded-full text-sm border transition-colors ${CARD_FOCUS} ${
    active
      ? 'bg-midnight text-white border-midnight font-bold shadow-[0_4px_14px_rgba(0,39,118,0.35)] dark:bg-spring dark:text-midnight dark:border-spring dark:shadow-[0_4px_14px_rgba(0,0,0,0.5)]'
      : 'bg-white/70 backdrop-blur-md text-midnight border-white/80 font-semibold shadow-[0_1px_2px_rgba(0,39,118,0.08)] hover:bg-white dark:bg-white/5 dark:text-white dark:border-white/10 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)] dark:hover:bg-white/10'
  }`;

  return (
    <div className="w-full h-full bg-gradient-to-b from-praxeti via-[#EEF3FA] to-[#E6F3EA] dark:bg-none dark:bg-transparent font-sans overflow-y-auto pb-24 md:pb-12 animate-in fade-in duration-500">
      {selectedFeedItem && (
        <FeedDetailModal
          item={selectedFeedItem}
          politician={politicians.find(p => p.id === selectedFeedItem.politicianId)}
          onClose={() => setSelectedFeedItem(null)}
          onGoToProfile={onSelectCandidate}
        />
      )}

      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[2000px] mx-auto flex flex-col gap-8 md:gap-10">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-midnight dark:text-white">
          {greeting}, Cidadão<span className="sr-only">. Hoje no Congresso</span>
        </h1>

        <section aria-label={stateName ? `Bancada de ${stateName}` : 'Bancadas por estado'} className={`rounded-[1.75rem] md:rounded-[2.25rem] bg-picture bg-gradient-to-br from-picture to-[#0A7A33] ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_rgba(0,107,42,0.25)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-[18px] md:px-8 md:py-7 gap-[14px] md:flex md:flex-row md:items-center md:gap-8 ${userLocation ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center' : 'flex flex-col'}`}>
          <div className="min-w-0 flex flex-col gap-1 md:gap-1.5 md:shrink-0">
            {stateName && <span className="text-[13px] md:text-sm font-bold text-spring">Bancada</span>}
            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white">
              {stateName || 'Bancadas por estado'}
            </h2>
          </div>

          {userLocation ? (
            <>
              <div className="col-span-2 md:flex-1 md:flex md:justify-center">
                <BancadaFaces uf={userLocation} politicians={bancada} />
              </div>
              <span className="text-sm md:text-base font-bold text-white md:shrink-0">
                {bancada.length === 1 ? '1 parlamentar' : `${bancada.length} parlamentares`}
              </span>
              <button
                type="button"
                onClick={() => onGoToExplore(userLocation)}
                className={`justify-self-end shrink-0 h-11 md:h-12 px-[18px] md:px-6 rounded-full bg-spring text-midnight text-sm md:text-[15px] font-extrabold shadow-[0_6px_18px_rgba(255,223,0,0.35)] hover:brightness-95 transition ${FOCUS_RING}`}
              >
                Ver bancada
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:ml-auto">
              <button
                type="button"
                onClick={() => void actions.detectLocation()}
                disabled={isLocating}
                className={`h-12 px-5 rounded-full bg-spring text-midnight text-[15px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-80 ${FOCUS_RING}`}
              >
                {isLocating
                  ? <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  : <LocateFixed size={18} aria-hidden="true" />}
                {isLocating ? 'Localizando...' : 'Usar localização atual'}
              </button>
              <RegionPicker
                align="left"
                triggerLabel="Escolher estado"
                triggerClassName={`h-12 w-full sm:w-auto px-5 rounded-full border border-white/40 bg-white/10 text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-white/20 ${FOCUS_RING}`}
              >
                Escolher estado
                <ChevronDown size={18} aria-hidden="true" />
              </RegionPicker>
            </div>
          )}
        </section>

        <section aria-labelledby="na-pauta-titulo" className="flex flex-col gap-5">
          <h2 id="na-pauta-titulo" className="text-2xl md:text-[26px] font-black text-midnight dark:text-white">Na pauta</h2>

          {categoryOptions.length > 0 && (
            <div
              role="group"
              aria-label="Filtrar por tema"
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 md:flex-wrap md:overflow-visible"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                aria-pressed={selectedCategory === 'all'}
                className={pillClass(selectedCategory === 'all')}
              >
                Todos {feedItems.length}
              </button>
              {categoryOptions.map(({ id, count, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedCategory(id)}
                  aria-pressed={selectedCategory === id}
                  className={pillClass(selectedCategory === id)}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon size={14} aria-hidden="true" />
                    {label} {count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {feedItems.length === 0 ? (
            <DataState
              title="Sem atividades recentes"
              description="Não encontramos movimentações novas para exibir agora. Parlamentares, partidos e conteúdos educativos continuam disponíveis para consulta."
              actionLabel="Explorar políticos"
              onAction={() => onGoToExplore('')}
            />
          ) : filteredFeedItems.length === 0 ? (
            <DataState
              title="Nenhuma atividade neste filtro"
              description="Troque o tema ou limpe o filtro para ver todas as movimentações recentes."
              actionLabel="Ver todos"
              onAction={() => setSelectedCategory('all')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeedItems.slice(0, 6).map(item => {
                const caption = itemCaption(item);
                const kind = itemKind(item);
                const date = formatBrazilianDate(item.date, { withYear: false });
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => setSelectedFeedItem(item)}
                    className={`group min-w-0 rounded-[28px] bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_1px_2px_rgba(0,39,118,0.06),0_8px_24px_rgba(0,39,118,0.08)] hover:shadow-[0_2px_4px_rgba(0,39,118,0.08),0_16px_40px_rgba(0,39,118,0.14)] hover:-translate-y-0.5 dark:bg-white/5 dark:border-white/10 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.45)] dark:hover:shadow-[0_2px_4px_rgba(0,0,0,0.5),0_16px_40px_rgba(0,0,0,0.6)] transition-[box-shadow,transform] duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 p-[18px] md:p-[22px] text-left flex items-start gap-3.5 md:gap-[18px] ${CARD_FOCUS}`}
                  >
                    <span className={`flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full ring-1 ring-inset dark:bg-white/10 dark:ring-white/10 ${kind.circle}`}>
                      <kind.Icon size={22} strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`text-[13px] font-black uppercase tracking-[0.08em] ${kind.tone}`}>{kind.text}</span>
                        {date && <span className="shrink-0 text-[13px] font-bold text-[#4A5A70] dark:text-slate-300">{date}</span>}
                      </span>
                      <span className="text-[17px] md:text-[19px] font-extrabold leading-snug text-midnight dark:text-white line-clamp-2 break-words">
                        {item.type === 'evento' && item.description ? shortFeedTitle(item.description) : formatCardTitle(shortFeedTitle(resolveFeedTitle(item.title, item.description)), item.type)}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 flex-wrap gap-1.5">
                          {caption.map(({ text, Icon }) => (
                            <span key={text} className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-midnight/[0.06] px-2.5 text-xs font-bold text-midnight dark:bg-white/10 dark:text-white">
                              <Icon size={13} aria-hidden="true" className="shrink-0" />
                              <span className="truncate">{text}</span>
                            </span>
                          ))}
                        </span>
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-midnight text-white shadow-[0_4px_12px_rgba(0,39,118,0.25)] dark:bg-spring dark:text-midnight">
                          <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {feedItems.length > 0 && (
            <button
              type="button"
              onClick={onSeeMore}
              className={`self-center min-h-11 px-5 rounded-full text-[15px] font-bold text-midnight underline underline-offset-4 hover:text-picture dark:text-white dark:hover:text-spring ${CARD_FOCUS}`}
            >
              Ver tudo
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

export default FeedView;
