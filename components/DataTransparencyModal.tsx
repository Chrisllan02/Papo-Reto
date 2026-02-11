
import React from 'react';
import { X, Database, CheckCircle2, Server, Building2, Scale } from 'lucide-react';

interface DataTransparencyModalProps {
  onClose: () => void;
}

const DataTransparencyModal: React.FC<DataTransparencyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
    <div className="glass-panel rounded-[2.5rem] w-full max-w-2xl relative flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center glass-surface shrink-0">
            <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                   <Database size={24} className="text-blue-600" /> Raio-X dos Dados
                </h3>
                <p className="text-xs font-bold text-subtle uppercase tracking-widest mt-1">Transparência Radical</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full text-muted hover:text-red-500 transition-colors">
                <X size={20}/>
            </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-8">
            
            {/* Intro */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm md:text-base text-blue-900 dark:text-blue-300 font-medium leading-relaxed">
                    O <strong>PapoReto</strong> conecta você diretamente às fontes oficiais do governo em tempo real. Não criamos dados, apenas traduzimos o que é público.
                </p>
            </div>

            {/* O que temos vs O que não temos */}
            <div className="space-y-4">
                <h4 className="flex items-center gap-2 font-black text-green-600 uppercase text-xs tracking-wider border-b border-green-100 dark:border-green-900/30 pb-2">
                    <CheckCircle2 size={16}/> Monitoramento Ativo (API Oficial)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-sm font-bold text-muted-strong bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                        <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center font-black text-sm">513</span>
                        Deputados Federais
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-muted-strong bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                        <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center font-black text-sm">81</span>
                        Senadores da República
                    </div>
                </div>
            </div>

            <div className="text-xs text-subtle italic">
                * Monitoramos exclusivamente o Poder Legislativo Federal, onde há disponibilidade de APIs abertas e padronizadas para consulta de gastos, presença e votações.
            </div>

            {/* Fontes Oficiais */}
            <div>
                <h4 className="flex items-center gap-2 font-black text-gray-900 dark:text-white uppercase text-xs tracking-wider mb-4">
                    <Server size={16}/> Nossas Fontes de Verdade
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a href="https://dadosabertos.camara.leg.br/" target="_blank" className="flex items-center gap-3 p-4 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                        <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Building2 size={20}/></div>
                        <div>
                            <p className="font-bold text-xs uppercase text-subtle">Legislativo</p>
                            <p className="font-bold text-sm text-gray-900 dark:text-white">API Câmara & Senado</p>
                        </div>
                    </a>
                    <div className="flex items-center gap-3 p-4 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="w-10 h-10 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center"><Scale size={20}/></div>
                        <div>
                            <p className="font-bold text-xs uppercase text-subtle">Patrimônio</p>
                            <p className="font-bold text-sm text-gray-900 dark:text-white">TSE (DivulgaCand)</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default DataTransparencyModal;
