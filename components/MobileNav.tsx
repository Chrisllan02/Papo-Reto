
import React, { useMemo, useState } from 'react';
import { ScrollText, Users, BarChart3, Menu, X, Sun, Moon, Eye, Type, HelpCircle } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  onStartTour?: () => void;
  fontSizeLevel?: number;
  onCycleFontSize?: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ 
    activeTab, 
    setActiveTab, 
    darkMode, 
    toggleDarkMode, 
    highContrast, 
    onToggleHighContrast, 
    onStartTour,
    fontSizeLevel = 1,
    onCycleFontSize
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = useMemo(() => [
    { id: 'feed', label: 'Mural', icon: ScrollText },
    { id: 'explore', label: 'Explorar', icon: Users },
    { id: 'parties', label: 'Gráficos', icon: BarChart3 },
  ], []);

  const handleTabClick = (id: string) => {
      setActiveTab(id);
      setIsMenuOpen(false);
  };

  const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
  };

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <>
        <div 
            className={`fixed inset-x-0 bottom-0 z-[60] bg-white/95 dark:bg-midnight/95 backdrop-blur-3xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-20px_60px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out border-t border-white/20 dark:border-white/10 ${isMenuOpen ? 'translate-y-0' : 'translate-y-[110%]'}`}
            style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }}
        >
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Menu & Acessibilidade</h3>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-100/50 dark:bg-white/10 rounded-full text-gray-500 dark:text-gray-300 backdrop-blur-md">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={toggleDarkMode}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 active:scale-95 transition-transform shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                    >
                        {darkMode ? <Sun size={24} className="text-yellow-500"/> : <Moon size={24} className="text-blue-600"/>}
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </button>

                    {onToggleHighContrast && (
                        <button 
                            onClick={onToggleHighContrast}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border active:scale-95 transition-transform shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm ${highContrast ? 'bg-black text-white border-black' : 'bg-white/40 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-white/40 dark:border-white/10'}`}
                        >
                            <Eye size={24} />
                            <span className="text-xs font-bold">Alto Contraste</span>
                        </button>
                    )}

                    {onCycleFontSize && (
                        <button 
                            onClick={onCycleFontSize}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 active:scale-95 transition-transform shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                        >
                            <Type size={24} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                Fonte: {fontSizeLevel === 1 ? 'Normal' : fontSizeLevel === 1.1 ? 'Grande' : 'Extra'}
                            </span>
                        </button>
                    )}

                    {onStartTour && (
                        <button 
                            onClick={() => { onStartTour(); setIsMenuOpen(false); }}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 active:scale-95 transition-transform shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                        >
                            <HelpCircle size={24} className="text-green-600 dark:text-green-400" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Tour Guiado</span>
                        </button>
                    )}
                </div>
            </div>
        </div>

        {isMenuOpen && (
            <div 
                className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMenuOpen(false)}
            />
        )}

        <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none pb-safe">
          <nav 
            className="pointer-events-auto bg-white/30 dark:bg-midnight/90 backdrop-blur-3xl flex p-1.5 rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/40 dark:border-white/10 relative w-full max-w-sm mx-auto transition-all duration-300"
            aria-label="Navegação Móvel"
          >
            {activeIndex !== -1 && !isMenuOpen && (
                <div 
                    className="absolute top-1.5 bottom-1.5 rounded-full bg-white/60 dark:bg-white/20 shadow-lg backdrop-blur-md transition-all duration-300 ease-out z-0 border border-white/40 dark:border-white/5"
                    style={{ 
                        width: `calc((100% - 0.75rem) / 4)`,
                        transform: `translateX(${activeIndex * 100}%)`,
                        left: '0.375rem' 
                    }}
                />
            )}

            {tabs.map((tab) => {
                const isActive = activeTab === tab.id && !isMenuOpen;
                return (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex-1 relative z-10 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 ${
                            isActive 
                            ? 'text-blue-700 dark:text-white drop-shadow-sm' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        aria-label={tab.label}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <tab.icon 
                            size={20} 
                            strokeWidth={isActive ? 2.5 : 2}
                            className="transition-transform duration-200 drop-shadow-sm"
                        />
                        <span className="text-[9px] font-bold leading-none drop-shadow-sm">{tab.label}</span>
                    </button>
                );
            })}

            <button
                onClick={toggleMenu}
                className={`flex-1 relative z-10 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 ${
                    isMenuOpen 
                    ? 'text-blue-700 dark:text-white bg-white/40 dark:bg-white/10' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                aria-label="Menu"
                aria-expanded={isMenuOpen}
            >
                <Menu 
                    size={20} 
                    strokeWidth={isMenuOpen ? 2.5 : 2}
                    className="transition-transform duration-200 drop-shadow-sm"
                />
                <span className="text-[9px] font-bold leading-none drop-shadow-sm">Menu</span>
            </button>

          </nav>
        </div>
    </>
  );
};

export default MobileNav;
