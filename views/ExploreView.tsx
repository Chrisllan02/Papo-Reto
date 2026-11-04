import React, { useState, useMemo, useDeferredValue, useEffect, useRef, useLayoutEffect } from 'react';
import { ArrowDownAZ, ArrowUpZA, X } from 'lucide-react';
import { Politician, Party } from '../types';
import { getIdeology } from '../services/camaraApi';
import { PARTY_METADATA } from '../constants';
import { getIdeologyTheme } from '../utils/themeUtils';
import { STATE_NAMES, stateWithPreposition } from '../utils/location';
import { filterPoliticians, partyCounts, partyKey, stateCounts, tabCounts, SortOrder } from '../utils/politicianSearch';
import DataState from '../components/DataState';
import FilterMenu, { FILTER_BUTTON, FilterOption } from '../components/politicians/FilterMenu';
import PoliticianCard from '../components/politicians/PoliticianCard';
import { CARD_SURFACE, LINK_FOCUS, MUTED } from '../components/numbers/NumCard';
import type { ExploreQuery } from '../contexts/AppContext';
import * as ReactWindow from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

const AutoSizer = (AutoSizerModule as any).default || AutoSizerModule;
const List = (ReactWindow as any).FixedSizeList;

interface ExploreViewProps {
  politicians: Politician[];
  parties?: Party[];
  onSelectCandidate: (pol: Politician) => void;
  followingIds?: number[];
  preselectedState?: string;
  defaultState?: string;
  searchRequest?: ExploreQuery | null;
  onSearchApplied?: () => void;
}

type Tab = 'todos' | 'deputados' | 'senadores' | 'partidos' | 'estados';

const TAB_LABELS: Record<Tab, string> = {
  todos: 'Todos',
  deputados: 'Deputados',
  senadores: 'Senadores',
  partidos: 'Partidos',
  estados: 'Estados',
};
const TAB_ORDER: Tab[] = ['todos', 'deputados', 'senadores', 'partidos', 'estados'];
const CHAMBER_BY_TAB = { todos: 'todos', deputados: 'camara', senadores: 'senado' } as const;
const NOUNS: Record<'todos' | 'deputados' | 'senadores', [string, string]> = {
  todos: ['político', 'políticos'],
  deputados: ['deputado', 'deputados'],
  senadores: ['senador', 'senadores'],
};

const UNCLASSIFIED_IDEOLOGY = 'Não classificado';
const IDEOLOGY_SECTION_ORDER = ['Direita', 'Centro', 'Esquerda', UNCLASSIFIED_IDEOLOGY];
const IDEOLOGY_OPTIONS: FilterOption[] = [
  { value: '', label: 'Todas' },
  { value: 'Esquerda', label: 'Esquerda' },
  { value: 'Centro', label: 'Centro' },
  { value: 'Direita', label: 'Direita' },
];
const STATE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Brasil' },
  ...Object.keys(STATE_NAMES).sort().map(uf => ({ value: uf, label: uf, ariaLabel: STATE_NAMES[uf] })),
];

const TABS_SURFACE = 'md:border md:border-white/60 md:bg-white/70 md:shadow-[0_1px_2px_rgba(0,39,118,0.06),0_8px_24px_rgba(0,39,118,0.08)] md:backdrop-blur-xl md:dark:border-white/10 md:dark:bg-white/5';

const pluralize = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

interface PartyGroup {
  name: string;
  officialName: string;
  ideology: string;
  members: Politician[];
}

const PartyCard: React.FC<{ group: PartyGroup; onSelect: (name: string) => void }> = ({ group, onSelect }) => {
  const theme = getIdeologyTheme(group.ideology);
  const previewMembers = group.members.slice(0, 4);

  return (
    <button
      type="button"
      onClick={() => onSelect(group.name)}
      aria-label={`Ver os ${group.members.length} parlamentares do ${group.name}, ${group.ideology}`}
      className={`flex min-h-[148px] w-full flex-col gap-3 rounded-3xl p-4 text-left text-midnight transition-shadow hover:shadow-[0_12px_32px_rgba(0,39,118,0.16)] dark:text-white ${CARD_SURFACE} ${LINK_FOCUS}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white ${theme.iconBg}`}>
          {group.name.substring(0, 4)}
        </span>
        <span className={`rounded-lg px-2 py-0.5 text-sm font-semibold ${theme.badgeBg} ${theme.badgeText}`}>{theme.label}</span>
      </span>
      <span className="mt-auto flex flex-col gap-0.5">
        <span className="line-clamp-2 text-xl font-black leading-tight">{group.name}</span>
        {group.officialName !== group.name && <span className={`line-clamp-1 text-sm font-semibold ${MUTED}`}>{group.officialName}</span>}
        <span className={`text-sm font-semibold ${MUTED}`}>{pluralize(group.members.length, 'parlamentar', 'parlamentares')}</span>
      </span>
      <span className="flex items-center -space-x-2" aria-hidden="true">
        {previewMembers.map(member => (
          <img key={member.id} src={member.photo} alt="" loading="lazy" className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 object-cover object-top dark:border-slate-900" />
        ))}
        {group.members.length > previewMembers.length && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-sm font-semibold text-midnight dark:border-slate-900 dark:bg-slate-800 dark:text-white">
            +{group.members.length - previewMembers.length}
          </span>
        )}
      </span>
    </button>
  );
};

