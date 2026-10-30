import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/useDialog';

interface ModalProps {
  onClose: () => void;
  /** id do elemento que dá nome ao diálogo. */
  labelledBy?: string;
  /** Nome do diálogo quando não há título visível. */
  ariaLabel?: string;
  /** Classes da camada que cobre a tela (fundo escuro, posição). */
  className?: string;
  style?: React.CSSProperties;
  /** Fecha ao clicar no fundo. Padrão: true. */
  closeOnBackdrop?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  onClose,
  labelledBy,
  ariaLabel,
  className,
  style,
  closeOnBackdrop = true,
  initialFocusRef,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, { onClose, initialFocusRef });

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      className={`${className ?? ''} outline-none`}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default Modal;
