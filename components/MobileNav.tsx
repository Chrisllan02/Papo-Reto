
import React, { useMemo, useState } from 'react';
import { ScrollText, Users, Menu, X, Sun, Moon, Eye, Type, HelpCircle, BookOpen, BarChart3, MapPin } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { ESTADOS_BRASIL } from '../constants';

const MobileNav: React.FC = () => {
  const { state, actions } = useAppContext();
  const { activeTab, darkMode, highContrast, fontSizeLevel, userLocation } = state;
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

  const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
        {/* Expanded Overlay Menu */}
        <div 
            className={`fixed inset-x-0 bottom-0 z-[60] bg-white/95 dark:bg-midnight/95 backdrop-blur-3xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-20px_60px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out border-t border-white/20 dark:border-white/10 ${isMenuOpen ? 'translate-y-0' : 'translate-y-[110%]'}`}
            style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Acessibilidade & Ajustes</h3>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-100/50 dark:bg-white/10 rounded-full text-gray-500 dark:text-gray-300 backdrop-blur-md">
                        <X size={20} />
                    </button>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Location Selector */}
                    <div className="col-span-2 flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <MapPin size={20} className="text-blue-500" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Meu Estado</span>
                        </div>
                        <select 
                            value={userLocation}
                            onChange={(e) => actions.updateUserLocation(e.target.value)}
                            className="bg-transparent text-xs font-black text-blue-600 dark:text-blue-400 outline-none text-right"
                        >
                            <option value="">Brasil</option>
                            {ESTADOS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </div>

                    <button 
                        onClick={actions.toggleDarkMode}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
                    >
                        {darkMode ? <Sun size={20} className="text-yellow-500"/> : <Moon size={20} className="text-blue-600"/>}
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </button>

                    <button 
                        onClick={actions.toggleHighContrast}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border active:scale-95 transition-transform ${highContrast ? 'bg-black text-white border-black' : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-white/5'}`}
                    >
                        <Eye size={20} />
                        <span className="text-[10px] font-bold">Alto Contraste</span>
                    </button>

                    <button 
                        onClick={actions.cycleFontSize}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
                    >
                        <Type size={20} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                            Fonte: {fontSizeLevel === 1 ? '1x' : fontSizeLevel === 1.1 ? '1.1x' : '1.2x'}
                        </span>
                    </button>

                    <button 
                        onClick={() => { actions.setShowOnboarding(true); setIsMenuOpen(false); }}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
                    >
                        <HelpCircle size={20} className="text-green-600 dark:text-green-400" />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Ajuda</span>
                    </button>
                </div>
            </div>
        </div>

        {isMenuOpen && (
            <div 
                className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMenuOpen(false)}
            />
        )}

        {/* BOTTOM NAV BAR */}
        <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none pb-safe">
          <nav 
            className="pointer-events-auto bg-white/80 dark:bg-midnight/90 backdrop-blur-xl flex items-center p-1.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.8)] border border-white/40 dark:border-white/10 relative w-full max-w-sm mx-auto transition-all duration-300"
            aria-label="Navegação Móvel"
          >
            {/* Standard Tabs Loop */}
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id && !isMenuOpen;
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex-1 relative z-10 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 ${
                            isActive 
                            ? 'text-blue-700 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                        aria-label={tab.label}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <tab.icon 
                            size={20} 
                            strokeWidth={isActive ? 2.5 : 2}
                            className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                        />
                        <span className={`text-[9px] font-bold leading-none ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}

            {/* Menu Trigger */}
            <button
                onClick={toggleMenu}
                className={`flex-1 relative z-10 flex flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors duration-200 ${
                    isMenuOpen 
                    ? 'text-nuit dark:text-white' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-label={isMenuOpen ? "Fechar Menu" : "Abrir Menu"}
                aria-expanded={isMenuOpen}
            >
                {isMenuOpen ? (
                    <X size={20} strokeWidth={2.5} />
                ) : (
                    <Menu size={20} strokeWidth={2} />
                )}
                <span className={`text-[9px] font-bold leading-none ${isMenuOpen ? 'opacity-100' : 'opacity-70'}`}>
                    Opções
                </span>
            </button>

          </nav>
        </div>
    </>
  );
};

export default MobileNav;