interface VirtualRowData {
  items: Politician[];
  numColumns: number;
  variant: 'card' | 'row';
  showState: boolean;
  onSelect: (pol: Politician) => void;
  followingIds: number[];
}

const VirtualRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: VirtualRowData }) => {
  const { items, numColumns, variant, showState, onSelect, followingIds } = data;
  const rowItems = items.slice(index * numColumns, (index + 1) * numColumns);
  const card = (pol: Politician) => (
    <PoliticianCard pol={pol} onSelect={onSelect} isFollowing={followingIds.includes(pol.id)} variant={variant} showState={showState} />
  );

  if (variant === 'row') {
    return <div style={style} className="border-b border-midnight/[0.07] dark:border-white/10">{rowItems.map(pol => <React.Fragment key={pol.id}>{card(pol)}</React.Fragment>)}</div>;
  }

  return (
    <div style={style} className="flex gap-3 pb-3">
      {rowItems.map(pol => <div key={pol.id} className="h-full min-w-0 flex-1">{card(pol)}</div>)}
      {Array.from({ length: numColumns - rowItems.length }, (_, i) => <div key={`spacer-${i}`} className="flex-1" />)}
    </div>
  );
};

const getColumnCount = (width: number) => (width >= 1536 ? 3 : width >= 768 ? 2 : 1);

