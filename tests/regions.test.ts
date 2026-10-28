import { describe, expect, it } from 'vitest';
import { getRegionByUF } from '../utils/regions';

describe('getRegionByUF', () => {
  it('mapeia UFs conhecidas', () => {
    expect(getRegionByUF('sp')).toBe('Sudeste');
    expect(getRegionByUF('DF')).toBe('Centro-Oeste');
  });
  it('não assume Sudeste para UF desconhecida', () => {
    expect(getRegionByUF('XX')).toBeUndefined();
    expect(getRegionByUF('')).toBeUndefined();
  });
});
