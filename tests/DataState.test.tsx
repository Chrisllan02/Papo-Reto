import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DataState from '../components/DataState';

describe('DataState', () => {
  it('renders a useful empty state with an action', () => {
    const onAction = vi.fn();

    render(
      <DataState
        title="Sem dados"
        description="Tente explorar outra area."
        actionLabel="Explorar"
        onAction={onAction}
      />
    );

    expect(screen.getByText('Sem dados')).toBeInTheDocument();
    expect(screen.getByText('Tente explorar outra area.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument();
  });

  it('anuncia erro com role alert e permite tentar de novo', () => {
    const onAction = vi.fn();
    render(<DataState variant="error" title="Falhou" description="Tente novamente." actionLabel="Tentar de novo" onAction={onAction} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    screen.getByRole('button', { name: 'Tentar de novo' }).click();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('anuncia carregamento com role status', () => {
    render(<DataState variant="loading" title="Carregando" description="Buscando dados." />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });

  it('estado vazio não usa região viva', () => {
    render(<DataState title="Vazio" description="Nada aqui." />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
