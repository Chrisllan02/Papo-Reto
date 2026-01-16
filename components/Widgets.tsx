
import React, { useMemo } from 'react';
import { Search, Database } from 'lucide-react';
import { Politician } from '../types';

interface WidgetsProps {
  politicians: Politician[];
  onSelectCandidate: (pol: Politician) => void;
}

const DesktopWidgets: React.FC<WidgetsProps> = ({ politicians, onSelectCandidate }) => {
  const stats = useMemo(() => {
      const parties = new Set(politicians.map(p => p.party)).size;
      const states = new Set(politicians.map(p => p.state)).size;
      return { total: politicians.length, parties, states };
  }, [politicians]);

  return (
    <div className="space-y-6">
      
      {/* Busca Rápida */}
      <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
          </div>
          <input 
              type="text"
              placeholder="Buscar no PapoReto"
              className="block w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:bg-white dark:focus:bg-black transition-all"
          />
      </div>

      {/* Resumo de Dados (Substitui Social) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Database size={18} className="text-green-600"/>
              Base de Dados
          </h3>
          
          <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Parlamentares</span>
                  <span className="font-black text-gray-900 dark:text-white text-lg">{stats.total}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Partidos</span>
                  <span className="font-black text-gray-900 dark:text-white text-lg">{stats.parties}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Estados</span>
                  <span className="font-black text-gray-900 dark:text-white text-lg">{stats.states}</span>
              </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
              <p className="text-[10px] text-gray-400 font-medium">
                  Monitoramento em tempo real das atividades legislativas e gastos públicos.
              </p>
          </div>
      </div>

    </div>
  );
};

export default DesktopWidgets;
