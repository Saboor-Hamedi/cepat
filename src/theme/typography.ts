export const font = {
  caption: 11,
  body: 12,
  label: 13,
  subtitle: 14,
  title: 15,
  heading: 16,
  section: 20,
  display: 26,
} as const;

export type FontToken = keyof typeof font;

const TOKEN_BY_SIZE: readonly (readonly [number, FontToken])[] = [
  [11, 'caption'],
  [12, 'body'],
  [13, 'label'],
  [14, 'subtitle'],
  [15, 'title'],
  [16, 'heading'],
  [20, 'section'],
  [26, 'display'],
];

export function nearestFontToken(size: number): FontToken {
  let best: FontToken = 'body';
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const [value, token] of TOKEN_BY_SIZE) {
    const diff = Math.abs(value - size);
    if (diff < bestDiff) {
      best = token;
      bestDiff = diff;
    }
  }
  return best;
}
