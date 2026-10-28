
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollText, Users, Menu, X, Sun, Moon, Eye, Type, HelpCircle, BookOpen, BarChart3, Plus, Minus } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const MobileNav: React.FC = () => {
  const { state, actions } = useAppContext();
  const { activeTab, darkMode, highContrast, fontSizeLevel } = state;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = useMemo(() => [
    { id: 'feed', label: 'Mural', icon: ScrollText },
    { id: 'explore', label: 'Políticos', icon: Users },
    { id: 'parties', label: 'Gráficos', icon: BarChart3 },
    { id: 'articles', label: 'Guia', icon: BookOpen },
  ], []);

  const handleTabClick = (id: string) => {
      actions.setActiveTab(id);
      setIsMenuOpen(false);
  };

  useEffect(() => {
      if (!isMenuOpen) return;
      const handleEscape = (event: KeyboardEvent) => {
          if (event.key === 'Escape') setIsMenuOpen(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
        {/* Expanded Overlay Menu */}
        <div 
            id="menu-movel"
            aria-hidden={!isMenuOpen}
            {...(!isMenuOpen ? ({ inert: '' } as Record<string, string>) : {})}
            className={`fixed inset-x-0 bottom-0 z-[60] glass-panel rounded-t-[2.5rem] transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-y-0' : 'translate-y-[110%]'}`}
            style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Configurações</h3>
                    <button type="button" onClick={() => setIsMenuOpen(false)} aria-label="Fechar configurações" className="p-2 bg-gray-100/50 dark:bg-white/10 rounded-full text-gray-500 dark:text-gray-300 backdrop-blur-md focus-visible:ring-4 focus-visible:ring-blue-500/40">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="h-px bg-gray-100 dark:bg-white/10 w-full"></div>

                {/* Settings Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        type="button"
                        onClick={actions.toggleDarkMode}
                        className="focus-visible:ring-4 focus-visible:ring-blue-500/40 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
                    >
                        {darkMode ? <Sun size={20} className="text-yellow-500" aria-hidden="true" /> : <Moon size={20} className="text-blue-600" aria-hidden="true" />}
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </button>

                    <button 
                        type="button"
                        onClick={actions.toggleHighContrast}
                        aria-pressed={highContrast}
                        className={`focus-visible:ring-4 focus-visible:ring-blue-500/40 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border active:scale-95 transition-transform ${highContrast ? 'bg-black text-white border-black' : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-white/5'}`}
                    >
                        <Eye size={20} aria-hidden="true" />
                        <span className="text-[10px] font-bold">Alto Contraste</span>
                    </button>

                    {/* Font Size Control - Full Width in Grid */}
                    <div className="col-span-2 flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <Type size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Tamanho da Fonte</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <button 
                                type="button"
                                onClick={actions.decreaseFontSize} 
                                disabled={fontSizeLevel <= 0.9}
                                aria-label="Diminuir fonte"
                                className="focus-visible:ring-4 focus-visible:ring-blue-500/40 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-white/10 rounded-lg disabled:opacity-30 active:scale-95 transition-all"
                             >
                                 <Minus size={16} aria-hidden="true" />
                             </button>
                             <span className="text-xs font-black w-10 text-center tabular-nums text-gray-800 dark:text-white">
                                 {Math.round(fontSizeLevel * 100)}%
                             </span>
                             <button 
                                type="button"
                                onClick={actions.increaseFontSize} 
                                disabled={fontSizeLevel >= 1.5}
                                aria-label="Aumentar fonte"
                                className="focus-visible:ring-4 focus-visible:ring-blue-500/40 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-white/10 rounded-lg disabled:opacity-30 active:scale-95 transition-all"
                             >
                                 <Plus size={16} aria-hidden="true" />
                             </button>
                        </div>
                    </div>

                    <button 
                        type="button"
                        onClick={() => { actions.setShowOnboarding(true); setIsMenuOpen(false); }}
                        className="focus-visible:ring-4 focus-visible:ring-blue-500/40 col-span-2 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
                    >
                        <HelpCircle size={20} className="text-green-600 dark:text-green-400" aria-hidden="true" />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Ajuda e Tutoriais</span>
                    </button>
                </div>
            </div>
        </div>

        {isMenuOpen && (
            <div 
                aria-hidden="true"
                className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMenuOpen(false)}
            />
        )}

        {/* BOTTOM NAV BAR */}
        <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none pb-safe">
                    <nav 
                        className="pointer-events-auto glass-surface flex items-center p-1.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.8)] relative w-full max-w-sm mx-auto transition-all duration-300"
                        aria-label="Navegação Móvel"
                    >
            {/* Standard Tabs Loop */}
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id && !isMenuOpen;
                
                return (
                    <button
                        key={tab.id}
                        type="button"
                        data-tour={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex-1 relative z-10 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                            isActive 
                            ? 'text-blue-700 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                        aria-label={tab.label}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <tab.icon 
                            size={20} 
                            strokeWidth={isActive ? 2.5 : 2}
                            className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                            aria-hidden="true"
                        />
                        <span className={`text-[9px] font-bold leading-none ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}

            {/* Menu Trigger */}
            <button
                type="button"
                onClick={toggleMenu}
                className={`flex-1 relative z-10 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                    isMenuOpen 
                    ? 'text-nuit dark:text-white' 
                    : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200'
                }`}
                aria-label={isMenuOpen ? "Fechar Menu" : "Abrir Menu"}
                aria-expanded={isMenuOpen}
                aria-controls="menu-movel"
            >
                {isMenuOpen ? (
                    <X size={20} strokeWidth={2.5} aria-hidden="true" />
                ) : (
                    <Menu size={20} strokeWidth={2} aria-hidden="true" />
                )}
                <span className={`text-[9px] font-bold leading-none ${isMenuOpen ? 'opacity-100' : 'opacity-70'}`}>
                    Menu
                </span>
            </button>

          </nav>
        </div>
    </>
  );
};

export default MobileNav;
