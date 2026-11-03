import { Unzip, UnzipInflate } from 'fflate';
import { readServerCache, writeServerCache } from './serverCache.js';

export const CONGRESS_NUMBERS_CACHE_KEY = 'congress-numbers-v1';
export const CONGRESS_NUMBERS_TTL_MS = 36 * 60 * 60 * 1000;

const SEATS = 513;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const TOP_CATEGORIES = 4;

export type CsvRecord = Record<string, string>;

export type PresenceNumbers = {
  year: number;
  votes: number;
  averagePct: number;
  lastDate: string;
  months: { month: string; votes: number; pct: number }[];
};

export type QuotaCategory = { key: string; label: string; value: number; pct: number };

export type QuotaNumbers = {
  year: number;
  total: number;
  firstMonth: string;
  lastMonth: string;
  perSeatMonthly: number;
  topCategories: QuotaCategory[];
};

export type CongressNumbers = {
  generatedAt: string;
  presence: PresenceNumbers | null;
  quota: QuotaNumbers | null;
  warnings: string[];
  sources: { votings: string; votes: string; quota: string };
};

export const sourceUrls = (year: number) => ({
  votings: `https://dadosabertos.camara.leg.br/arquivos/votacoes/csv/votacoes-${year}.csv`,
  votes: `https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/csv/votacoesVotos-${year}.csv`,
  quota: `https://www.camara.leg.br/cotas/Ano-${year}.csv.zip`,
});

export const currentYearInSaoPaulo = (now = new Date()) =>
  Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(now));

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

export const createCsvParser = (onRecord: (record: CsvRecord) => void, separator = ';') => {
  let header: string[] | null = null;
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let pendingQuote = false;
  let started = false;

  const endField = () => {
    row.push(field);
    field = '';
  };

  const endRow = () => {
    endField();
    const current = row;
    row = [];
    if (current.length === 1 && current[0] === '') return;
    if (!header) {
      header = current.map((name) => name.replace(/^\uFEFF/, '').trim());
      return;
    }
    const record: CsvRecord = {};
    for (let i = 0; i < header.length; i += 1) record[header[i]] = current[i] ?? '';
    onRecord(record);
  };

  const write = (text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (!started) {
        started = true;
        if (char === '\uFEFF') continue;
      }
      if (pendingQuote) {
        pendingQuote = false;
        if (char === '"') {
          field += '"';
          continue;
        }
        inQuotes = false;
      }
      if (inQuotes) {
        if (char === '"') pendingQuote = true;
        else field += char;
        continue;
      }
      if (char === '"') inQuotes = true;
      else if (char === separator) endField();
      else if (char === '\n') endRow();
      else if (char !== '\r') field += char;
    }
  };

  const end = () => {
    pendingQuote = false;
    inQuotes = false;
    if (field !== '' || row.length > 0) endRow();
  };

  return { write, end };
};

export const parseCsv = (text: string, separator = ';') => {
  const records: CsvRecord[] = [];
  const parser = createCsvParser((record) => records.push(record), separator);
  parser.write(text);
  parser.end();
  return records;
};

export const createPresenceBuilder = () => {
  const plenary = new Map<string, string>();
  const counts = new Map<string, number>();

  return {
    addVoting(record: CsvRecord) {
      if (record.siglaOrgao !== 'PLEN') return;
      const id = record.id?.trim();
      const date = record.data?.trim().slice(0, 10);
      if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return;
      plenary.set(id, date);
    },
    addVote(record: CsvRecord) {
      const id = record.idVotacao?.trim();
      if (!id || !plenary.has(id)) return;
      counts.set(id, (counts.get(id) || 0) + 1);
    },
    build(year: number): PresenceNumbers | null {
      const byMonth = new Map<string, { votes: number; sum: number }>();
      let sum = 0;
      let lastDate = '';
      for (const [id, count] of counts) {
        const date = plenary.get(id) as string;
        sum += count;
        if (date > lastDate) lastDate = date;
        const month = date.slice(0, 7);
        const bucket = byMonth.get(month) || { votes: 0, sum: 0 };
        bucket.votes += 1;
        bucket.sum += count;
        byMonth.set(month, bucket);
      }
      if (counts.size === 0) return null;
      const pctOf = (total: number, votes: number) => round1((total / votes / SEATS) * 100);
      return {
        year,
        votes: counts.size,
        averagePct: pctOf(sum, counts.size),
        lastDate,
        months: [...byMonth.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, bucket]) => ({ month, votes: bucket.votes, pct: pctOf(bucket.sum, bucket.votes) })),
      };
    },
  };
};

