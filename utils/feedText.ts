const normalize = (text?: string) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const CODE_ONLY_TITLE = /^[A-Za-zÀ-ú]{2,8}\s+[\d][\d./-]*$/;

const isCodeOnlyTitle = (title?: string) => CODE_ONLY_TITLE.test((title || '').trim());

export const resolveFeedTitle = (title: string, description?: string) => {
  const official = (description || '').replace(/\s+/g, ' ').trim();
  if (isCodeOnlyTitle(title) && official) return official;
  return title;
};

export const feedCode = (title: string, description?: string) =>
  isCodeOnlyTitle(title) && (description || '').trim() ? title.trim() : undefined;

export const isRedundantText = (title: string, text?: string) => {
  const t = normalize(title);
  const s = normalize(text);
  if (!s) return true;
  if (!t) return false;
  return s === t || s.startsWith(t) || (t.length >= 20 && s.includes(t)) || t.startsWith(s);
};

export const distinctSummary = (title: string, summary?: string) => {
  const clean = (summary || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const t = normalize(title);
  const s = normalize(clean);
  if (t.length >= 20 && s.includes(t) && !s.startsWith(t)) return '';
  if (!t || !s.startsWith(t)) return clean;
  const rest = clean.slice(Math.min(title.trim().length, clean.length)).replace(/^[\s.:;,\-–—]+/, '').trim();
  return normalize(rest) ? rest : '';
};

export const isUnknownPlace = (place?: string) => {
  const n = normalize(place);
  return !n || n === 'a definir' || n === 'nao informado';
};
