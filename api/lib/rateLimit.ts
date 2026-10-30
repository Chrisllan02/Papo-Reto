import type { IncomingMessage } from 'http';
import { isIP } from 'node:net';

const MAX_ENTRIES = 10_000;

const normalizeIpv6Prefix = (ip: string) => {
  const mapped = ip.match(/^(?:::ffff:|::)(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1];

  const [head, tail] = ip.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail === undefined ? [] : tail ? tail.split(':') : [];
  const missing = Math.max(0, 8 - headGroups.length - tailGroups.length);
  const groups = tail === undefined ? headGroups : [...headGroups, ...Array(missing).fill('0'), ...tailGroups];
  return `${groups.slice(0, 4).map((group) => group.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
};

export const getClientBucket = (req: Pick<IncomingMessage, 'headers'>) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.headers?.['x-real-ip'] || 'unknown';
  const ip = String(raw).split(',')[0].trim() || 'unknown';
  return isIP(ip) === 6 ? normalizeIpv6Prefix(ip) : ip;
};

export const createRateLimiter = (windowMs: number) => {
  const store = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = Date.now();

  const sweep = (now: number) => {
    if (now - lastSweep < windowMs && store.size < MAX_ENTRIES) return;
    lastSweep = now;
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
    while (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  };

  return (key: string, limit: number) => {
    const now = Date.now();
    sweep(now);
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }

    if (current.count >= limit) return true;

    current.count += 1;
    return false;
  };
};
