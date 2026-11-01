
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollText, Users, Menu, X, Sun, Moon, Eye, Type, HelpCircle, BookOpen, BarChart3, Plus, Minus } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useDialog } from '../hooks/useDialog';

const MobileNav: React.FC = () => {
  const { state, actions } = useAppContext();
  const { activeTab, darkMode, highContrast, fontSizeLevel } = state;
  const isDarkModeOn = darkMode && !highContrast;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      if (menuRef.current) (menuRef.current as HTMLDivElement & { inert: boolean }).inert = !isMenuOpen;
  }, [isMenuOpen]);

  useDialog(menuRef, { onClose: () => setIsMenuOpen(false), active: isMenuOpen });

  const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
        <div 
            id="menu-movel"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-movel-titulo"
            aria-hidden={!isMenuOpen}
            className={`fixed inset-x-0 bottom-0 z-[60] glass-panel rounded-t-3xl transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-y-0' : 'translate-y-[110%]'}`}
            style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 id="menu-movel-titulo" className="text-lg font-black text-midnight dark:text-white">Configurações</h3>
                    <button type="button" onClick={() => setIsMenuOpen(false)} aria-label="Fechar configurações" className="w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-white/10 rounded-full text-muted-strong focus-visible:ring-4 focus-visible:ring-blue-500/40">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="h-px bg-slate-200/70 dark:bg-white/10 w-full"></div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        type="button"
                        onClick={highContrast ? undefined : actions.toggleDarkMode}
                        aria-disabled={highContrast}
                        aria-describedby={highContrast ? 'menu-modo-escuro-motivo' : undefined}
                        className="focus-visible:ring-4 focus-visible:ring-blue-500/40 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-colors aria-disabled:cursor-not-allowed"
                    >
                        {isDarkModeOn ? <Sun size={20} className="text-yellow-700" aria-hidden="true" /> : <Moon size={20} className="text-blue-700" aria-hidden="true" />}
                        <span className="text-xs font-semibold text-muted-strong">{isDarkModeOn ? 'Modo claro' : 'Modo escuro'}</span>
                        {highContrast && <span id="menu-modo-escuro-motivo" className="text-xs text-muted-strong">Indisponível com o alto contraste</span>}
                    </button>

                    <button 
                        type="button"
                        onClick={actions.toggleHighContrast}
                        aria-pressed={highContrast}
                        className={`focus-visible:ring-4 focus-visible:ring-blue-500/40 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border active:scale-[0.98] transition-colors ${highContrast ? 'bg-black text-white border-black' : 'bg-white/60 dark:bg-white/5 text-muted-strong border-slate-200/70 dark:border-white/10'}`}
                    >
                        <Eye size={20} aria-hidden="true" />
                        <span className="text-xs font-semibold">Alto contraste</span>
                    </button>

                    <div className="col-span-2 flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <Type size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                            <span className="text-xs font-semibold text-muted-strong">Tamanho da fonte</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <button 
                                type="button"
                                onClick={actions.decreaseFontSize} 
                                disabled={fontSizeLevel <= 0.9}
                                aria-label="Diminuir fonte"
                                className="focus-visible:ring-4 focus-visible:ring-blue-500/40 w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-white/10 rounded-lg disabled:opacity-40 active:scale-[0.98] transition-colors"
                             >
                                 <Minus size={16} aria-hidden="true" />
                             </button>
                             <span className="text-xs font-black w-10 text-center tabular-nums text-midnight dark:text-white">
                                 {Math.round(fontSizeLevel * 100)}%
                             </span>
                             <button 
                                type="button"
                                onClick={actions.increaseFontSize} 
                                disabled={fontSizeLevel >= 1.5}
                                aria-label="Aumentar fonte"
                                className="focus-visible:ring-4 focus-visible:ring-blue-500/40 w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-white/10 rounded-lg disabled:opacity-40 active:scale-[0.98] transition-colors"
                             >
                                 <Plus size={16} aria-hidden="true" />
                             </button>
                        </div>
                    </div>

                    <button 
                        type="button"
                        onClick={() => { actions.setShowOnboarding(true); setIsMenuOpen(false); }}
                        className="focus-visible:ring-4 focus-visible:ring-blue-500/40 col-span-2 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-colors"
                    >
                        <HelpCircle size={20} className="text-green-600 dark:text-green-400" aria-hidden="true" />
                        <span className="text-xs font-semibold text-muted-strong">Ajuda e tutoriais</span>
                    </button>
                </div>
            </div>
        </div>

        {isMenuOpen && (
            <div 
                aria-hidden="true"
                className="fixed inset-0 z-[55] bg-black/60 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
            />
        )}

        <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none pb-safe">
                    <nav 
                        className="pointer-events-auto glass-surface flex items-center p-1.5 rounded-full shadow-md relative w-full max-w-sm mx-auto transition-all duration-300"
                        aria-label="Navegação Móvel"
                    >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id && !isMenuOpen;
                
                return (
                    <button
                        key={tab.id}
                        type="button"
                        data-tour={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex-1 relative z-10 min-h-11 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                            isActive 
                            ? 'text-blue-700 dark:text-white' 
                            : 'text-subtle hover:text-midnight dark:hover:text-white'
                        }`}
                        aria-label={tab.label}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <tab.icon 
                            size={20} 
                            strokeWidth={isActive ? 2.5 : 2}
                            aria-hidden="true"
                        />
                        <span className="text-xs font-semibold leading-none">
                            {tab.label}
                        </span>
                    </button>
                );
            })}

            <button
                type="button"
                onClick={toggleMenu}
                className={`flex-1 relative z-10 min-h-11 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                    isMenuOpen 
                    ? 'text-nuit dark:text-white' 
                    : 'text-subtle hover:text-midnight dark:hover:text-white'
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
                <span className="text-xs font-semibold leading-none">
                    Menu
                </span>
            </button>

          </nav>
        </div>
    </>
  );
};

export default MobileNav;
