import { ESTADOS_BRASIL } from '../constants';

const STATE_NAME_TO_UF: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
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

export const reverseGeocodeToUF = async (latitude: number, longitude: number) => {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'pt',
  });

  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return '';
  return extractBrazilianStateUF(await response.json());
};
