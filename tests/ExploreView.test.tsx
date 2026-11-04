import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExploreView from '../views/ExploreView';
import { Politician } from '../types';

vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) => children({ height: 2000, width: 1200 }),
}));

const pol = (id: number, name: string, party: string, state: string, senator = false) =>
  ({ id, name, party, partyShort: party, state, role: senator ? 'Senador' : 'Deputado Federal', hasApiIntegration: !senator, photo: '' }) as Politician;

const politicians = [
  pol(1, 'Célio Silveira', 'MDB', 'GO'),
  pol(2, 'Ana Souza', 'PT', 'GO'),
  pol(3, 'Zeca Dias', 'MDB', 'SP'),
  pol(4, 'Bia Lima', 'PL', 'GO', true),
];

const renderView = (props: Partial<React.ComponentProps<typeof ExploreView>> = {}) =>
  render(<ExploreView politicians={politicians} onSelectCandidate={() => {}} {...props} />);

const card = (name: string) => screen.queryByRole('button', { name: new RegExp(`Ver perfil de ${name}`) });

describe('tela Políticos', () => {
  it('mostra a contagem real em cada aba', () => {
    renderView();
    const tabs = within(screen.getByRole('navigation', { name: 'Seções de Políticos' }));
    expect(tabs.getByRole('button', { name: /Todos/ })).toHaveTextContent('4');
    expect(tabs.getByRole('button', { name: /Deputados/ })).toHaveTextContent('3');
    expect(tabs.getByRole('button', { name: /Senadores/ })).toHaveTextContent('1');
    expect(tabs.getByRole('button', { name: /Partidos/ })).toHaveTextContent('3');
    expect(tabs.getByRole('button', { name: /Estados/ })).toHaveTextContent('2');
  });

  it('começa no estado do app e troca para o Brasil todo ao limpar o estado', () => {
    renderView({ defaultState: 'GO' });
    expect(screen.getAllByText('3 políticos de Goiás').length).toBeGreaterThan(0);
    expect(card('Zeca Dias')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por estado: Goiás' }));
    fireEvent.click(screen.getByRole('button', { name: 'Brasil' }));
    expect(card('Zeca Dias')).toBeInTheDocument();
  });

  it('filtra por partido e por casa legislativa', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por partido' }));
    fireEvent.click(screen.getByRole('button', { name: /^MDB, 2 parlamentares/ }));
    expect(card('Célio Silveira')).toBeInTheDocument();
    expect(card('Ana Souza')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por partido: MDB' }));
    fireEvent.click(screen.getByRole('button', { name: 'Todos os partidos' }));
    fireEvent.click(screen.getByRole('button', { name: /Senadores/ }));
    expect(card('Bia Lima')).toBeInTheDocument();
    expect(card('Ana Souza')).not.toBeInTheDocument();
  });

  it('aplica a consulta vinda de outra tela ignorando o estado padrão e avisa que foi consumida', () => {
    const onApplied = vi.fn();
    renderView({ defaultState: 'GO', searchRequest: { text: 'zeca', seq: 1 }, onSearchApplied: onApplied });
    expect(card('Zeca Dias')).toBeInTheDocument();
    expect(card('Ana Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Busca: zeca')).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalled();
  });

  it('mostra o aviso de vazio com a ação de limpar quando nada combina', () => {
    renderView({ searchRequest: { text: 'inexistente', seq: 1 } });
    expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(card('Ana Souza')).toBeInTheDocument();
  });

  it('o card do partido leva para a lista filtrada por ele', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /Partidos/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ver os 2 parlamentares do MDB/ }));
    expect(card('Zeca Dias')).toBeInTheDocument();
    expect(card('Ana Souza')).not.toBeInTheDocument();
  });
});
