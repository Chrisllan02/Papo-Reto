import { list, put } from '@vercel/blob';

type CacheEnvelope<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, string>();

const pathnameForKey = (key: string) => `server-cache/${key}.json`;

export const readServerCache = async <T>(key: string, ttlMs: number): Promise<T | null> => {
  const pathname = pathnameForKey(key);
  const now = Date.now();

  const parse = (raw: string): T | null => {
    try {
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;
      if (!parsed || typeof parsed.timestamp !== 'number') return null;
      if (ttlMs > 0 && now - parsed.timestamp > ttlMs) return null;
      return parsed.data;
    } catch {
      return null;
    }
  };

  const memory = memoryCache.get(pathname);
  if (memory) {
    const data = parse(memory);
    if (data) return data;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const blob = blobs.find((item) => item.pathname === pathname);
    if (!blob) return null;
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    const raw = await response.text();
    memoryCache.set(pathname, raw);
    return parse(raw);
  } catch {
    return null;
  }
};

export const writeServerCache = async <T>(key: string, data: T) => {
  const pathname = pathnameForKey(key);
  const payload = JSON.stringify({ data, timestamp: Date.now() } satisfies CacheEnvelope<T>);
  memoryCache.set(pathname, payload);

  if (!process.env.BLOB_READ_WRITE_TOKEN) return { persisted: false };

  await put(pathname, payload, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return { persisted: true };
};
