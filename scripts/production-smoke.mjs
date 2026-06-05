import { URL } from 'node:url';

const APP_URL = process.env.SMOKE_APP_URL || 'https://papo-reto-beige.vercel.app';
const TIMEOUT_MS = 25000;

const fetchWithTimeout = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(new URL(path, APP_URL), {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${response.url}, received: ${text.slice(0, 200)}`);
  }
};

const main = async () => {
  const app = await fetchWithTimeout('/', { headers: { Accept: 'text/html' } });
  assert(app.ok, `App shell failed with ${app.status}`);

  const health = await fetchWithTimeout('/api/health');
  const healthPayload = await readJson(health);
  assert(health.ok && healthPayload.ok, 'Healthcheck is not ok');
  assert(healthPayload.integrations?.legislativeProxy === true, 'Legislative proxy is not enabled');

  const bootstrap = await fetchWithTimeout('/api/bootstrap');
  const bootstrapPayload = await readJson(bootstrap);
  const politiciansCount = bootstrapPayload.data?.politicians?.length || 0;
  assert(bootstrap.ok && bootstrapPayload.ok, 'Bootstrap is not ok');
  assert(politiciansCount >= 500, `Bootstrap returned too few politicians: ${politiciansCount}`);
  assert(Array.isArray(bootstrapPayload.data?.feedItems), 'Bootstrap feedItems missing');
  assert(Array.isArray(bootstrapPayload.data?.parties), 'Bootstrap parties missing');

  const blockedProxy = await fetchWithTimeout('/api/camara?url=https%3A%2F%2Fexample.com%2F');
  assert(blockedProxy.status === 400, `Proxy host guard returned ${blockedProxy.status}`);

  const cron = await fetchWithTimeout('/api/cron/refresh-legislative-data');
  assert(cron.status === 401 || cron.ok, `Cron guard returned unexpected status ${cron.status}`);

  console.log(JSON.stringify({
    ok: true,
    appUrl: APP_URL,
    politicians: politiciansCount,
    partial: Boolean(bootstrapPayload.partial),
    warnings: bootstrapPayload.warnings || [],
    source: bootstrapPayload.source,
  }, null, 2));
};

await main();
