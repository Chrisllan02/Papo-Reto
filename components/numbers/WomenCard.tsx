import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Politician } from '../../types';
import { filterByChamber, formatInteger, formatPercent, womenShare } from '../../utils/numbersStats';
import { MUTED, NumCard } from './NumCard';

const DOTS = 100;

const WomenCard: React.FC<{ politicians: Politician[] }> = ({ politicians }) => {
  const all = useMemo(() => womenShare(politicians), [politicians]);
  const camara = useMemo(() => womenShare(filterByChamber(politicians, 'camara')), [politicians]);
  const senado = useMemo(() => womenShare(filterByChamber(politicians, 'senado')), [politicians]);
  const filled = all.pct === null ? 0 : Math.round(all.pct);

  const rows = [
    { label: 'Câmara', share: camara },
    { label: 'Senado', share: senado },
  ];

  return (
    <NumCard icon={Users} title="Mulheres no Congresso" className="flex-1">
      {all.pct === null ? (
        <p className="text-base font-bold text-midnight dark:text-white">Dados ainda não disponíveis.</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-black text-nuit dark:text-spring">{formatPercent(all.pct)}</span>
            <span className={`text-sm font-bold ${MUTED}`}>{formatInteger(all.women)} de {formatInteger(all.known)}</span>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div
              role="img"
              aria-label={`${filled} de cada 100 parlamentares são mulheres`}
              className="grid w-full grid-cols-10 gap-1.5"
            >
              {Array.from({ length: DOTS }, (_, index) => (
                <span key={index} className={`aspect-square rounded-full ${index < filled ? 'bg-nuit dark:bg-spring' : 'bg-midnight/[0.12] dark:bg-white/15'}`} />
              ))}
            </div>
          </div>
          {all.unknown > 0 && <p className={`text-sm font-semibold ${MUTED}`}>Sexo ainda em atualização para {formatInteger(all.unknown)} parlamentares.</p>}
          <div className="flex flex-col gap-1 text-sm font-bold text-midnight dark:text-white">
            {rows.map(({ label, share }) => (
              <div key={label} className="flex justify-between gap-3">
                <span>{label}</span>
                <span>
                  {share.pct === null ? (
                    <span className={MUTED}>sem dados</span>
                  ) : (
                    <>
                      <b className="font-black">{formatInteger(share.women)}</b>{' '}
                      <span className={MUTED}>de {formatInteger(share.known)} · {formatPercent(share.pct)}</span>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </NumCard>
  );
};

export default WomenCard;
