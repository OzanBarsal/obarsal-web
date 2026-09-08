import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CORE_CAP } from '../../lib/field/constants';

// A token-arithmetic guard rather than an axe assertion: axe reports a real
// contrast regression on these self-hosted fonts as `incomplete`, not a violation.
// `--nav-bg` is not covered — it is an `rgb()` with alpha, so the parser below
// never sees it.

const TOKENS_PATH = join(import.meta.dirname, '..', '..', 'app', 'styles', 'tokens.css');

// Read from disk, not hardcoded: a copy of the palette would only test itself.
function parseTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const pattern = /--([\w-]+):\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\s*;/g;
  for (const match of css.matchAll(pattern)) {
    const [, name, hex] = match;
    if (!name || !hex) continue;
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    tokens.set(name, `#${full}`);
  }
  return tokens;
}

/** WCAG relative luminance of a single sRGB channel (0-255). */
function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = channelLuminance((n >> 16) & 255);
  const g = channelLuminance((n >> 8) & 255);
  const b = channelLuminance(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#rrggbb` colours, always >= 1. */
function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// The combinations the design actually renders, not every permutation.
const PAIRS: readonly [foreground: string, background: string][] = [
  ['text', 'ground'],
  ['body', 'ground'],
  ['muted', 'ground'],
  ['accent', 'ground'],
  ['ground', 'accent'],
  ['muted-hi', 'ground'],
  ['skill-text', 'ground'],
  ['tag-text', 'tag-bg'],
  ['wall-text', 'cell'],
  ['muted', 'cell'],
  ['body', 'surface'],
  ['body', 'surface-2'],
  ['muted', 'surface'],
  ['text', 'surface'],
  ['muted', 'surface-2'],
  ['text', 'surface-2'],
];

const MINIMUM_RATIO = 4.5;

describe('token contrast (app/styles/tokens.css)', () => {
  const tokens = parseTokens(readFileSync(TOKENS_PATH, 'utf-8'));

  it.each(PAIRS)('%s on %s meets the 4.5:1 minimum', (foreground, background) => {
    const fg = tokens.get(foreground);
    const bg = tokens.get(background);
    expect(fg, `--${foreground} not found in app/styles/tokens.css`).toBeDefined();
    expect(bg, `--${background} not found in app/styles/tokens.css`).toBeDefined();

    const ratio = contrastRatio(fg!, bg!);
    expect(
      ratio,
      `--${foreground} (${fg}) on --${background} (${bg}) is ${ratio.toFixed(2)}:1, ` +
        `below the ${MINIMUM_RATIO}:1 WCAG AA minimum for text`,
    ).toBeGreaterThanOrEqual(MINIMUM_RATIO);
  });
});

/** `fg` composited over opaque `bg` at `alpha`, per sRGB channel. */
function blend(fg: string, bg: string, alpha: number): string {
  const f = Number.parseInt(fg.slice(1), 16);
  const b = Number.parseInt(bg.slice(1), 16);
  const channel = (shift: number) => {
    const over = (f >> shift) & 255;
    const under = (b >> shift) & 255;
    return Math.round(under + (over - under) * alpha).toString(16).padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

describe('field under the veil (lib/field/constants.ts)', () => {
  const TEXT = ['text', 'body', 'skill-text', 'muted-hi', 'muted', 'tag-text', 'wall-text'];
  const VEIL = 0.82;

  it('keeps every text token at 4.5:1 over the brightest core line under the veil', () => {
    const tokens = parseTokens(readFileSync(TOKENS_PATH, 'utf-8'));
    const effective = CORE_CAP * (1 - VEIL);
    const composite = blend(tokens.get('accent')!, tokens.get('ground')!, effective);
    for (const name of TEXT) {
      const fg = tokens.get(name);
      expect(fg, `--${name} not found in app/styles/tokens.css`).toBeDefined();
      const ratio = contrastRatio(fg!, composite);
      expect(
        ratio,
        `--${name} (${fg}) over the field at alpha ${effective.toFixed(3)} (${composite}) ` +
          `is ${ratio.toFixed(2)}:1, below the ${MINIMUM_RATIO}:1 WCAG AA minimum for text`,
      ).toBeGreaterThanOrEqual(MINIMUM_RATIO);
    }
  });
});