const ExploreView: React.FC<ExploreViewProps> = ({ politicians, parties = [], onSelectCandidate, followingIds = [], preselectedState, defaultState, searchRequest = null, onSearchApplied }) => {
  const [tab, setTab] = useState<Tab>('todos');
  const [search, setSearch] = useState(searchRequest?.text ?? '');
  const [appliedSearchSeq, setAppliedSearchSeq] = useState(searchRequest?.seq);
  const [uf, setUf] = useState(searchRequest ? '' : preselectedState || defaultState || '');
  const [party, setParty] = useState('');
  const [ideology, setIdeology] = useState('');
  const [order, setOrder] = useState<SortOrder>('asc');
  const deferredSearch = useDeferredValue(search);

  if (searchRequest && searchRequest.seq !== appliedSearchSeq) {
    setAppliedSearchSeq(searchRequest.seq);
    setSearch(searchRequest.text);
    setUf('');
    setParty('');
    setIdeology('');
    setTab('todos');
  }

  useEffect(() => {
    if (searchRequest) onSearchApplied?.();
  }, [searchRequest, onSearchApplied]);

  useEffect(() => {
    if (preselectedState) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- aplica o estado pré-selecionado vindo de fora
      setUf(preselectedState);
      setTab('todos');
    }
  }, [preselectedState]);

  const partiesListRef = useRef<HTMLDivElement>(null);
  const partiesScrollRef = useRef(0);

  useLayoutEffect(() => {
    if (tab === 'partidos' && partiesListRef.current) partiesListRef.current.scrollTop = partiesScrollRef.current;
  }, [tab]);

  const changeTab = (next: Tab) => {
    if (tab === 'partidos' && partiesListRef.current) partiesScrollRef.current = partiesListRef.current.scrollTop;
    setTab(next);
  };

  const selectParty = (sigla: string) => {
    if (partiesListRef.current) partiesScrollRef.current = partiesListRef.current.scrollTop;
    setParty(sigla);
    setTab('todos');
  };

  const counts = useMemo(() => tabCounts(politicians), [politicians]);
  const partyOptions = useMemo<FilterOption[]>(
    () => [{ value: '', label: 'Todos os partidos' }, ...partyCounts(politicians).map(({ key, count }) => ({ value: key, label: `${key} (${count})`, ariaLabel: `${key}, ${pluralize(count, 'parlamentar', 'parlamentares')}` }))],
    [politicians],
  );

  const listTab = tab === 'todos' || tab === 'deputados' || tab === 'senadores';
  const filteredList = useMemo(
    () => filterPoliticians(politicians, { chamber: listTab ? CHAMBER_BY_TAB[tab] : 'todos', uf, party, ideology, search: deferredSearch, order }),
    [politicians, listTab, tab, uf, party, ideology, deferredSearch, order],
  );

  const partyGroups = useMemo<PartyGroup[]>(() => {
    const members = filterPoliticians(politicians, { chamber: 'todos', uf, party: '', ideology, search: deferredSearch, order: 'asc' });
    const groups = new Map<string, Politician[]>();
    members.forEach(pol => {
      const key = partyKey(pol);
      groups.set(key, [...(groups.get(key) ?? []), pol]);
    });
    return Array.from(groups, ([name, list]) => {
      const official = parties.find(p => p.sigla.trim().toUpperCase() === name);
      return {
        name,
        officialName: official?.nome || PARTY_METADATA[name]?.nome || name,
        ideology: official?.ideology || getIdeology(name) || UNCLASSIFIED_IDEOLOGY,
        members: list,
      };
    }).sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name, 'pt-BR'));
  }, [politicians, parties, uf, ideology, deferredSearch]);

  const partySections = useMemo(
    () => IDEOLOGY_SECTION_ORDER
      .map(name => ({ name, groups: partyGroups.filter(group => group.ideology === name) }))
      .filter(section => section.groups.length > 0)
      .map(section => ({ ...section, representatives: section.groups.reduce((total, group) => total + group.members.length, 0) })),
    [partyGroups],
  );

  const stateEntries = useMemo(
    () => stateCounts(politicians).sort((a, b) => (STATE_NAMES[a.key] ?? a.key).localeCompare(STATE_NAMES[b.key] ?? b.key, 'pt-BR')),
    [politicians],
  );

  const hasFilters = Boolean(uf || party || ideology || search.trim());
  const clearFilters = () => {
    setSearch('');
    setUf('');
    setParty('');
    setIdeology('');
  };

  const countText = (() => {
    if (tab === 'estados') return pluralize(stateEntries.length, 'estado ou DF', 'estados e DF');
    const place = uf ? ` ${stateWithPreposition(uf)}` : '';
    if (tab === 'partidos') return `${pluralize(partyGroups.length, 'partido', 'partidos')}${place}`;
    const [singular, plural] = NOUNS[tab];
    return `${pluralize(filteredList.length, singular, plural)}${place}`;
  })();

  const showFilters = tab !== 'estados';
  const SortIcon = order === 'asc' ? ArrowDownAZ : ArrowUpZA;
  const orderText = order === 'asc' ? 'A–Z' : 'Z–A';

  const count = (className: string) => <span className={`text-sm font-bold ${MUTED} ${className}`}>{countText}</span>;

  const renderPoliticians = () => {
    if (filteredList.length === 0) {
      return (
        <div className="flex justify-center px-4 py-10">
          <DataState
            title="Nenhum resultado encontrado"
            description={politicians.length === 0 ? 'Ainda não há parlamentares para mostrar.' : 'Não encontramos parlamentares com os filtros atuais.'}
            actionLabel={hasFilters ? 'Limpar filtros' : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        </div>
      );
    }

    return (
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => {
          const numColumns = getColumnCount(width);
          const variant = width < 768 ? 'row' : 'card';
          const list = (
            <List
              height={variant === 'row' ? height - 2 : height}
              itemCount={Math.ceil(filteredList.length / numColumns)}
              itemSize={variant === 'row' ? 72 : 88}
              width={width}
              itemData={{ items: filteredList, numColumns, variant, showState: !uf, onSelect: onSelectCandidate, followingIds }}
              className="scrollbar-hide"
            >
              {VirtualRow}
            </List>
          );
          return variant === 'row' ? <div className={`overflow-hidden rounded-3xl ${CARD_SURFACE}`} style={{ height, width }}>{list}</div> : list;
        }}
      </AutoSizer>
    );
  };

  const renderParties = () => (
    <div ref={partiesListRef} className="h-full space-y-6 overflow-y-auto overscroll-contain pb-4">
      {partySections.length === 0 && (
        <div className="flex justify-center px-4 py-10">
          <DataState title="Nenhum resultado encontrado" description="Não encontramos partidos com os filtros atuais." actionLabel={hasFilters ? 'Limpar filtros' : undefined} onAction={hasFilters ? clearFilters : undefined} />
        </div>
      )}
      {partySections.map(section => {
        const theme = getIdeologyTheme(section.name);
        const headingId = `posicao-${section.name.replace(/\s+/g, '-')}`;
        return (
          <section key={section.name} aria-labelledby={headingId} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className={`h-9 w-1.5 rounded-full ${theme.iconBg}`} aria-hidden="true" />
                <div>
                  <h2 id={headingId} className="text-xl font-black text-midnight dark:text-white">{section.name}</h2>
                  <p className={`text-sm font-semibold ${MUTED}`}>{pluralize(section.groups.length, 'partido', 'partidos')} nesta posição</p>
                </div>
              </div>
              <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${theme.badgeBg} ${theme.badgeText}`}>{pluralize(section.representatives, 'parlamentar', 'parlamentares')}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.groups.map(group => <PartyCard key={group.name} group={group} onSelect={selectParty} />)}
            </div>
          </section>
        );
      })}
    </div>
  );

  const renderStates = () => (
    <div className="h-full overflow-y-auto overscroll-contain pb-4">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {stateEntries.map(({ key, count: total }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => { setUf(key); setTab('todos'); }}
              aria-label={`Ver os ${pluralize(total, 'parlamentar', 'parlamentares')} de ${STATE_NAMES[key] ?? key}`}
              className={`flex min-h-[76px] w-full items-center gap-3 rounded-3xl px-3.5 text-left text-midnight dark:text-white ${CARD_SURFACE} ${LINK_FOCUS}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-midnight text-sm font-black text-white dark:bg-white dark:text-midnight">{key}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-extrabold">{STATE_NAMES[key] ?? key}</span>
                <span className={`text-sm font-semibold ${MUTED}`}>{pluralize(total, 'parlamentar', 'parlamentares')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-praxeti via-[#EEF3FA] to-[#E6F3EA] font-sans dark:bg-transparent dark:bg-none">
      <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-3 px-4 pb-24 pt-6 px-safe md:gap-4 md:px-8 md:pb-8 md:pt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[26px] font-black tracking-tight text-midnight dark:text-white md:text-4xl">Políticos</h1>
          {count('md:hidden')}
        </div>

        <nav aria-label="Seções de Políticos" className="-mx-4 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:self-start md:overflow-visible md:px-0">
          <div className={`flex w-max gap-1 md:rounded-full md:p-1.5 ${TABS_SURFACE}`}>
            {TAB_ORDER.map(id => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeTab(id)}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition-colors md:px-[18px] ${LINK_FOCUS} ${
                    active
                      ? 'bg-midnight font-extrabold text-white shadow-[0_6px_16px_rgba(0,39,118,0.3)] dark:bg-white dark:text-midnight'
                      : 'font-semibold text-midnight hover:bg-midnight/5 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  {TAB_LABELS[id]}
                  <span className={`rounded-full px-2 py-0.5 text-sm font-extrabold ${active ? 'bg-white/20 dark:bg-midnight/10' : 'bg-midnight/[0.08] dark:bg-white/10'}`}>{counts[id]}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="relative flex flex-wrap items-center gap-2 md:gap-2.5">
          {count('hidden md:block md:flex-1')}
          {search.trim() && (
            <span className={`${FILTER_BUTTON} pr-1`}>
              <span className="max-w-[12rem] truncate">Busca: {search.trim()}</span>
              <button type="button" onClick={() => setSearch('')} aria-label="Limpar a busca" className={`flex h-9 w-9 items-center justify-center rounded-full ${LINK_FOCUS}`}>
                <X size={16} aria-hidden="true" />
              </button>
            </span>
          )}
          {showFilters && (
            <FilterMenu
              label="Estado"
              ariaLabel="Filtrar por estado"
              valueLabel={STATE_NAMES[uf] ?? uf}
              value={uf}
              options={STATE_OPTIONS}
              onChange={setUf}
              gridClassName="grid-cols-6"
            />
          )}
          {listTab && (
            <FilterMenu label="Partido" ariaLabel="Filtrar por partido" valueLabel={party} value={party} options={partyOptions} onChange={setParty} gridClassName="grid-cols-2" />
          )}
          {showFilters && (
            <FilterMenu label="Posição" ariaLabel="Filtrar por posição política" valueLabel={ideology} value={ideology} options={IDEOLOGY_OPTIONS} onChange={setIdeology} panelClassName="md:w-56" />
          )}
          {listTab && (
            <button
              type="button"
              onClick={() => setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              aria-label={`Ordenar por nome, de ${order === 'asc' ? 'A a Z' : 'Z a A'}. Tocar para inverter`}
              className={`${FILTER_BUTTON} ml-auto md:ml-0`}
            >
              <SortIcon size={16} aria-hidden="true" className="md:hidden" />
              <span aria-hidden="true"><span className="hidden md:inline">Ordenar: </span>{orderText}</span>
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {listTab && renderPoliticians()}
          {tab === 'partidos' && renderParties()}
          {tab === 'estados' && renderStates()}
        </div>
      </div>
    </div>
  );
};

export default ExploreView;
