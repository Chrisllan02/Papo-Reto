import type { CongressNumbers } from '../api/lib/congressNumbers';
import { getConfiguredApiOrigin } from '../utils/legislativeApiProxy';
import { timeoutSignal } from '../utils/timeoutSignal';

export type { CongressNumbers };

const getNumbersEndpoint = () => {
  try {
    const origin = getConfiguredApiOrigin();
    return origin ? `${origin}/api/numbers` : '/api/numbers';
  } catch {
    return '/api/numbers';
  }
};

export const fetchCongressNumbers = async (): Promise<CongressNumbers | null> => {
  try {
    const res = await fetch(getNumbersEndpoint(), {
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object' || !data.sources) return null;
    return data as CongressNumbers;
  } catch {
    return null;
  }
};
