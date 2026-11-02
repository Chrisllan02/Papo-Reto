import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { NAV_TABS } from './navTabs';

const MobileNav: React.FC = () => {
  const { state, actions } = useAppContext();
  const { activeTab } = state;

  return (
    <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none pb-safe">
        <nav
            className="pointer-events-auto bg-midnight dark:border dark:border-white/15 grid h-16 grid-cols-4 gap-1 p-1.5 rounded-[22px] shadow-[0_8px_24px_rgba(0,39,118,0.3)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] w-full max-w-sm mx-auto"
            aria-label="Menu principal"
        >
            {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        data-tour={tab.id}
                        onClick={() => actions.setActiveTab(tab.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spring ${
                            isActive
                            ? 'bg-spring text-midnight'
                            : 'text-white hover:bg-white/10'
                        }`}
                    >
                        <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                        <span className={`text-[11px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                            {tab.shortLabel}
                        </span>
                    </button>
                );
            })}
        </nav>
    </div>
  );
};

export default MobileNav;
