import { describe, expect, it } from 'vitest';
import { getRegionByUF } from '../utils/regions';

describe('getRegionByUF', () => {
  it('não assume Sudeste para UF desconhecida', () => {
    expect(getRegionByUF('XX')).toBeUndefined();
    expect(getRegionByUF('')).toBeUndefined();
  });
});
