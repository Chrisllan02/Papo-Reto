import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DataState from '../components/DataState';

describe('DataState', () => {
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
    expect(screen.getByText('Vazio')).toBeInTheDocument();
    expect(screen.getByText('Nada aqui.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
