import { Politician } from '../types';
import { normalizeSex } from '../services/camaraApi';
import { getRegionByUF, Region } from './regions';

export const SOURCE_PAGES = {
  presence: 'https://dadosabertos.camara.leg.br/swagger/api.html#staticfile',
  quota: 'https://www.camara.leg.br/transparencia/gastos-parlamentares',
};

export const REGION_ORDER: Region[] = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

export type Chamber = 'congresso' | 'camara' | 'senado';

export const isSenator = (pol: Politician) => pol.hasApiIntegration === false;

export const filterByChamber = (politicians: Politician[], chamber: Chamber) => {
  if (chamber === 'camara') return politicians.filter(pol => !isSenator(pol));
  if (chamber === 'senado') return politicians.filter(isSenator);
  return politicians;
};

export interface RegionSeats {
  region: Region;
  seats: number;
  pct: number;
}

export interface StateSeats {
  uf: string;
  seats: number;
}

export const seatsByRegion = (politicians: Politician[]) => {
  const regionCounts = new Map<Region, number>();
  const stateCounts = new Map<string, number>();

  politicians.forEach(pol => {
    const region = getRegionByUF(pol.state);
    if (!region) return;
    const uf = pol.state.trim().toUpperCase();
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
    stateCounts.set(uf, (stateCounts.get(uf) || 0) + 1);
  });

  const total = [...regionCounts.values()].reduce((sum, seats) => sum + seats, 0);
  const regions: RegionSeats[] = REGION_ORDER
    .filter(region => regionCounts.has(region))
    .map(region => {
      const seats = regionCounts.get(region) || 0;
      return { region, seats, pct: total > 0 ? (seats / total) * 100 : 0 };
    })
    .sort((a, b) => b.seats - a.seats);

  const states: StateSeats[] = [...stateCounts.entries()]
    .map(([uf, seats]) => ({ uf, seats }))
    .sort((a, b) => b.seats - a.seats || a.uf.localeCompare(b.uf));

  return { total, regions, states };
};

export const womenShare = (politicians: Politician[]) => {
  const known = politicians.filter(pol => normalizeSex(pol.sex));
  const women = known.filter(pol => normalizeSex(pol.sex) === 'F').length;
  return {
    women,
    known: known.length,
    unknown: politicians.length - known.length,
    pct: known.length > 0 ? (women / known.length) * 100 : null,
  };
};

const percentFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export const formatPercent = (value: number) => `${percentFormat.format(value)}%`;
export const formatInteger = (value: number) => integerFormat.format(value);

export const formatMillions = (reais: number) => `R$ ${decimalFormat.format(reais / 1_000_000)} milhões`;
export const formatThousands = (reais: number) => `R$ ${integerFormat.format(reais / 1000)} mil`;

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const monthLabel = (isoMonth: string) => {
  const index = Number(isoMonth.slice(5, 7)) - 1;
  return MONTH_LABELS[index] ?? isoMonth;
};

export const formatNumbersDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};
