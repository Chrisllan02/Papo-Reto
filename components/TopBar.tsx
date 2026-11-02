import React, { useCallback, useState } from 'react';
import { Accessibility, ChevronDown, Search, MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import AppearancePopover from './AppearancePopover';
import SettingsSheet from './SettingsSheet';
import { NAV_TABS } from './navTabs';
import BrandLogo from './BrandLogo';
import RegionPicker from './RegionPicker';
import { STATE_NAMES } from '../utils/location';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spring';
const GLASS_BUTTON = `h-11 rounded-full bg-white/[0.12] text-white hover:bg-white/20 transition-colors ${FOCUS_RING}`;

interface SearchFormProps {
  id: string;
  className: string;
  fieldClassName: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ id, className, fieldClassName }) => {
  const { actions } = useAppContext();
  const [query, setQuery] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!query.trim()) return;
      actions.searchPoliticians(query);
  };

  return (
    <form role="search" aria-label="Pesquisar político, partido ou estado" onSubmit={handleSubmit} className={className}>
        <label htmlFor={id} className="sr-only">Pesquisar político, partido ou estado</label>
        <div className={`flex w-full items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.12] px-4 text-white/[0.85] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] focus-within:ring-2 focus-within:ring-spring ${fieldClassName}`}>
            <Search size={18} aria-hidden="true" className="shrink-0" />
            <input
                id={id}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar"
                aria-label="Pesquisar político, partido ou estado"
                className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/[0.85] outline-none"
            />
        </div>
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
