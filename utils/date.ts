const pad = (n: number) => String(n).padStart(2, '0');

const buildLocalDate = (year: number, month: number, day: number): Date | null => {
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

/**
 * Converte "AAAA-MM-DD", ISO com horário ("AAAA-MM-DDTHH:mm...") ou "DD/MM/AAAA"
 * em uma data local à meia-noite, sem deslocar o dia por causa do fuso (UTC-3).
 * Retorna null quando o valor está ausente ou é inválido.
 */
export const parseLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const text = String(value).trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(text);
  if (iso) return buildLocalDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (br) return buildLocalDate(Number(br[3]), Number(br[2]), Number(br[1]));

  return null;
};

export const toDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatLocalDate = (
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
  fallback = ''
): string => {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString('pt-BR', options) : fallback;
};
