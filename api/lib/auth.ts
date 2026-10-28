import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

export const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export const hasBearerToken = (authorization: string | string[] | undefined, secret: string) => {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header || !secret) return false;
  return safeEqual(header, `Bearer ${secret}`);
};

export const isCronAuthorized = (authorization: string | string[] | undefined) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1';
  }
  return hasBearerToken(authorization, secret);
};
