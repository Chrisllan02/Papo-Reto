import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Modal from '../components/Modal';

const Harness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {open && (
        <Modal onClose={() => setOpen(false)} labelledBy="titulo">
          <h2 id="titulo">Detalhes</h2>
          <button>Primeiro</button>
          <button>Ultimo</button>
        </Modal>
      )}
    </>
  );
};

describe('Modal', () => {
  it('expõe role dialog, fecha com Escape e devolve o foco a quem abriu', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Detalhes' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('mantém o foco preso dentro do diálogo', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const last = screen.getByRole('button', { name: 'Ultimo' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });
});
