import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityCard } from '../views/profile/ProfileWidgets';

const vote = { _type: 'vote' as const, id: '1', date: '2026-03-10', description: 'PL 1/2026', vote: 'Sim' };

describe('ActivityCard de voto', () => {
  it('sem orientação do partido não afirma que o parlamentar seguiu', () => {
    render(<ActivityCard item={vote} />);
    expect(screen.queryByText('Seguiu')).not.toBeInTheDocument();
    expect(screen.queryByText('Liberado')).not.toBeInTheDocument();
    expect(screen.getByText('Orientação não informada')).toBeInTheDocument();
  });

  it('com orientação informada mostra o selo correspondente', () => {
    render(<ActivityCard item={{ ...vote, partyOrientation: 'Sim', isRebel: false }} />);
    expect(screen.getByText('Seguiu')).toBeInTheDocument();
  });
});
