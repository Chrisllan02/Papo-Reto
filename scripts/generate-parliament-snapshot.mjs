import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'public/snapshots/parlamentares.json');
const CAMARA_URL = 'https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome';
const SENADO_URL = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';
const MIN_DEPUTIES = 460;
const MIN_SENATORS = 73;
const TIMEOUT_MS = 30000;
const DEPUTY_FIELDS = ['id', 'nome', 'siglaPartido', 'siglaUf', 'urlFoto', 'email'];

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${url} respondeu ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const asArray = (value) => (value === null || value === undefined ? [] : Array.isArray(value) ? value : [value]);

const [camara, senado] = await Promise.all([fetchJson(CAMARA_URL), fetchJson(SENADO_URL)]);

const deputados = asArray(camara?.dados).map((item) =>
  Object.fromEntries(DEPUTY_FIELDS.map((field) => [field, item?.[field] ?? null])));
const senadores = asArray(senado?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar);

if (deputados.length < MIN_DEPUTIES || senadores.length < MIN_SENATORS) {
  console.error(`Snapshot incompleto: ${deputados.length} deputados e ${senadores.length} senadores. Nada foi gravado.`);
  process.exit(1);
}

const snapshot = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sources: { camaraDeputados: CAMARA_URL, senadoSenadores: SENADO_URL },
  camara: { dados: deputados },
  senado: { ListaParlamentarEmExercicio: { Parlamentares: { Parlamentar: senadores } } },
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(snapshot)}\n`);
console.log(`Snapshot gravado: ${deputados.length} deputados e ${senadores.length} senadores em ${snapshot.generatedAt}.`);
