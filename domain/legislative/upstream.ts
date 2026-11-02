export const jitteredDelay = (baseMs: number, random: () => number = Math.random) =>
  Math.round(baseMs * (0.5 + random()));

type BreakerState = { failures: number; openUntil: number };

export type CircuitBreaker = {
  canRequest: (key: string) => boolean;
  recordSuccess: (key: string) => void;
  recordFailure: (key: string) => void;
  reset: () => void;
};

export const createCircuitBreaker = (
  threshold: number,
  cooldownMs: number,
  now: () => number = Date.now
): CircuitBreaker => {
  const states = new Map<string, BreakerState>();

  return {
    canRequest: (key) => (states.get(key)?.openUntil || 0) <= now(),
    recordSuccess: (key) => {
      states.delete(key);
    },
    recordFailure: (key) => {
      const state = states.get(key) || { failures: 0, openUntil: 0 };
      state.failures += 1;
      if (state.failures >= threshold) state.openUntil = now() + cooldownMs;
      states.set(key, state);
    },
    reset: () => states.clear(),
  };
};

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};
