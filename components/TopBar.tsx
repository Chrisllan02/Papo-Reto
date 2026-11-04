import React, { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { Accessibility, ChevronDown, Search, MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import AppearancePopover from './AppearancePopover';
import SettingsSheet from './SettingsSheet';
import { NAV_TABS } from './navTabs';
import BrandLogo from './BrandLogo';
import RegionPicker from './RegionPicker';
import { STATE_NAMES } from '../utils/location';
import { searchSuggestions } from '../utils/politicianSearch';
import { isSenator } from '../utils/numbersStats';
import type { Politician } from '../types';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spring';
const GLASS_BUTTON = `h-11 rounded-full bg-white/[0.12] text-white hover:bg-white/20 transition-colors ${FOCUS_RING}`;

interface SearchFormProps {
  id: string;
  className: string;
  fieldClassName: string;
}

const SUGGESTION_ITEM = 'flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-1.5 text-left text-midnight hover:bg-midnight/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nuit dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-spring';
const SUGGESTION_GROUP = 'px-3 pb-1 pt-2 text-sm font-extrabold text-nuit dark:text-spring';

const SearchForm: React.FC<SearchFormProps> = ({ id, className, fieldClassName }) => {
  const { state, actions } = useAppContext();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  const suggestions = useMemo(() => searchSuggestions(deferredQuery, state.politicians), [deferredQuery, state.politicians]);
  const hasSuggestions = suggestions.parties.length > 0 || suggestions.politicians.length > 0;
  const showPanel = open && hasSuggestions && query.trim().length >= 2;

  const close = () => setOpen(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!query.trim()) return;
      close();
      actions.searchPoliticians(query);
  };

  const chooseParty = (sigla: string) => {
      close();
      setQuery('');
      actions.searchPoliticians(sigla);
  };

  const choosePolitician = (pol: Politician) => {
      close();
      setQuery('');
      actions.selectCandidate(pol);
  };

  const focusItem = (step: 1 | -1) => {
      const items = Array.from(formRef.current?.querySelectorAll<HTMLElement>('[data-suggestion]') ?? []);
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      if (current === -1) items[step === 1 ? 0 : items.length - 1].focus();
      else if (current + step < 0) inputRef.current?.focus();
      else items[Math.min(current + step, items.length - 1)].focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (!showPanel) return;
      if (event.key === 'Escape') {
          close();
          inputRef.current?.focus();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          focusItem(event.key === 'ArrowDown' ? 1 : -1);
      }
  };

  const handleBlur = (event: React.FocusEvent<HTMLFormElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  };

  return (
    <form ref={formRef} role="search" aria-label="Pesquisar político, partido ou estado" onSubmit={handleSubmit} onKeyDown={handleKeyDown} onBlur={handleBlur} className={`relative ${className}`}>
        <label htmlFor={id} className="sr-only">Pesquisar político, partido ou estado</label>
        <div className={`flex w-full items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.12] px-4 text-white/[0.85] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] focus-within:ring-2 focus-within:ring-spring ${fieldClassName}`}>
            <Search size={18} aria-hidden="true" className="shrink-0" />
            <input
                ref={inputRef}
                id={id}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Pesquisar"
                aria-label="Pesquisar político, partido ou estado"
                className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/[0.85] outline-none"
            />
        </div>

        {showPanel && (
            <div role="region" aria-label={`Resultados para ${query.trim()}`} onMouseDown={(event) => event.preventDefault()} className="absolute left-0 right-0 top-full z-50 mt-2 rounded-3xl border border-white/80 bg-white p-2 text-midnight shadow-[0_12px_40px_rgba(0,39,118,0.25)] dark:border-white/10 dark:bg-[#0B1B3F] dark:text-white">
                {suggestions.parties.length > 0 && (
                    <>
                        <p className={SUGGESTION_GROUP}>Partidos</p>
                        {suggestions.parties.map(party => (
                            <button key={party.sigla} type="button" data-suggestion onClick={() => chooseParty(party.sigla)} className={SUGGESTION_ITEM}>
                                <span className="text-base font-extrabold">{party.sigla}</span>
                                <span className="text-sm font-semibold text-[#4A5A70] dark:text-slate-300">{party.count === 1 ? '1 parlamentar' : `${party.count} parlamentares`}</span>
                            </button>
                        ))}
                    </>
                )}
                {suggestions.politicians.length > 0 && (
                    <>
                        <p className={SUGGESTION_GROUP}>Políticos</p>
                        {suggestions.politicians.map(pol => (
                            <button key={pol.id} type="button" data-suggestion onClick={() => choosePolitician(pol)} className={SUGGESTION_ITEM}>
                                <img src={pol.photo} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full bg-slate-200 object-cover object-top" />
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate text-base font-extrabold">{pol.name}</span>
                                    <span className="truncate text-sm font-semibold text-[#4A5A70] dark:text-slate-300">{pol.party} · {pol.state} · {isSenator(pol) ? 'Senado' : 'Câmara'}</span>
                                </span>
                            </button>
                        ))}
                    </>
                )}
                <button type="submit" data-suggestion className="mt-1 flex min-h-11 w-full items-center justify-center rounded-2xl text-base font-extrabold text-nuit underline underline-offset-4 hover:bg-midnight/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nuit dark:text-spring dark:hover:bg-white/10 dark:focus-visible:ring-spring">
                    Ver todos os resultados
                </button>
            </div>
        )}
    </form>
  );
};

const TopBar: React.FC = () => {
  const { state, actions } = useAppContext();
  const { activeTab, userLocation, isLocating } = state;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  const stateName = userLocation ? STATE_NAMES[userLocation] ?? userLocation : '';
  const regionLabel = isLocating ? 'Localizando...' : stateName || 'Escolher estado';
  const regionAriaLabel = isLocating
      ? 'Localizando o estado'
      : stateName ? `${userLocation}, ${stateName}, trocar estado` : 'Escolher estado';

  return (
    <>
      <header className="relative z-40 shrink-0 text-white pt-safe px-safe bg-gradient-to-b from-midnight to-[#0A3289] rounded-b-[28px] shadow-[0_10px_30px_rgba(0,39,118,0.25)] md:bg-none md:bg-midnight md:rounded-none md:shadow-none">
          <div className="flex flex-col gap-3.5 px-4 pt-4 pb-[18px] md:px-10 md:pt-4 md:pb-3.5">
              <div className="flex items-center justify-between gap-3 md:gap-6">
                  <button
                      type="button"
                      onClick={() => actions.setActiveTab('feed')}
                      aria-label="PapoReto, ir para Hoje no Congresso"
                      className={`flex min-h-11 shrink-0 items-center rounded-xl ${FOCUS_RING}`}
                  >
                      <BrandLogo />
                  </button>

                  <div className="hidden md:flex flex-1 justify-center">
                      <SearchForm id="busca-topo" className="w-full max-w-[440px]" fieldClassName="h-11" />
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                      <RegionPicker
                          triggerLabel={regionAriaLabel}
                          triggerClassName={`${GLASS_BUTTON} flex min-w-11 items-center justify-center gap-1.5 px-3 md:px-4 text-[13px] md:text-sm font-bold`}
                      >
                          {isLocating
                              ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                              : userLocation ? <MapPin size={15} aria-hidden="true" /> : <LocateFixed size={15} aria-hidden="true" />}
                          {userLocation && !isLocating && <span className="md:hidden">{userLocation}</span>}
                          <span className="hidden md:inline">{regionLabel}</span>
                          <ChevronDown size={15} aria-hidden="true" className="hidden md:block" />
                      </RegionPicker>

                      <div className="hidden md:block">
                          <AppearancePopover buttonClassName={`${GLASS_BUTTON} flex w-11 items-center justify-center`} />
                      </div>

                      <button
                          type="button"
                          onClick={() => setIsSheetOpen(true)}
                          aria-label="Acessibilidade"
                          aria-haspopup="dialog"
                          aria-expanded={isSheetOpen}
                          aria-controls="menu-movel"
                          className={`${GLASS_BUTTON} md:hidden flex w-11 items-center justify-center`}
                      >
                          <Accessibility size={18} aria-hidden="true" />
                      </button>
                  </div>
              </div>

              <SearchForm id="busca-topo-movel" className="md:hidden" fieldClassName="h-12" />

              <nav aria-label="Menu principal" className="hidden md:flex gap-1">
                  {NAV_TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                          <button
                              key={tab.id}
                              type="button"
                              data-tour={tab.id}
                              onClick={() => actions.setActiveTab(tab.id)}
                              aria-current={isActive ? 'page' : undefined}
                              className={`min-h-11 rounded-full px-[18px] text-[15px] transition-colors ${FOCUS_RING} ${
                                  isActive
                                  ? 'bg-white text-midnight font-bold shadow-[0_4px_14px_rgba(0,0,0,0.18)]'
                                  : 'text-white font-medium hover:bg-white/10'
                              }`}
                          >
                              {tab.label}
                          </button>
                      );
                  })}
              </nav>
          </div>
      </header>
      <SettingsSheet open={isSheetOpen} onClose={closeSheet} />
    </>
  );
};

export default TopBar;
