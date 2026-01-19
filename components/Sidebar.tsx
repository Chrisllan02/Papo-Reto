
import React from 'react';
import { MessageCircle, ScrollText, Users, BrainCircuit, Sun, Moon, BarChart3, BookOpen } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  goToMatch: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onShowData?: () => void; 
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, goToMatch, darkMode, toggleDarkMode, onShowData }) => {
  
  const NavItem = ({ id, icon: Icon, label, onClick, isActive, colorClass = "bg-gradient-to-r from-blue-600 to-blue-800" }: any) => (
      <button 
        data-tour={id}
        onClick={onClick ? onClick : () => setActiveTab(id)}
        className={`group relative flex items-center xl:justify-start justify-center gap-4 p-3.5 xl:px-6 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none w-full
          ${isActive 
            ? 'text-white shadow-lg shadow-blue-500/30' 
            : 'text-blue-800 dark:text-blue-300 hover:bg-white/50 dark:hover:bg-white/10'
          }`}
      >
        {/* Background Ativo */}
        {isActive && (
            <div className={`absolute inset-0 ${colorClass} rounded-full opacity-100 transition-opacity duration-500`}></div>
        )}

        {/* Ícone */}
        <div className={`relative z-10 p-1 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : ''}`}>
           <Icon size={26} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        
        {/* Texto */}
        <span className={`relative z-10 hidden xl:block text-lg tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
            {label}
        </span>
      </button>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Top Section: Logo & Navigation */}
      <div className="flex-1 space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center xl:justify-start px-2">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('feed')}>
                <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-800 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-500 border-2 border-white/20">
                    <MessageCircle size={24} fill="white" className="text-white" />
                </div>
                <span className="hidden xl:block font-black text-2xl tracking-tighter text-blue-900 dark:text-white">
                    Papo<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">Reto</span>
                </span>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-3 items-center xl:items-start w-full">
          <NavItem id="feed" icon={ScrollText} label="Mural" isActive={activeTab === 'feed'} />
          <NavItem id="articles" icon={BookOpen} label="Guia Cidadão" isActive={activeTab === 'articles'} />
          <NavItem id="explore" icon={Users} label="Políticos" isActive={activeTab === 'explore'} />
          <NavItem id="parties" icon={BarChart3} label="Gráficos" isActive={activeTab === 'parties'} />
          <NavItem 
            id="match" 
            icon={BrainCircuit} 
            label="Testar Afinidade" 
            isActive={activeTab === 'match'} 
            onClick={goToMatch}
          />
        </nav>
      </div>

      {/* Bottom Section: Settings & Footer Info */}
      <div className="space-y-4 mt-auto pt-4">
         <button 
            onClick={toggleDarkMode}
            className="flex items-center xl:justify-start justify-center gap-4 p-3.5 rounded-full text-blue-700 dark:text-blue-300 bg-white/30 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-white/10 backdrop-blur-sm transition-all duration-300 w-full group border border-white/20"
         >
            <div className="relative group-hover:rotate-12 transition-transform duration-500">
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </div>
            <span className="hidden xl:block text-base font-medium">
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
            </span>
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
