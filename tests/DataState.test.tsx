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
});
