import { describe, expect, it } from 'vitest';
import { extractBrazilianStateUF, normalizeLocationUF } from '../utils/location';

describe('location helpers', () => {
  it('normalizes valid state abbreviations', () => {
    expect(normalizeLocationUF('sp')).toBe('SP');
    expect(normalizeLocationUF(' RJ ')).toBe('RJ');
    expect(normalizeLocationUF('XX')).toBe('');
  });

  it('extracts UF from reverse geocode subdivision code', () => {
    expect(extractBrazilianStateUF({ principalSubdivisionCode: 'BR-SP' })).toBe('SP');
    expect(extractBrazilianStateUF({ principalSubdivisionCode: 'BR-MG' })).toBe('MG');
  });

  it('extracts UF from Brazilian state names', () => {
    expect(extractBrazilianStateUF({ principalSubdivision: 'São Paulo' })).toBe('SP');
    expect(extractBrazilianStateUF({ principalSubdivision: 'Espírito Santo' })).toBe('ES');
    expect(extractBrazilianStateUF({ state: 'Distrito Federal' })).toBe('DF');
  });

  it('extracts UF from locality administrative levels', () => {
    expect(extractBrazilianStateUF({
      localityInfo: {
        administrative: [
          { name: 'Brasil', isoCode: 'BR' },
          { name: 'Rio Grande do Sul', isoCode: 'BR-RS' },
        ],
      },
    })).toBe('RS');
  });
});
