import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../contexts/AppContext';
import TopBar from '../components/TopBar';

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

const trigger = () => screen.getByRole('button', { name: /estado/i, expanded: false });

describe('seletor de região', () => {
  it('escolhe o estado pelo teclado e devolve o foco ao botão', () => {
    render(<AppProvider><TopBar /></AppProvider>);
    const button = trigger();
    button.focus();
    fireEvent.click(button);

    const norte = screen.getByRole('option', { name: /Norte/ });
    norte.focus();
    fireEvent.keyDown(norte, { key: 'ArrowDown' });
    const nordeste = screen.getByRole('option', { name: /Nordeste/ });
    expect(nordeste).toHaveFocus();

    fireEvent.keyDown(nordeste, { key: 'ArrowRight' });
    const bahia = screen.getByRole('option', { name: /Bahia/ });
    fireEvent.keyDown(bahia, { key: 'Enter' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bahia/ })).toHaveFocus();
  });

  it('Esc fecha sem trocar o estado', () => {
    render(<AppProvider><TopBar /></AppProvider>);
    const button = trigger();
    button.focus();
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });
});
