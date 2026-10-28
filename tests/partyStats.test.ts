import { describe, expect, it } from 'vitest';
import { computePartyStats, summarizeAttendance } from '../utils/partyStats';
import type { Politician } from '../types';

const pol = (id: number, party: string, attendancePct: number, state = 'SP'): Politician =>
  ({
    id,
    name: `Dep ${id}`,
    party,
    partyShort: party,
    state,
    role: 'Deputado Federal',
    photo: '',
    matchScore: 0,
    bio: '',
    mandate: { start: '', end: '' },
    votes: {},
    hasApiIntegration: true,
    stats: { attendancePct, spending: 100 },
  }) as unknown as Politician;

describe('computePartyStats', () => {
  it('divide a presença uma única vez, só por quem tem dado real', () => {
    const { partyStats } = computePartyStats([pol(1, 'PT', 90), pol(2, 'PT', 70), pol(3, 'PT', 0)]);
    const pt = partyStats.find((p) => p.name === 'PT')!;
    expect(pt.avgAttendance).toBe(80);
    expect(pt.attendanceSampleCount).toBe(2);
    expect(pt.totalMembers).toBe(3);
  });

  it('não inventa presença quando não há dado real', () => {
    const { partyStats } = computePartyStats([pol(1, 'PL', 0), pol(2, 'PL', 0)]);
    expect(partyStats[0].avgAttendance).toBeNull();
    expect(partyStats[0].attendanceSampleCount).toBe(0);
  });

  it('UF desconhecida não cai em nenhuma região', () => {
    const { partyStats } = computePartyStats([pol(1, 'PT', 50, 'XX')]);
    expect(Object.values(partyStats[0].regionStats).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('resume a cobertura geral', () => {
    const { partyStats } = computePartyStats([pol(1, 'PT', 100), pol(2, 'PL', 0), pol(3, 'PL', 50)]);
    expect(summarizeAttendance(partyStats)).toEqual({ average: 75, sample: 2, total: 3 });
  });
});
