const normalizeCursor = (cursor: number, total: number) =>
  total > 0 && Number.isFinite(cursor) ? ((Math.trunc(cursor) % total) + total) % total : 0;

export const pickRotatingFaces = (ids: number[], count: number, cursor: number): number[] => {
  const ordered = [...new Set(ids)].sort((a, b) => a - b);
  const size = Math.min(Math.max(0, Math.trunc(count)), ordered.length);
  const start = normalizeCursor(cursor, ordered.length);
  return Array.from({ length: size }, (_, offset) => ordered[(start + offset) % ordered.length]);
};

export const nextFacesCursor = (cursor: number, count: number, total: number) =>
  normalizeCursor(normalizeCursor(cursor, total) + count, total);
