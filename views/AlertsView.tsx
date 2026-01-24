import React from 'react';
import { AlertTriangle, Scale, Info, CheckCircle2 } from 'lucide-react';
import { ALERTS_DATA } from '../constants';

const AlertsView: React.FC = () => (
    <div className="p-6 h-full overflow-y-auto pb-32 w-full max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Alertas</h2>
        <div className="space-y-4">
            {/* If we have no real alerts backend yet, show a placeholder or empty state */}
            {ALERTS_DATA.length === 0 ? (
                <div className="text-center py-10">
                    <CheckCircle2 size={64} className="mx-auto text-green-200 mb-4"/>
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Tudo Tranquilo</h3>
                    <p className="text-gray-500 mt-2">Nenhum alerta urgente detectado nas votações de hoje.</p>
                </div>
            ) : (
                ALERTS_DATA.map(alert => (
                    <div key={alert.id} className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex gap-4 items-start">
                        <div className={`p-3 rounded-full shrink-0 ${
                            alert.type === 'critical' ? 'bg-red-100 text-red-600' : 
                            alert.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-blue-100 text-blue-600'
                        }`}>
                            {alert.type === 'critical' ? <AlertTriangle size={20} /> : alert.type === 'warning' ? <Scale size={20}/> : <Info size={20}/>}
                        </div>
                        <div>
                            <div className="flex justify-between items-start w-full mb-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{alert.title}</h3>
                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{alert.time}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{alert.msg}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
);

export default AlertsView;