const slug = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const capitalize = (text: string) => {
  const lower = text.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const quotaLabel = (description: string) => {
  const text = description.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (text.includes('divulgacao')) return 'Divulgação';
  if (text.includes('locacao') && text.includes('veiculos')) return 'Carros';
  if (text.includes('escritorio')) return 'Escritório';
  if (text.includes('combustiveis')) return 'Combustível';
  if (text.includes('hospedagem')) return 'Hospedagem';
  if (text.includes('passagem')) return 'Passagens';
  if (text.includes('telefonia')) return 'Telefone';
  if (text.includes('alimentacao')) return 'Alimentação';
  return capitalize(description);
};

const parseMoney = (raw: string) => {
  const value = raw.trim();
  if (!value) return NaN;
  return Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value);
};

export const createQuotaBuilder = () => {
  const byLabel = new Map<string, number>();
  let total = 0;
  let firstMonth = Infinity;
  let lastMonth = -Infinity;

  return {
    add(record: CsvRecord) {
      if (!record.nuDeputadoId?.trim() || record.sgUF?.trim() === 'NA') return;
      const value = parseMoney(record.vlrLiquido || '');
      const month = Number(record.numMes);
      if (!Number.isFinite(value) || !Number.isInteger(month) || month < 1 || month > 12) return;
      total += value;
      firstMonth = Math.min(firstMonth, month);
      lastMonth = Math.max(lastMonth, month);
      const label = quotaLabel(record.txtDescricao || '');
      byLabel.set(label, (byLabel.get(label) || 0) + value);
    },
    build(year: number): QuotaNumbers | null {
      if (!Number.isFinite(firstMonth) || total <= 0) return null;
      const months = lastMonth - firstMonth + 1;
      const monthKey = (month: number) => `${year}-${String(month).padStart(2, '0')}`;
      return {
        year,
        total: round2(total),
        firstMonth: monthKey(firstMonth),
        lastMonth: monthKey(lastMonth),
        perSeatMonthly: round2(total / months / SEATS),
        topCategories: [...byLabel.entries()]
          .sort(([, a], [, b]) => b - a)
          .slice(0, TOP_CATEGORIES)
          .map(([label, value]) => ({ key: slug(label), label, value: round2(value), pct: round1((value / total) * 100) })),
      };
    },
  };
};

const openStream = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`Upstream ${response.status}`);
  return response.body;
};

const streamCsv = async (url: string, onRecord: (record: CsvRecord) => void) => {
  const reader = (await openStream(url)).getReader();
  const decoder = new TextDecoder('utf-8');
  const parser = createCsvParser(onRecord);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.write(decoder.decode(value, { stream: true }));
  }
  parser.write(decoder.decode());
  parser.end();
};

const streamZippedCsv = async (url: string, onRecord: (record: CsvRecord) => void) => {
  const zip = new Uint8Array(await new Response(await openStream(url)).arrayBuffer());
  const decoder = new TextDecoder('utf-8');
  const parser = createCsvParser(onRecord);
  let found = false;
  let failure: Error | null = null;

  const unzip = new Unzip((file) => {
    if (found || !file.name.toLowerCase().endsWith('.csv')) return;
    found = true;
    file.ondata = (error, chunk, final) => {
      if (error) {
        failure = error;
        return;
      }
      parser.write(decoder.decode(chunk, { stream: !final }));
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  unzip.push(zip, true);

  if (failure) throw failure;
  if (!found) throw new Error('CSV not found in zip');
  parser.end();
};

export const buildCongressNumbers = async (): Promise<CongressNumbers> => {
  const year = currentYearInSaoPaulo();
  const sources = sourceUrls(year);
  const warnings: string[] = [];
  let presence: PresenceNumbers | null = null;
  let quota: QuotaNumbers | null = null;

  try {
    const builder = createPresenceBuilder();
    await streamCsv(sources.votings, (record) => builder.addVoting(record));
    await streamCsv(sources.votes, (record) => builder.addVote(record));
    presence = builder.build(year);
    if (!presence) warnings.push('presence: no plenary votes with recorded votes');
  } catch (error: any) {
    warnings.push(`presence: ${String(error?.message || 'failed').slice(0, 80)}`);
  }

  try {
    const builder = createQuotaBuilder();
    await streamZippedCsv(sources.quota, (record) => builder.add(record));
    quota = builder.build(year);
    if (!quota) warnings.push('quota: no expenses found');
  } catch (error: any) {
    warnings.push(`quota: ${String(error?.message || 'failed').slice(0, 80)}`);
  }

  return { generatedAt: new Date().toISOString(), presence, quota, warnings, sources };
};

export const readCongressNumbersCache = () => readServerCache<CongressNumbers>(CONGRESS_NUMBERS_CACHE_KEY, CONGRESS_NUMBERS_TTL_MS);

export const refreshCongressNumbers = async () => {
  const numbers = await buildCongressNumbers();
  if (!numbers.presence && !numbers.quota) return { numbers, persisted: false, skipped: true };
  const { persisted } = await writeServerCache(CONGRESS_NUMBERS_CACHE_KEY, numbers);
  return { numbers, persisted, skipped: false };
};
