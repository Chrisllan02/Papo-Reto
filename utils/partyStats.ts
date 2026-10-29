import { Politician } from '../types';
import { getIdeology, normalizeSex } from '../services/camaraApi';
import { getRegionByUF, Region } from './regions';

export interface RegionStats {
  Norte: number;
  Nordeste: number;
  CentroOeste: number;
  Sudeste: number;
  Sul: number;
}

export interface PartyStats {
  name: string;
  totalMembers: number;
  femaleCount: number;
  totalSpending: number;
  /** Média apenas de quem tem gasto informado pela fonte. */
  avgSpending: number;
  /** Quantos membros têm gasto informado. */
  spendingSampleCount: number;
  /** Média apenas de quem tem presença real; null quando nenhum deputado tem dado. */
  avgAttendance: number | null;
  /** Quantos membros têm presença real informada. */
  attendanceSampleCount: number;
  regionStats: RegionStats;
  members: Politician[];
}

const REGION_KEY: Record<Region, keyof RegionStats> = {
  Norte: 'Norte',
  Nordeste: 'Nordeste',
  'Centro-Oeste': 'CentroOeste',
  Sudeste: 'Sudeste',
  Sul: 'Sul',
};

const hasRealAttendance = (pol: Politician) => {
  const pct = pol.stats?.attendancePct;
  return typeof pct === 'number' && Number.isFinite(pct) && pct > 0;
};

const hasSpendingData = (pol: Politician) =>
  pol.hasApiIntegration !== false
  && ((pol.stats?.spending || 0) > 0 || Boolean(pol.detailedExpenses?.length) || Boolean(pol.expensesBreakdown?.length));

export const computePartyStats = (politicians: Politician[]) => {
  const groups: Record<string, PartyStats> = {};
  const attendanceSums: Record<string, number> = {};
  const ideologyGroups: Record<string, number> = { Esquerda: 0, Centro: 0, Direita: 0 };

  politicians.forEach((pol) => {
    const partyName = pol.party ? pol.party.trim().toUpperCase() : 'OUTROS';
    if (!groups[partyName]) {
      groups[partyName] = {
        name: partyName,
        totalMembers: 0,
        femaleCount: 0,
        totalSpending: 0,
        avgSpending: 0,
        spendingSampleCount: 0,
        avgAttendance: null,
        attendanceSampleCount: 0,
        regionStats: { Norte: 0, Nordeste: 0, CentroOeste: 0, Sudeste: 0, Sul: 0 },
        members: [],
      };
      attendanceSums[partyName] = 0;
    }
    const g = groups[partyName];
    g.members.push(pol);
    g.totalMembers += 1;
    if (normalizeSex(pol.sex) === 'F') g.femaleCount += 1;
    if (hasSpendingData(pol)) {
      g.totalSpending += pol.stats?.spending || 0;
      g.spendingSampleCount += 1;
    }
    const ideology = getIdeology(partyName);
    if (ideology) ideologyGroups[ideology] += 1;

    if (hasRealAttendance(pol)) {
      attendanceSums[partyName] += pol.stats.attendancePct;
      g.attendanceSampleCount += 1;
    }

    const region = getRegionByUF(pol.state);
    if (region) g.regionStats[REGION_KEY[region]] += 1;
  });

  Object.values(groups).forEach((g) => {
    g.avgAttendance = g.attendanceSampleCount > 0 ? attendanceSums[g.name] / g.attendanceSampleCount : null;
    g.avgSpending = g.spendingSampleCount > 0 ? g.totalSpending / g.spendingSampleCount : 0;
  });

  return {
    partyStats: Object.values(groups).filter((g) => g.totalMembers > 0),
    ideologyStats: ideologyGroups,
  };
};

/** Presença média ponderada pelos deputados com dado real; null se ninguém tem dado. */
export const summarizeAttendance = (data: PartyStats[]) => {
  let sum = 0;
  let sample = 0;
  let total = 0;
  data.forEach((p) => {
    total += p.totalMembers;
    if (p.avgAttendance !== null) {
      sum += p.avgAttendance * p.attendanceSampleCount;
      sample += p.attendanceSampleCount;
    }
  });
  return { average: sample > 0 ? sum / sample : null, sample, total };
};
