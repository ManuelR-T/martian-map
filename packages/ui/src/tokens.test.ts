import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function readTokens(selector: string): Record<string, string> {
  const block = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .find((match) => match[1].split(',').some((name) => name.split(';').at(-1)?.trim() === selector))?.[2];
  if (!block) throw new Error(`Bloc ${selector} introuvable dans styles.css.`);
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((match) => [match[1], match[2]]),
  );
}

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Texte courant : WCAG AA (4,5:1). Le système vise mieux, mais ne doit jamais passer dessous. */
const textPairs: readonly (readonly [string, string])[] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['foreground', 'muted'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'accent'],
  ['primary-foreground', 'primary'],
  ['primary', 'card'],
  ['primary', 'background'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['destructive', 'card'],
  ['destructive', 'background'],
  ['header-foreground', 'header'],
  ['danger', 'danger-surface'],
  ['warning', 'warning-surface'],
  ['success', 'success-surface'],
  ['info', 'info-surface'],
  ['foreground', 'danger-surface'],
  ['foreground', 'warning-surface'],
  ['foreground', 'success-surface'],
  ['foreground', 'info-surface'],
  ['muted-foreground', 'danger-surface'],
  ['muted-foreground', 'warning-surface'],
  ['mars-foreground', 'mars'],
  ['foreground', 'mars-surface'],
  ['muted-foreground', 'mars-surface'],
];

/** Texte principal : WCAG AAA (7:1), pour rester lisible derrière une visière ou sur un écran délavé. */
const primaryTextPairs: readonly (readonly [string, string])[] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['foreground', 'muted'],
  ['card-foreground', 'card'],
  ['accent-foreground', 'accent'],
  ['primary-foreground', 'primary'],
  ['header-foreground', 'header'],
  ['danger', 'danger-surface'],
  ['warning', 'warning-surface'],
  ['success', 'success-surface'],
];

/** Bordures de contrôles, focus et signaux graphiques : WCAG 1.4.11 (3:1). */
const graphicPairs: readonly (readonly [string, string])[] = [
  ['input', 'card'],
  ['input', 'background'],
  ['ring', 'card'],
  ['ring', 'background'],
  ['header-foreground', 'header'],
  ['mars', 'card'],
  ['mars', 'background'],
  ['mars', 'muted'],
  ['mars', 'mars-surface'],
  ['input', 'mars-surface'],
  ['danger-border', 'danger-surface'],
  ['warning-border', 'warning-surface'],
  ['success-border', 'success-surface'],
  ['info-border', 'info-surface'],
  ['danger-border', 'card'],
  ['warning-border', 'card'],
  ['success-border', 'card'],
  ['info-border', 'card'],
  ['danger', 'card'],
  ['warning', 'card'],
  ['success', 'card'],
  ['info', 'card'],
  ['input', 'muted'],
  ['primary', 'muted'],
];

describe.each([
  ['par défaut', ':root'],
  ['heure bleue', '.dark'],
])('jetons de couleur du thème %s', (_name, selector) => {
  const tokens = readTokens(selector);
  const ratio = (foreground: string, background: string) => {
    const [first, second] = [tokens[foreground], tokens[background]];
    if (!first || !second) throw new Error(`Jeton manquant : ${foreground} ou ${background}.`);
    return contrast(first, second);
  };

  it.each(textPairs)('%s sur %s reste lisible (≥ 4,5:1)', (foreground, background) => {
    expect(ratio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(primaryTextPairs)('%s sur %s dépasse le contraste renforcé (≥ 7:1)', (foreground, background) => {
    expect(ratio(foreground, background)).toBeGreaterThanOrEqual(7);
  });

  it.each(graphicPairs)('%s sur %s reste perceptible (≥ 3:1)', (foreground, background) => {
    expect(ratio(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});

describe('palette unique heure bleue', () => {
  it('définissent exactement les mêmes jetons de couleur', () => {
    expect(readTokens('.dark')).toEqual(readTokens(':root'));
  });
});
