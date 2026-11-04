import { describe, expect, it } from 'vitest';
import { Politician } from '../types';
import { filterByChamber, seatsByRegion, womenShare } from '../utils/numbersStats';
import { layoutHemicycle } from '../utils/hemicycle';

const UFS = ['SP', 'MG', 'BA', 'AM', 'RS', 'DF', 'GO', 'PA'];
const make = (id: number, state: string, extra: Partial<Politician> = {}) =>
  ({ id, state, party: 'PT', sex: id % 2 ? 'F' : 'M', hasApiIntegration: true, ...extra }) as Politician;

describe('números do Congresso', () => {
  const politicians = Array.from({ length: 594 }, (_, i) => make(i + 1, UFS[i % UFS.length], i >= 513 ? { hasApiIntegration: false } : {}));

  it('regiões e estados somam todos os parlamentares e batem entre si', () => {
    const { total, regions, states } = seatsByRegion(politicians);
    expect(total).toBe(594);
    expect(regions.reduce((s, r) => s + r.seats, 0)).toBe(594);
    expect(states.reduce((s, r) => s + r.seats, 0)).toBe(594);
    expect(regions.find(r => r.region === 'Centro-Oeste')?.seats).toBe(states.filter(s => ['DF', 'GO'].includes(s.uf)).reduce((a, s) => a + s.seats, 0));
  });

  it('ignora UF desconhecida em vez de inventar região', () => {
    expect(seatsByRegion([make(1, 'XX'), make(2, 'SP')]).total).toBe(1);
  });

  it('separa Câmara e Senado e não conta mulher sem sexo confirmado', () => {
    expect(filterByChamber(politicians, 'senado')).toHaveLength(81);
    expect(filterByChamber(politicians, 'camara')).toHaveLength(513);
    const share = womenShare([make(1, 'SP', { sex: 'F' }), make(2, 'SP', { sex: undefined }), make(3, 'SP', { sex: 'M' })]);
    expect(share).toMatchObject({ women: 1, known: 2, unknown: 1, pct: 50 });
  });

  it('hemiciclo desenha exatamente uma bolinha por cadeira, dentro da área', () => {
    [594, 513, 81, 1].forEach(n => {
      const dots = layoutHemicycle(n);
      expect(dots).toHaveLength(n);
      dots.forEach(d => {
        expect(d.x - d.r).toBeGreaterThanOrEqual(0);
        expect(d.x + d.r).toBeLessThanOrEqual(440);
        expect(d.y - d.r).toBeGreaterThanOrEqual(0);
        expect(d.y + d.r).toBeLessThanOrEqual(231);
      });
    });
  });
});
