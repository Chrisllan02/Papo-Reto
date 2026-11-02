import type { Politician } from '../../types';
import { formatPersonName, normalizeSex } from './text.js';

export const SENADO_SENADORES_URL = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';

type JsonRecord = Record<string, unknown>;

export const asArray = <T = unknown>(value: T | T[] | null | undefined): T[] => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};

const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

const isYes = (value: unknown) => text(value).toLowerCase() === 'sim';

const parseSenator = (raw: unknown): Politician | null => {
  const parlamentar = asRecord(raw);
  const identity = asRecord(parlamentar.IdentificacaoParlamentar);
  const mandate = asRecord(parlamentar.Mandato);

  const id = Number(text(identity.CodigoParlamentar));
  if (!Number.isInteger(id) || id <= 0) return null;

  const name = formatPersonName(text(identity.NomeParlamentar) || text(identity.NomeCompletoParlamentar));
  const party = text(identity.SiglaPartidoParlamentar);
  const state = text(identity.SiglaUfParlamentar) || text(identity.UfParlamentar) || text(mandate.UfParlamentar);
  if (!name || !party || !state) return null;

  const sex = normalizeSex(text(identity.SexoParlamentar));
  const legislatures = [mandate.PrimeiraLegislaturaDoMandato, mandate.SegundaLegislaturaDoMandato].map(asRecord);
  const mandateStarts = legislatures.map(item => text(item.DataInicio)).filter(Boolean).sort();
  const mandateEnds = legislatures.map(item => text(item.DataFim)).filter(Boolean).sort();
  const currentExercise = asArray(asRecord(mandate.Exercicios).Exercicio)
    .map(asRecord)
    .sort((a, b) => text(b.DataInicio).localeCompare(text(a.DataInicio)))[0] || {};
  const suplentes = asArray(asRecord(mandate.Suplentes).Suplente)
    .map(asRecord)
    .map(item => [text(item.DescricaoParticipacao), text(item.NomeParlamentar)].filter(Boolean).join(' - '))
    .filter(Boolean);
  const phone = asArray(asRecord(identity.Telefones).Telefone).map(asRecord).map(item => text(item.NumeroTelefone)).find(Boolean) || '';
  const participation = text(mandate.DescricaoParticipacao);

  return {
    id,
    name,
    party,
    partyShort: party,
    state,
    photo: text(identity.UrlFotoParlamentar),
    role: sex === 'F' ? 'Senadora' : sex === 'M' ? 'Senador' : 'Senador(a)',
    sex,
    civilName: formatPersonName(text(identity.NomeCompletoParlamentar)),
    email: text(identity.EmailParlamentar),
    cabinet: { phone },
    officialPage: text(identity.UrlPaginaParlamentar),
    website: text(identity.UrlPaginaParticular),
    parliamentaryBlock: text(asRecord(identity.Bloco).NomeBloco),
    isBoardMember: isYes(identity.MembroMesa),
    isLeader: isYes(identity.MembroLideranca),
    participation,
    exerciseStart: text(currentExercise.DataInicio),
    exerciseEnd: text(currentExercise.DataFim),
    condition: participation,
    suplentes,
    matchScore: 0,
    bio: '',
    stats: {
      attendancePct: 0,
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
      commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
      projects: 0,
      spending: 0,
      partyFidelity: undefined,
    },
    mandate: { start: mandateStarts[0] || '', end: mandateEnds[mandateEnds.length - 1] || '' },
    hasApiIntegration: false,
    votes: {},
  } as Politician;
};

export const parseSenadoresList = (payload: unknown): Politician[] => {
  const list = asRecord(asRecord(payload).ListaParlamentarEmExercicio);
  const seen = new Set<number>();
  return asArray(asRecord(list.Parlamentares).Parlamentar).flatMap((raw) => {
    const senator = parseSenator(raw);
    if (!senator || seen.has(senator.id)) return [];
    seen.add(senator.id);
    return [senator];
  });
};
