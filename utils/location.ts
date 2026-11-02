import { ESTADOS_BRASIL } from '../constants';
import { timeoutSignal } from './timeoutSignal';

export const STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};


export const normalizeLocationUF = (value?: string | null) => {
  if (!value) return '';
  const uf = value.trim().toUpperCase();
  return ESTADOS_BRASIL.includes(uf) ? uf : '';
};

const normalizeText = (value?: string | null) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const STATE_NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([uf, name]) => [normalizeText(name), uf]),
);

const extractUFToken = (value?: string | null) => {
  if (!value) return '';
  const code = value.trim().toUpperCase();
  const exact = normalizeLocationUF(code);
  if (exact) return exact;

  const token = code.split(/[-_/\s]+/).find((part) => normalizeLocationUF(part));
  return normalizeLocationUF(token);
};

export const extractBrazilianStateUF = (data: Record<string, any> | null | undefined) => {
  if (!data || typeof data !== 'object') return '';

  const countryCode = typeof data.countryCode === 'string' ? data.countryCode.trim().toUpperCase() : '';
  if (countryCode && countryCode !== 'BR') return '';

  const directCandidates = [
    data.principalSubdivisionCode,
    data.principalSubdivision,
    data.region,
    data.regionCode,
    data.state,
    data.stateCode,
  ];

  for (const candidate of directCandidates) {
    const uf = extractUFToken(candidate);
    if (uf) return uf;

    const byName = STATE_NAME_TO_UF[normalizeText(candidate)];
    if (byName) return byName;
  }

  const localityInfo = data.localityInfo;
  const adminLevels = [
    ...(Array.isArray(localityInfo?.administrative) ? localityInfo.administrative : []),
    ...(Array.isArray(localityInfo?.informative) ? localityInfo.informative : []),
  ];

  for (const item of adminLevels) {
    const uf = extractUFToken(item?.isoCode || item?.code || item?.name);
    if (uf) return uf;

    const byName = STATE_NAME_TO_UF[normalizeText(item?.name || item?.description)];
    if (byName) return byName;
  }

  return '';
};

const GEOCODE_TIMEOUT_MS = 8000;

export const reverseGeocodeToUF = async (latitude: number, longitude: number) => {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
    localityLanguage: 'pt',
  });

  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal: timeoutSignal(GEOCODE_TIMEOUT_MS),
  });

  if (!response.ok) return '';
  return extractBrazilianStateUF(await response.json());
};
