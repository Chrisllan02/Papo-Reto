import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import TopBar from '../components/TopBar';
import ExploreView from '../views/ExploreView';

vi.mock('../hooks/useCamaraData', () => ({
  useInitialData: () => ({
    politicians: [],
    feedItems: [],
    parties: [],
    articles: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    setPoliticians: vi.fn(),
    loadEducationalContent: vi.fn(),
  }),
}));

const Shell = () => {
  const { state, actions } = useAppContext();
  const [mount, setMount] = useState(0);
  return (
    <>
      <TopBar />
      <button onClick={() => setMount(n => n + 1)}>Remontar</button>
      {state.activeTab === 'explore' && (
        <ExploreView key={mount} politicians={[]} onSelectCandidate={() => {}} searchRequest={state.exploreQuery} onSearchApplied={actions.clearExploreQuery} />
      )}
    </>
  );
};

const desktopSearch = () => screen.getAllByRole('searchbox')[0];

const appliedSearch = () => screen.queryByText(/^Busca: /);

const submitTop = (value: string) => {
  fireEvent.change(desktopSearch(), { target: { value } });
  fireEvent.submit(desktopSearch().closest('form')!);
};

describe('busca do menu superior', () => {
  it('ao enviar, abre Políticos com o texto aplicado na busca da tela', () => {
    render(<AppProvider><Shell /></AppProvider>);

    fireEvent.change(desktopSearch(), { target: { value: '  Tabata Amaral ' } });
    fireEvent.submit(desktopSearch().closest('form')!);

    const tab = screen.getAllByRole('button', { name: 'Políticos' }).find(el => el.textContent === 'Políticos')!;
    expect(tab).toHaveAttribute('aria-current', 'page');
    expect(appliedSearch()).toHaveTextContent('Busca: Tabata Amaral');
  });

  it('a busca do topo é consumida: não volta ao remontar a tela, mas repetir o mesmo texto reaplica', () => {
    render(<AppProvider><Shell /></AppProvider>);

    submitTop('Lula');
    expect(appliedSearch()).toHaveTextContent('Busca: Lula');
    fireEvent.click(screen.getByRole('button', { name: 'Remontar' }));
    expect(appliedSearch()).not.toBeInTheDocument();

    submitTop('Lula');
    expect(appliedSearch()).toHaveTextContent('Busca: Lula');
  });

  it('com texto vazio ou só espaços, não sai da tela atual', () => {
    render(<AppProvider><Shell /></AppProvider>);

    fireEvent.change(desktopSearch(), { target: { value: '   ' } });
    fireEvent.submit(desktopSearch().closest('form')!);

    expect(screen.getAllByRole('button', { name: 'Hoje no Congresso' })[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('heading', { name: 'Políticos' })).not.toBeInTheDocument();
  });
});
