import { useEffect, useState } from 'react';
import { CongressNumbers, fetchCongressNumbers } from '../services/numbersApi';

export type CongressNumbersState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: CongressNumbers }
  | { status: 'unavailable'; data: null };

export const useCongressNumbers = (): CongressNumbersState => {
  const [state, setState] = useState<CongressNumbersState>({ status: 'loading', data: null });

  useEffect(() => {
    let active = true;
    fetchCongressNumbers().then(data => {
      if (active) setState(data ? { status: 'ready', data } : { status: 'unavailable', data: null });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
};
