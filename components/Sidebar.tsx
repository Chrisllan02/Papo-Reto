
import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, ScrollText, Users, Sun, Moon, BarChart3, BookOpen, HelpCircle, Eye, Type, Settings, ChevronRight, X, MapPin, LocateFixed, Loader2, Plus, Minus } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { ESTADOS_BRASIL } from '../constants';

const Sidebar: React.FC = () => {
  const { state, actions } = useAppContext();
  const { activeTab, darkMode, highContrast, fontSizeLevel, userLocation, isLocating } = state;
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const accessMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
      if (!showAccessMenu) return;
      const handleClickOutside = (event: MouseEvent) => {
          if (!accessMenuRef.current) return;
          if (!accessMenuRef.current.contains(event.target as Node)) {
              setShowAccessMenu(false);
          }
      };
      const handleEscape = (event: KeyboardEvent) => {
          if (event.key === 'Escape') setShowAccessMenu(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('keydown', handleEscape);
      };
  }, [showAccessMenu]);

  const NavItem = ({ id, icon: Icon, label, colorClass = "bg-gradient-to-r from-nuit to-midnight" }: any) => (
      <button 
        data-tour={id}
        onClick={() => actions.setActiveTab(id)}
        aria-current={activeTab === id ? 'page' : undefined}
        aria-label={label}
        className={`group relative flex items-center xl:justify-start justify-center gap-4 p-3.5 xl:px-6 rounded-full transition-all duration-300 ease-out outline-none w-full
          ${activeTab === id 
            ? 'text-white shadow-lg shadow-nuit/30 scale-105 backdrop-blur-md dark:shadow-[0_0_30px_rgba(30,72,143,0.6)]' 
            : 'text-midnight dark:text-blue-200 hover:bg-white/40 dark:hover:bg-white/10 hover:backdrop-blur-sm active:scale-95'
          }`}
      >
        {activeTab === id && (
            <div className={`absolute inset-0 ${colorClass} rounded-full opacity-100 transition-opacity duration-500`}></div>
        )}
        <div className={`relative z-10 p-1 transition-transform duration-300 group-hover:scale-110 ${activeTab === id ? 'text-white' : ''}`}>
           <Icon size={26} strokeWidth={activeTab === id ? 2.5 : 2} aria-hidden="true" />
        </div>
        <span className={`relative z-10 hidden xl:block text-lg tracking-tight ${activeTab === id ? 'font-bold' : 'font-medium'}`}>
            {label}
        </span>
        
        {/* Tooltip */}
        <span className="absolute left-full ml-3 px-3 py-1.5 bg-midnight dark:bg-white text-white dark:text-midnight text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-xl xl:hidden whitespace-nowrap z-50 border border-white/10 scale-95 group-hover:scale-100 origin-left">
            {label}
        </span>
      </button>
  );

  return (
    <nav className="h-full flex flex-col" aria-label="Menu Principal">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-center xl:justify-start px-2">
            <button 
                className="flex items-center gap-3 cursor-pointer group outline-none active:scale-95 transition-transform" 
                onClick={() => actions.setActiveTab('feed')}
                aria-label="Voltar para o Mural"
            >
                <div className="w-12 h-12 bg-gradient-to-tr from-nuit to-midnight rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-nuit/30 group-hover:shadow-nuit/50 dark:shadow-[0_0_20px_rgba(30,72,143,0.8)] transition-all duration-500 border-2 border-white/20">
                    <MessageCircle size={24} fill="white" className="text-white" aria-hidden="true" />
                </div>
                <span className="hidden xl:block font-black text-2xl tracking-tighter text-midnight dark:text-white drop-shadow-md">
                    Papo<span className="text-transparent bg-clip-text bg-gradient-to-r from-nuit to-blue-400">Reto</span>
                </span>
            </button>
        </div>

        <div className="flex flex-col gap-3 items-center xl:items-start w-full">
          <NavItem id="feed" icon={ScrollText} label="Mural" />
          <NavItem id="explore" icon={Users} label="Políticos" />
          <NavItem id="parties" icon={BarChart3} label="Gráficos" colorClass="bg-gradient-to-r from-blue-500 to-blue-600" />
          <NavItem id="articles" icon={BookOpen} label="Guia Cidadão" colorClass="bg-gradient-to-r from-picture to-green-900" />
        </div>
      </div>

      <div className="mt-auto pt-4 relative">
         <button 
            onClick={() => setShowAccessMenu(!showAccessMenu)}
            className={`flex items-center xl:justify-start justify-center gap-4 p-3.5 rounded-full backdrop-blur-sm transition-all duration-300 w-full group relative border border-white/20 active:scale-95 ${showAccessMenu ? 'bg-white text-black shadow-lg dark:bg-midnight dark:text-white dark:border-white/20 dark:shadow-[0_0_30px_rgba(0,0,0,0.8)]' : 'text-nuit dark:text-blue-300 bg-white/20 dark:bg-black/40 hover:bg-white/40 dark:hover:bg-white/10'}`}
            aria-label="Menu de Acessibilidade"
            aria-expanded={showAccessMenu}
         >
            {showAccessMenu ? <X size={24}/> : <Settings size={24} />}
            <span className="hidden xl:block text-base font-medium">Acessibilidade</span>
            
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-midnight dark:bg-white text-white dark:text-midnight text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-xl xl:hidden whitespace-nowrap z-50 border border-white/10 scale-95 group-hover:scale-100 origin-left">
                Acessibilidade
            </span>
         </button>

         {showAccessMenu && (
             <div ref={accessMenuRef} className="absolute bottom-full left-0 right-0 mb-3 glass-panel rounded-[1.5rem] p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in z-50 max-h-[70vh] overflow-y-auto overflow-x-hidden overscroll-contain">
                 <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
                     <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Ajustes</span>
                 </div>
                 
                 {/* Seletor de Localização + GPS */}
                 <div className="flex items-center gap-2 w-full">
                     <div className="flex-1 min-w-0 flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                         <div className="flex items-center gap-2">
                             <MapPin size={16} className="text-nuit dark:text-blue-400"/>
                             <span className="text-xs font-bold text-gray-800 dark:text-white">Estado</span>
                         </div>
                         <select 
                            value={userLocation}
                            onChange={(e) => { actions.updateUserLocation(e.target.value); setShowAccessMenu(false); }}
                            className="bg-transparent text-gray-700 dark:text-gray-200 text-xs font-bold outline-none border-none cursor-pointer text-right w-14 max-w-[4rem] truncate"
                         >
                            <option value="">BR</option>
                            {ESTADOS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                         </select>
                     </div>
                     <button 
                                onClick={() => { actions.detectLocation(); setShowAccessMenu(false); }}
                        disabled={isLocating}
                        className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title="Detectar localização atual"
                     >
                        {isLocating ? <Loader2 size={16} className="animate-spin"/> : <LocateFixed size={16}/>}
                     </button>
                 </div>

                 {/* Controle de Fonte Melhorado */}
                 <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full">
                     <div className="flex items-center gap-3">
                         <Type size={18} className="text-nuit dark:text-blue-400"/>
                         <span className="text-sm font-bold text-gray-800 dark:text-white">Fonte</span>
                     </div>
                     <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1">
                         <button 
                            onClick={actions.decreaseFontSize} 
                            disabled={fontSizeLevel <= 0.9}
                            className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-all"
                            aria-label="Diminuir Fonte"
                         >
                             <Minus size={14} />
                         </button>
                         <span className="text-[10px] font-black w-8 text-center tabular-nums text-gray-600 dark:text-gray-300">
                             {Math.round(fontSizeLevel * 100)}%
                         </span>
                         <button 
                            onClick={actions.increaseFontSize} 
                            disabled={fontSizeLevel >= 1.5}
                            className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-all"
                            aria-label="Aumentar Fonte"
                         >
                             <Plus size={14} />
                         </button>
                     </div>
                 </div>

                 <button onClick={actions.toggleHighContrast} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors w-full text-left">
                     <div className="flex items-center gap-3">
                         <Eye size={18} className="text-nuit dark:text-blue-400"/>
                         <span className="text-sm font-bold text-gray-800 dark:text-white">Alto Contraste</span>
                     </div>
                     <div className={`w-8 h-4 rounded-full relative transition-colors ${highContrast ? 'bg-nuit' : 'bg-gray-300 dark:bg-white/20'}`}>
                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${highContrast ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{left: highContrast ? 'auto' : '2px', right: highContrast ? '2px' : 'auto'}}></div>
                     </div>
                 </button>

                 <button onClick={actions.toggleDarkMode} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors w-full text-left">
                     <div className="flex items-center gap-3">
                         {darkMode ? <Moon size={18} className="text-nuit dark:text-blue-400"/> : <Sun size={18} className="text-orange-500"/>}
                         <span className="text-sm font-bold text-gray-800 dark:text-white">Modo Escuro</span>
                     </div>
                     <div className={`w-8 h-4 rounded-full relative transition-colors ${darkMode ? 'bg-nuit' : 'bg-gray-300 dark:bg-white/20'}`}>
                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{left: darkMode ? 'auto' : '2px', right: darkMode ? '2px' : 'auto'}}></div>
                     </div>
                 </button>

                 <button onClick={() => { actions.setShowOnboarding(true); setShowAccessMenu(false); }} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors w-full text-left mt-1">
                     <div className="flex items-center gap-3">
                         <HelpCircle size={18} className="text-nuit dark:text-blue-400"/>
                         <span className="text-sm font-bold text-midnight dark:text-blue-100">Iniciar Tour Guiado</span>
                     </div>
                     <ChevronRight size={14} className="text-blue-400"/>
                 </button>
             </div>
         )}
      </div>
    </nav>
  );
};

export default Sidebar;
