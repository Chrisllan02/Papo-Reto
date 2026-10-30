import { describe, expect, it, vi } from 'vitest';
import { extractBrazilianStateUF, normalizeLocationUF, reverseGeocodeToUF } from '../utils/location';

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

describe('location: país e privacidade', () => {
  it('ignora estados de outros países (US-AL não é Alagoas)', () => {
    expect(extractBrazilianStateUF({ countryCode: 'US', principalSubdivisionCode: 'US-AL' })).toBe('');
    expect(extractBrazilianStateUF({ countryCode: 'US', localityInfo: { administrative: [{ isoCode: 'US-AL' }] } })).toBe('');
    expect(extractBrazilianStateUF({ countryCode: 'BR', principalSubdivisionCode: 'BR-AL' })).toBe('AL');
  });

  it('arredonda lat/long para 2 casas decimais (cidades de divisa) antes de enviar ao serviço externo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ countryCode: 'BR', principalSubdivisionCode: 'BR-SP' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(reverseGeocodeToUF(-23.55052, -46.633308)).resolves.toBe('SP');

    const [url, init] = fetchMock.mock.calls[0];
    const params = new URL(url).searchParams;
    expect(params.get('latitude')).toBe('-23.55');
    expect(params.get('longitude')).toBe('-46.63');
    expect(init.signal).toBeDefined();
    vi.unstubAllGlobals();
  });

  it('não confunde Timon (MA) com Teresina (PI) ao arredondar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await reverseGeocodeToUF(-5.0977, -42.8369);

    const params = new URL(fetchMock.mock.calls[0][0]).searchParams;
    expect(params.get('latitude')).toBe('-5.10');
    expect(params.get('longitude')).toBe('-42.84');
    vi.unstubAllGlobals();
  });
});
