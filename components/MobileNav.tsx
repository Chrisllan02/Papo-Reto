
import React from 'react';
import { ScrollText, Users, BrainCircuit, BarChart3, BookOpen } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  goToMatch: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, goToMatch }) => (
  <nav className="md:hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 pb-safe pt-2 px-2 flex justify-between items-end z-50 h-[88px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] fixed bottom-0 w-full rounded-t-[2.5rem] transition-colors">
    
    <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1.5 pb-6 transition-transform active:scale-95 flex-1 ${activeTab === 'feed' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
      <ScrollText size={24} strokeWidth={activeTab === 'feed' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Mural</span>
    </button>

    <button onClick={() => setActiveTab('articles')} className={`flex flex-col items-center gap-1.5 pb-6 transition-transform active:scale-95 flex-1 ${activeTab === 'articles' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
      <BookOpen size={24} strokeWidth={activeTab === 'articles' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Guia</span>
    </button>
    
    <button onClick={goToMatch} className="mb-8 bg-gradient-to-br from-green-500 to-green-700 text-white p-4 rounded-full shadow-xl shadow-green-500/30 dark:shadow-green-900/30 transform hover:scale-105 transition-transform active:scale-95 border-[4px] border-white dark:border-gray-900 ring-4 ring-transparent hover:ring-green-100 dark:hover:ring-green-900/20 z-10 mx-1">
      <BrainCircuit size={28} className="text-yellow-300" />
    </button>

    <button onClick={() => setActiveTab('parties')} className={`flex flex-col items-center gap-1.5 pb-6 transition-transform active:scale-95 flex-1 ${activeTab === 'parties' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
      <BarChart3 size={24} strokeWidth={activeTab === 'parties' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Gráficos</span>
    </button>

    <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-1.5 pb-6 transition-transform active:scale-95 flex-1 ${activeTab === 'explore' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
      <Users size={24} strokeWidth={activeTab === 'explore' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Políticos</span>
    </button>
  </nav>
);

export default MobileNav;
