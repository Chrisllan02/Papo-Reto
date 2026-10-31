
import React, { useMemo } from 'react';
import Modal from './Modal';
import { useAppContext } from '../contexts/AppContext';
import { X, Database, CheckCircle2, Server, Building2, Scale } from 'lucide-react';

interface DataTransparencyModalProps {
  onClose: () => void;
}

const DataTransparencyModal: React.FC<DataTransparencyModalProps> = ({ onClose }) => {
  const { state: { politicians } } = useAppContext();
  const counts = useMemo(() => ({
    deputies: politicians.filter(pol => pol.role?.startsWith('Deputad')).length,
    senators: politicians.filter(pol => pol.role?.startsWith('Senador')).length,
  }), [politicians]);

  return (
    <Modal onClose={onClose} labelledBy="transparencia-titulo" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
    <div className="glass-panel rounded-3xl w-full max-w-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200/70 dark:border-white/10 flex justify-between items-center glass-surface shrink-0">
            <div>
                <h3 id="transparencia-titulo" className="text-xl font-black text-midnight dark:text-white flex items-center gap-2">
                   <Database size={24} className="text-blue-700 dark:text-blue-300" aria-hidden="true" /> Raio-X dos dados
                </h3>
                <p className="text-xs font-medium text-subtle mt-1">Transparência radical</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-muted-strong hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40">
                <X size={20} aria-hidden="true" />
            </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 md:p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm md:text-base text-blue-900 dark:text-blue-300 font-medium leading-relaxed">
                    O <strong>PapoReto</strong> conecta você às fontes oficiais do governo, com dados atualizados diariamente. Não criamos dados, apenas traduzimos o que é público.
                </p>
            </div>

            <div className="space-y-4">
                <h4 className="flex items-center gap-2 font-semibold text-green-800 dark:text-green-300 text-sm border-b border-green-100 dark:border-green-900/30 pb-2">
                    <CheckCircle2 size={16} aria-hidden="true" /> Monitoramento ativo (API oficial)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{ label: 'Deputados federais', count: counts.deputies }, { label: 'Senadores da República', count: counts.senators }].map(({ label, count }) => (
                        <div key={label} className="flex items-center gap-3 text-sm font-semibold text-muted-strong bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-4 rounded-2xl">
                            {count > 0 && <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 flex items-center justify-center font-black text-sm">{count}</span>}
                            {label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-xs text-subtle">
                * Monitoramos exclusivamente o Poder Legislativo Federal, onde há disponibilidade de APIs abertas e padronizadas para consulta de gastos, presença e votações.
            </div>

            <div>
                <h4 className="flex items-center gap-2 font-semibold text-midnight dark:text-white text-sm mb-4">
                    <Server size={16} aria-hidden="true" /> Nossas fontes de verdade
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a href="https://dadosabertos.camara.leg.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border border-slate-200/70 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40">
                        <div className="w-10 h-10 bg-green-100 text-green-800 rounded-full flex items-center justify-center"><Building2 size={20} aria-hidden="true" /></div>
                        <div>
                            <p className="font-medium text-xs text-subtle">Legislativo</p>
                            <p className="font-bold text-sm text-midnight dark:text-white">Dados abertos da Câmara</p>
                        </div>
                    </a>
                    <a href="https://legis.senado.leg.br/dadosabertos" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border border-slate-200/70 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40">
                        <div className="w-10 h-10 bg-green-100 text-green-800 rounded-full flex items-center justify-center"><Building2 size={20} aria-hidden="true" /></div>
                        <div>
                            <p className="font-medium text-xs text-subtle">Legislativo</p>
                            <p className="font-bold text-sm text-midnight dark:text-white">Dados abertos do Senado</p>
                        </div>
                    </a>
                    <a href="https://divulgacandcontas.tse.jus.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border border-slate-200/70 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40">
                        <div className="w-10 h-10 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center"><Scale size={20} aria-hidden="true" /></div>
                        <div>
                            <p className="font-medium text-xs text-subtle">Patrimônio</p>
                            <p className="font-bold text-sm text-midnight dark:text-white">TSE (DivulgaCand)</p>
                        </div>
                    </a>
                </div>
            </div>

        </div>
      </div>
    </Modal>
  );
};

export default DataTransparencyModal;
