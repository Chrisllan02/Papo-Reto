export interface SeatDot {
  x: number;
  y: number;
  r: number;
}

export const HEMICYCLE_WIDTH = 440;
export const HEMICYCLE_HEIGHT = 231;

const OUTER_RADIUS = 208;
const INNER_RATIO = 0.4;
const DOT_FILL = 0.42;

export const layoutHemicycle = (seats: number): SeatDot[] => {
  if (seats <= 0) return [];
  const rows = Math.max(2, Math.min(9, Math.round(Math.sqrt(seats) / 2.7)));
  const innerRadius = OUTER_RADIUS * INNER_RATIO;
  const gap = (OUTER_RADIUS - innerRadius) / (rows - 1);
  const radii = Array.from({ length: rows }, (_, row) => innerRadius + gap * row);
  const radiiSum = radii.reduce((sum, radius) => sum + radius, 0);

  const perRow = radii.map(radius => Math.max(1, Math.round((seats * radius) / radiiSum)));
  perRow[rows - 1] += seats - perRow.reduce((sum, count) => sum + count, 0);

  const arcGap = Math.min(...radii.map((radius, row) => (perRow[row] > 1 ? (Math.PI * radius) / (perRow[row] - 1) : Infinity)));
  const dotRadius = Math.min(gap, arcGap) * DOT_FILL;
  const centerX = HEMICYCLE_WIDTH / 2;
  const centerY = HEMICYCLE_HEIGHT - dotRadius - 4;

  const dots: (SeatDot & { angle: number; radius: number })[] = [];
  radii.forEach((radius, row) => {
    const count = perRow[row];
    for (let i = 0; i < count; i += 1) {
      const angle = count === 1 ? Math.PI / 2 : Math.PI - (Math.PI * i) / (count - 1);
      dots.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY - radius * Math.sin(angle),
        r: dotRadius,
        angle,
        radius,
      });
    }
  });

  return dots
    .sort((a, b) => b.angle - a.angle || a.radius - b.radius)
    .map(({ x, y, r }) => ({ x, y, r }));
};
