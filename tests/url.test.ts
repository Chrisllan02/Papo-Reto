import { describe, expect, it } from 'vitest';
import { safeHttpUrl } from '../utils/url';

describe('safeHttpUrl', () => {
  it('aceita http e https', () => {
    expect(safeHttpUrl('https://camara.leg.br/x')).toBe('https://camara.leg.br/x');
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com');
  });

  it('rejeita esquemas perigosos e valores inválidos', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeHttpUrl('not a url')).toBeUndefined();
    expect(safeHttpUrl('//example.com')).toBeUndefined();
    expect(safeHttpUrl('')).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});
