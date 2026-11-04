import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PartiesDashboardView from '../views/PartiesDashboardView';
import { Politician } from '../types';

const politicians = [
  { id: 1, state: 'SP', party: 'PT', sex: 'F', hasApiIntegration: true },
  { id: 2, state: 'BA', party: 'PL', sex: 'M', hasApiIntegration: true },
  { id: 3, state: 'GO', party: 'MDB', sex: 'M', hasApiIntegration: false },
] as Politician[];

afterEach(() => vi.unstubAllGlobals());

describe('tela Números', () => {
  it('mostra "Dados ainda não disponíveis." e nenhum número de presença ou cota quando a API falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ error: 'x' }) })));
    render(<PartiesDashboardView politicians={politicians} />);
    await waitFor(() => expect(screen.getAllByText('Dados ainda não disponíveis.')).toHaveLength(2));
    expect(screen.queryByText(/milhões/)).not.toBeInTheDocument();
    expect(screen.queryByText(/média/)).not.toBeInTheDocument();
  });

  it('mostra presença e cota vindas da API e abre a lista de estados', async () => {
    const data = {
      generatedAt: '2026-11-02T12:00:00Z',
      presence: { year: 2026, votes: 3, averagePct: 80.4, lastDate: '2026-10-30', months: [{ month: '2026-02', votes: 2, pct: 79 }] },
      quota: { year: 2026, total: 144_900_000, firstMonth: '2026-01', lastMonth: '2026-10', perSeatMonthly: 28_000, topCategories: [{ key: 'a', label: 'Divulgação', value: 1, pct: 37.1 }] },
      warnings: [],
      sources: { votings: 'https://v.example/a.csv', votes: 'https://v.example/b.csv', quota: 'https://q.example/c.zip' },
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => data })));
    render(<PartiesDashboardView politicians={politicians} />);
    expect(await screen.findByText('R$ 144,9 milhões')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /presença nas votações/ })).toHaveAttribute('href', 'https://dadosabertos.camara.leg.br/swagger/api.html#staticfile');

    const button = screen.getByRole('button', { name: 'Ver cadeiras por estado' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /Esconder cadeiras por estado/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Bahia')).toBeInTheDocument();
  }, 30000);
});
