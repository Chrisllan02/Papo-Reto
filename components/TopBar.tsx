import React, { useCallback, useState } from 'react';
import { Accessibility, MessageCircle, Search, MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import AppearancePopover from './AppearancePopover';
import SettingsSheet from './SettingsSheet';
import { NAV_TABS } from './navTabs';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spring';
const OUTLINE_BUTTON = `h-11 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors ${FOCUS_RING}`;

interface SearchFormProps {
  id: string;
  placeholder: string;
  className: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ id, placeholder, className }) => {
  const { actions } = useAppContext();
  const [query, setQuery] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!query.trim()) return;
      actions.searchPoliticians(query);
  };

  return (
    <form role="search" aria-label="Buscar políticos" onSubmit={handleSubmit} className={className}>
        <label htmlFor={id} className="sr-only">Buscar político, partido ou estado</label>
        <div className="flex h-11 w-full items-center gap-2.5 rounded-xl bg-white dark:bg-white/10 px-3.5 text-slate-600 dark:text-slate-300 focus-within:ring-2 focus-within:ring-spring">
            <Search size={18} aria-hidden="true" className="shrink-0" />
            <input
                id={id}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="min-w-0 flex-1 bg-transparent text-base text-midnight dark:text-white placeholder:text-[#5A6878] dark:placeholder:text-slate-300 outline-none"
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

  const handleRegion = () => {
      if (userLocation) {
          actions.goToExplore(userLocation);
      } else {
          void actions.detectLocation();
      }
  };

  const regionLabel = isLocating ? 'Localizando...' : userLocation || 'Minha região';
  const regionAriaLabel = isLocating
      ? 'Localizando seu estado'
      : userLocation ? `Abrir bancada de ${userLocation}` : 'Detectar minha região';

  return (
    <>
      <header className="relative z-40 shrink-0 bg-midnight text-white pt-safe px-safe">
          <div className="flex flex-col gap-3 px-4 py-3.5 md:gap-3.5 md:px-7 md:pt-4 md:pb-0">
              <div className="flex items-center gap-3 md:gap-6">
                  <button
                      type="button"
                      onClick={() => actions.setActiveTab('feed')}
                      aria-label="PapoReto, ir para Hoje no Congresso"
                      className={`flex min-h-11 items-center gap-2.5 rounded-xl ${FOCUS_RING}`}
                  >
                      <span aria-hidden="true" className="hidden md:flex h-9 w-9 items-center justify-center rounded-[10px] bg-spring">
                          <MessageCircle size={20} className="text-midnight fill-midnight" />
                      </span>
                      <span aria-hidden="true" className="text-lg md:text-xl font-black tracking-tight text-white">
                          Papo<span className="text-spring">Reto</span>
                      </span>
                  </button>

                  <SearchForm id="busca-topo" placeholder="Busque um político, partido ou estado" className="hidden md:block flex-1" />

                  <div className="ml-auto md:ml-0 flex items-center gap-1.5 md:gap-3">
                      <button
                          type="button"
                          onClick={handleRegion}
                          disabled={isLocating}
                          aria-label={regionAriaLabel}
                          className={`${OUTLINE_BUTTON} flex min-w-11 items-center justify-center gap-1.5 px-2.5 md:gap-2 md:px-3.5 text-sm font-bold disabled:opacity-70`}
                      >
                          {isLocating
                              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                              : userLocation ? <MapPin size={16} aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />}
                          {userLocation && !isLocating && <span className="md:hidden">{userLocation}</span>}
                          <span className="hidden md:inline">{regionLabel}</span>
                      </button>

                      <div className="hidden md:block">
                          <AppearancePopover buttonClassName={`${OUTLINE_BUTTON} flex w-11 items-center justify-center`} />
                      </div>

                      <button
                          type="button"
                          onClick={() => setIsSheetOpen(true)}
                          aria-label="Acessibilidade"
                          aria-haspopup="dialog"
                          aria-expanded={isSheetOpen}
                          aria-controls="menu-movel"
                          className={`${OUTLINE_BUTTON} md:hidden flex w-11 items-center justify-center`}
                      >
                          <Accessibility size={20} aria-hidden="true" />
                      </button>
                  </div>
              </div>

              <SearchForm id="busca-topo-movel" placeholder="Político, partido ou estado" className="md:hidden" />

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
                              className={`min-h-11 rounded-t-xl px-[18px] py-3 text-[15px] transition-colors ${FOCUS_RING} ${
                                  isActive
                                  ? 'bg-praxeti text-midnight font-bold dark:bg-[#111111] dark:text-white'
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
