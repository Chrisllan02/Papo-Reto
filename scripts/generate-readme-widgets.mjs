import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'readme');
const APP_URL = process.env.README_APP_URL || 'https://papo-reto-beige.vercel.app';
const TIMEOUT_MS = 8000;

const readJson = async (relativePath) => {
  const raw = await readFile(path.join(ROOT, relativePath), 'utf8');
  return JSON.parse(raw);
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PapoReto-README-Widget/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchText = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/plain, application/xml, text/xml, */*', 'User-Agent': 'PapoReto-README-Widget/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const getOfficialCounts = async () => {
  const camaraBase = 'https://dadosabertos.camara.leg.br/api/v2';
  const [deputados, votacoes, proposicoes, eventos, partidos, senadoresXml] = await Promise.all([
    fetchJson(`${camaraBase}/deputados?ordem=ASC&ordenarPor=nome`),
    fetchJson(`${camaraBase}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=10`),
    fetchJson(`${camaraBase}/proposicoes?ordem=DESC&ordenarPor=id&itens=10`),
    fetchJson(`${camaraBase}/eventos?ordem=DESC&ordenarPor=dataHoraInicio&itens=10`),
    fetchJson(`${camaraBase}/partidos?ordem=ASC&ordenarPor=sigla&itens=100`),
    fetchText('https://legis.senado.leg.br/dadosabertos/senador/lista/atual'),
  ]);
  const senatorCount = (senadoresXml?.match(/<Parlamentar>/g) || []).length;
  return {
    politicians: (deputados?.dados?.length || 0) + senatorCount,
    feedItems: (votacoes?.dados?.length || 0) + (proposicoes?.dados?.length || 0) + (eventos?.dados?.length || 0),
    parties: partidos?.dados?.length || 0,
  };
};

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const formatNumber = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR');
};

const formatDateTime = (date = new Date()) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
}).format(date);

const normalizeStatus = (enabled) => ({
  label: enabled ? 'ativo' : 'fallback',
  color: enabled ? '#16a34a' : '#f59e0b',
});

const renderCard = ({ title, subtitle, accent = '#2563eb', rows }) => {
  const rowMarkup = rows.map((row, index) => {
    const y = 92 + index * 44;
    const status = row.status || {};
    return `
      <g transform="translate(24 ${y})">
        <circle cx="7" cy="7" r="5" fill="${escapeXml(status.color || accent)}" opacity="0.95" />
        <text x="22" y="11" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="#e5e7eb">${escapeXml(row.label)}</text>
        <text x="314" y="11" text-anchor="end" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="13" font-weight="800" fill="#ffffff">${escapeXml(row.value)}</text>
        ${row.hint ? `<text x="22" y="29" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="10" fill="#94a3b8">${escapeXml(row.hint)}</text>` : ''}
      </g>
    `;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="250" viewBox="0 0 380 250" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <linearGradient id="accent" x1="0" x2="1">
      <stop offset="0%" stop-color="${escapeXml(accent)}" />
      <stop offset="100%" stop-color="#22c55e" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#020617" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="380" height="250" rx="22" fill="url(#bg)" filter="url(#shadow)" />
  <rect x="1" y="1" width="378" height="248" rx="21" fill="none" stroke="#334155" stroke-opacity="0.8" />
  <rect x="0" y="0" width="380" height="6" fill="url(#accent)" />
  <circle cx="323" cy="42" r="42" fill="${escapeXml(accent)}" opacity="0.14" />
  <circle cx="352" cy="20" r="22" fill="#22c55e" opacity="0.12" />
  <text x="24" y="38" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="20" font-weight="900" fill="#ffffff">${escapeXml(title)}</text>
  <text x="24" y="62" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="12" font-weight="600" fill="#94a3b8">${escapeXml(subtitle)}</text>
  ${rowMarkup}
  <text x="24" y="228" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="10" fill="#64748b">Atualizado em ${escapeXml(formatDateTime())}</text>
</svg>
`;
};

const writeSvg = async (filename, config) => {
  await writeFile(path.join(OUT_DIR, filename), renderCard(config), 'utf8');
};

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });

  const [pkg, health, initialBootstrap] = await Promise.all([
    readJson('package.json'),
    fetchJson(`${APP_URL}/api/health`),
    fetchJson(`${APP_URL}/api/bootstrap`),
  ]);

  const bootstrap = initialBootstrap?.data?.politicians?.length
    ? initialBootstrap
    : await fetchJson(`${APP_URL}/api/bootstrap?refresh=1`) || initialBootstrap;

  const integrations = health?.integrations || {};
  const data = bootstrap?.data || {};
  const shouldUseOfficialCounts = !data.politicians?.length;
  const officialCounts = shouldUseOfficialCounts ? await getOfficialCounts() : null;
  const counts = {
    politicians: shouldUseOfficialCounts ? officialCounts?.politicians || 0 : data.politicians?.length || 0,
    feedItems: shouldUseOfficialCounts ? officialCounts?.feedItems || 0 : data.feedItems?.length || 0,
    parties: shouldUseOfficialCounts ? officialCounts?.parties || 0 : data.parties?.length || 0,
  };
  const dependencies = Object.keys(pkg.dependencies || {});
  const devDependencies = Object.keys(pkg.devDependencies || {});

  await writeSvg('status.svg', {
    title: 'Status de produção',
    subtitle: APP_URL.replace(/^https?:\/\//, ''),
    accent: '#2563eb',
    rows: [
      { label: 'Aplicação', value: health?.ok ? 'online' : 'verificar', status: { color: health?.ok ? '#16a34a' : '#ef4444' }, hint: '/api/health' },
      { label: 'Proxy legislativo', value: normalizeStatus(integrations.legislativeProxy).label, status: normalizeStatus(integrations.legislativeProxy), hint: 'Câmara e Senado via BFF' },
      { label: 'IA', value: integrations.ai ? 'configurada' : 'fallback', status: normalizeStatus(integrations.ai), hint: 'Provedor opcional' },
    ],
  });

  await writeSvg('data.svg', {
    title: 'Dados legislativos',
    subtitle: data.politicians?.length ? `Fonte: ${bootstrap.source || 'bootstrap'}` : 'Fonte: dados oficiais',
    accent: '#16a34a',
    rows: [
      { label: 'Parlamentares', value: formatNumber(counts.politicians), status: { color: '#16a34a' }, hint: 'Deputados e senadores carregados' },
      { label: 'Atividades', value: formatNumber(counts.feedItems), status: { color: '#22c55e' }, hint: 'Feed legislativo recente' },
      { label: 'Partidos', value: formatNumber(counts.parties), status: { color: '#84cc16' }, hint: 'Metadados e composição' },
    ],
  });

  await writeSvg('quality.svg', {
    title: 'Qualidade técnica',
    subtitle: 'Baseline automatizada do projeto',
    accent: '#7c3aed',
    rows: [
      { label: 'Runtime', value: pkg.engines?.node || 'Node 18+', status: { color: '#7c3aed' }, hint: 'Vite + Vercel Functions' },
      { label: 'Dependências', value: `${dependencies.length} prod / ${devDependencies.length} dev`, status: { color: '#8b5cf6' }, hint: 'Audit de produção no CI' },
      { label: 'Checks', value: 'lint + test + build', status: { color: '#a855f7' }, hint: 'GitHub Actions' },
    ],
  });

  await writeFile(path.join(OUT_DIR, 'metrics.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    appUrl: APP_URL,
    health,
    counts: {
      politicians: counts.politicians,
      feedItems: counts.feedItems,
      parties: counts.parties,
      dependencies: dependencies.length,
      devDependencies: devDependencies.length,
    },
  }, null, 2), 'utf8');
};

await main();
