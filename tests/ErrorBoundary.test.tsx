import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';

const Broken = () => {
  throw new Error('quebrou');
};

describe('ErrorBoundary', () => {
  it('troca a tela quebrada por aviso com ação de recarregar', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado nesta tela');
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
