
import React, { useState } from 'react';
import { MessageCircle, ScrollText, Users, Sun, Moon, BarChart3, BookOpen, HelpCircle, Eye, Type, Settings, ChevronRight, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onShowData?: () => void;
  onStartTour?: () => void;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  fontSizeLevel?: number;
  onCycleFontSize?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, darkMode, toggleDarkMode, onShowData, onStartTour, highContrast, onToggleHighContrast, fontSizeLevel = 1, onCycleFontSize }) => {
  const [showAccessMenu, setShowAccessMenu] = useState(false);

  const NavItem = ({ id, icon: Icon, label, onClick, isActive, colorClass = "bg-gradient-to-r from-nuit to-midnight" }: any) => (
      <button 
        data-tour={id}
        onClick={onClick ? onClick : () => setActiveTab(id)}
        aria-current={isActive ? 'page' : undefined}
        aria-label={label}
        className={`group relative flex items-center xl:justify-start justify-center gap-4 p-3.5 xl:px-6 rounded-full transition-all duration-300 ease-out outline-none w-full
          ${isActive 
            ? 'text-white shadow-lg shadow-nuit/30 scale-105 backdrop-blur-md dark:shadow-[0_0_30px_rgba(30,72,143,0.6)]' 
            : 'text-midnight dark:text-blue-200 hover:bg-white/40 dark:hover:bg-white/10 hover:backdrop-blur-sm active:scale-95'
          }`}
      >
        {isActive && (
            <div className={`absolute inset-0 ${colorClass} rounded-full opacity-100 transition-opacity duration-500`}></div>
        )}
        <div className={`relative z-10 p-1 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : ''}`}>
           <Icon size={26} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
        </div>
        <span className={`relative z-10 hidden xl:block text-lg tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
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
                onClick={() => setActiveTab('feed')}
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
          <NavItem id="feed" icon={ScrollText} label="Mural" isActive={activeTab === 'feed'} />
          <NavItem id="explore" icon={Users} label="Políticos" isActive={activeTab === 'explore'} />
          <NavItem id="parties" icon={BarChart3} label="Gráficos" isActive={activeTab === 'parties'} colorClass="bg-gradient-to-r from-spring to-yellow-600" />
          <NavItem id="articles" icon={BookOpen} label="Guia Cidadão" isActive={activeTab === 'articles'} colorClass="bg-gradient-to-r from-picture to-green-900" />
        </div>
      </div>

      <div className="mt-auto pt-4 relative">
         <button 
            onClick={() => setShowAccessMenu(!showAccessMenu)}
            className={`flex items-center xl:justify-start justify-center gap-4 p-3.5 rounded-full backdrop-blur-sm transition-all duration-300 w-full group border border-white/20 active:scale-95 ${showAccessMenu ? 'bg-white text-black shadow-lg dark:bg-midnight dark:text-white dark:border-white/20 dark:shadow-[0_0_30px_rgba(0,0,0,0.8)]' : 'text-nuit dark:text-blue-300 bg-white/20 dark:bg-black/40 hover:bg-white/40 dark:hover:bg-white/10'}`}
            aria-label="Menu de Acessibilidade"
            aria-expanded={showAccessMenu}
         >
            {showAccessMenu ? <X size={24}/> : <Settings size={24} />}
            <span className="hidden xl:block text-base font-medium">Acessibilidade</span>
         </button>

         {showAccessMenu && (
             <div className="absolute bottom-full left-0 right-0 mb-3 bg-white/95 dark:bg-midnight/95 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-[1.5rem] shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.9)] p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in z-50">
                 <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
                     <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Ajustes</span>
                 </div>
                 
                 {onCycleFontSize && (
                     <button onClick={onCycleFontSize} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors w-full text-left">
                         <div className="flex items-center gap-3">
                             <Type size={18} className="text-nuit dark:text-blue-400"/>
                             <span className="text-sm font-bold text-gray-800 dark:text-white">Tamanho da Fonte</span>
                         </div>
                         <span className="text-[10px] font-black bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                             {fontSizeLevel === 1 ? '1x' : fontSizeLevel === 1.1 ? '1.1x' : '1.25x'}
                         </span>
                     </button>
                 )}

                 {onToggleHighContrast && (
                     <button onClick={onToggleHighContrast} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors w-full text-left">
                         <div className="flex items-center gap-3">
                             <Eye size={18} className="text-nuit dark:text-blue-400"/>
                             <span className="text-sm font-bold text-gray-800 dark:text-white">Alto Contraste</span>
                         </div>
                         <div className={`w-8 h-4 rounded-full relative transition-colors ${highContrast ? 'bg-nuit' : 'bg-gray-300 dark:bg-white/20'}`}>
                             <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${highContrast ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{left: highContrast ? 'auto' : '2px', right: highContrast ? '2px' : 'auto'}}></div>
                         </div>
                     </button>
                 )}

                 <button onClick={toggleDarkMode} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors w-full text-left">
                     <div className="flex items-center gap-3">
                         {darkMode ? <Moon size={18} className="text-nuit dark:text-blue-400"/> : <Sun size={18} className="text-orange-500"/>}
                         <span className="text-sm font-bold text-gray-800 dark:text-white">Modo Escuro</span>
                     </div>
                     <div className={`w-8 h-4 rounded-full relative transition-colors ${darkMode ? 'bg-nuit' : 'bg-gray-300 dark:bg-white/20'}`}>
                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{left: darkMode ? 'auto' : '2px', right: darkMode ? '2px' : 'auto'}}></div>
                     </div>
                 </button>

                 {onStartTour && (
                     <button onClick={() => { onStartTour(); setShowAccessMenu(false); }} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors w-full text-left mt-1">
                         <div className="flex items-center gap-3">
                             <HelpCircle size={18} className="text-nuit dark:text-blue-400"/>
                             <span className="text-sm font-bold text-midnight dark:text-blue-100">Iniciar Tour Guiado</span>
                         </div>
                         <ChevronRight size={14} className="text-blue-400"/>
                     </button>
                 )}
             </div>
         )}
      </div>
    </nav>
  );
};

export default Sidebar;
