
import React from 'react';
import { MessageCircle, ScrollText, Users, BrainCircuit, Sun, Moon, BarChart3, ShieldCheck, Database, BookOpen } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  goToMatch: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onShowData?: () => void; // New Prop
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, goToMatch, darkMode, toggleDarkMode, onShowData }) => {
  
  const NavItem = ({ id, icon: Icon, label, onClick, isActive, colorClass = "bg-gradient-to-r from-green-600 to-blue-600" }: any) => (
      <button 
        onClick={onClick ? onClick : () => setActiveTab(id)}
        className={`group relative flex items-center xl:justify-start justify-center gap-4 p-3.5 xl:px-6 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none w-full
          ${isActive 
            ? 'text-white shadow-lg shadow-green-500/30' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
          }`}
      >
        {/* Background Ativo */}
        {isActive && (
            <div className={`absolute inset-0 ${colorClass} rounded-full opacity-100 transition-opacity duration-500`}></div>
        )}

        {/* Ícone */}
        <div className={`relative z-10 p-1 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-yellow-300' : ''}`}>
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
                <div className="w-12 h-12 bg-gradient-to-tr from-green-500 to-blue-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-105 transition-transform duration-500 border-2 border-white/20">
                    <MessageCircle size={24} fill="white" className="text-white" />
                </div>
                <span className="hidden xl:block font-black text-2xl tracking-tighter text-gray-900 dark:text-white">
                    Papo<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-yellow-500">Reto</span>
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
            // colorClass removida para usar o padrão verde/azul
          />
        </nav>
      </div>

      {/* Bottom Section: Settings & Footer Info */}
      <div className="space-y-4 mt-auto pt-4">
         <button 
            onClick={toggleDarkMode}
            className="flex items-center xl:justify-start justify-center gap-4 p-3.5 rounded-full text-gray-500 dark:text-gray-400 bg-white/30 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-white/10 backdrop-blur-sm transition-all duration-300 w-full group border border-white/20"
         >
            <div className="relative group-hover:rotate-12 transition-transform duration-500">
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </div>
            <span className="hidden xl:block text-base font-medium">
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
            </span>
         </button>

         {/* Dados Verificados Card */}
         <button 
            onClick={onShowData}
            className="hidden xl:block w-full text-left bg-white/40 dark:bg-black/40 backdrop-blur-xl p-5 rounded-[2rem] border border-white/40 dark:border-white/10 shadow-sm transition-all hover:bg-white/70 dark:hover:bg-black/60 hover:shadow-lg group"
         >
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold uppercase tracking-wider text-[10px] mb-2">
               <ShieldCheck size={14} /> Dados Verificados
            </div>
            <p className="text-[10px] leading-relaxed text-gray-500 dark:text-gray-400 font-medium group-hover:text-gray-800 dark:group-hover:text-white transition-colors">
                Entenda nossas fontes e a cobertura do app.
            </p>
            <div className="pt-2 mt-2 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 opacity-70 font-bold">© PapoReto</span>
                <Database size={12} className="text-gray-400"/>
            </div>
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
