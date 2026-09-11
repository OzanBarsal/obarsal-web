
// The brightest colour the field can put behind text. The tip and spark passes composite additively
// with no clamp, so they accumulate past `--accent` and saturate at the framebuffer's ceiling: a
// settled field measures rgb(255, 255, 92..104), which straddles any sampled constant, so the model
// takes the ceiling itself. `field-colour.spec.ts` holds the field to it.
export const FIELD_CEILING = '#FFFFFF';

const channel = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);

/** WCAG relative luminance of a `#rrggbb` colour. */
export const luminance = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

// The most field alpha each token can take and still hold 4.5:1 over FIELD_CEILING on --ground.
// Each is floored to 3dp so none is rounded loose. Shared, so the geometric and the composite guard
// cannot drift apart.
export const BOUNDS: Record<string, number> = {
  text: 0.394,
  body: 0.256,
  'skill-text': 0.311,
  'muted-hi': 0.162,
  muted: 0.126,
};

export type Run = { label: string; colour: string; token: string | null; bound: number | null; alpha: number; opaque: boolean };

// Geometric, not photographic: the veil's transmission at a run's own extent bounds what the field
// can ever show through it, whatever the field is drawing. `to bottom` serialises with no keyword.
export const sweepVeilAlpha = ({ bounds, exempt }: { bounds: Record<string, number>; exempt: string }): Run[] => {
  const probe = document.createElement('div');
  document.body.append(probe);
  const byColour = new Map<string, { token: string; bound: number }>();
  for (const [token, bound] of Object.entries(bounds)) {
    probe.style.color = `var(--${token})`;
    byColour.set(getComputedStyle(probe).color, { token, bound });
  }
  probe.remove();

  const alphaOf = (colour: string): number => {
    const slashed = /\/\s*([\d.]+)\s*\)/.exec(colour);
    if (slashed) return Number(slashed[1]);
    const channels = /rgba?\(([^)]*)\)/.exec(colour)?.[1]?.split(',') ?? [];
    return channels.length > 3 ? Number(channels[3]) : 1;
  };
  const partsOf = (image: string): string[] => {
    const inner = image.slice(image.indexOf('(') + 1, image.lastIndexOf(')'));
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of inner) {
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      if (ch === ',' && depth === 0) { parts.push(current); current = ''; } else current += ch;
    }
    parts.push(current);
    return parts;
  };
  const stopsOf = (image: string): { at: number; alpha: number }[] =>
    partsOf(image)
      .map((part) => ({ part, at: /(-?[\d.]+)%\s*$/.exec(part) }))
      .filter((p): p is { part: string; at: RegExpExecArray } => p.at !== null)
      .map((p) => ({ at: Number(p.at[1]) / 100, alpha: alphaOf(p.part) }));
  // Any stop below full alpha makes it a veil rather than a surface. Not narrowed to `rgb(`-shaped
  // colours: a translucent stop serialises as `oklab(... / 0.88)`, and `alphaOf` reads a non-colour
  // part such as the axis as opaque anyway.
  const sees = (image: string): boolean => partsOf(image).some((part) => alphaOf(part) < 1);
  // Matched on the serialised axis rather than one keyword: a rewrite to 90deg must not silently
  // flip which way the run's extent is measured.
  const axisOf = (image: string): 'x' | 'y' => {
    const head = partsOf(image)[0] ?? '';
    if (/\bto (left|right)\b|\b(90|270)deg\b/.test(head)) return 'x';
    if (/\bto (top|bottom)\b|\b(0|180|360)deg\b/.test(head) || !/deg|\bto\b/.test(head)) return 'y';
    throw new Error(`veil gradient axis not recognised: ${head.trim()}`);
  };
  const veilAt = (stops: { at: number; alpha: number }[], f: number): number => {
    if (stops.length === 0) return 0;
    if (f <= stops[0]!.at) return stops[0]!.alpha;
    for (let i = 1; i < stops.length; i += 1) {
      const from = stops[i - 1]!, to = stops[i]!;
      if (f <= to.at) return from.alpha + (to.alpha - from.alpha) * ((f - from.at) / (to.at - from.at));
    }
    return stops[stops.length - 1]!.alpha;
  };

  const out: Run[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    if (exempt && el.closest(exempt)) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (rects.length === 0) continue;

    // The walk stops below <body>: its background propagates to the canvas and paints beneath the
    // field's fixed, negative z-index element, so it blocks nothing.
    let host: Element | null = el;
    let opaque = false;
    while (host && host !== document.body) {
      const s = getComputedStyle(host);
      if (alphaOf(s.backgroundColor) === 1) { opaque = true; break; }
      // A gradient whose every colour stop is opaque is a surface, not a veil: it blocks the field.
      if (s.backgroundImage.includes('linear-gradient')) {
        if (sees(s.backgroundImage)) break;
        opaque = true;
        break;
      }
      host = host.parentElement;
    }
    const colour = getComputedStyle(el).color;
    const found = byColour.get(colour);
    const label = `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 28)}"`;
    if (opaque || !host) {
      out.push({ label, colour, token: found?.token ?? null, bound: found?.bound ?? null, alpha: opaque ? 1 : 0, opaque });
      continue;
    }
    const image = getComputedStyle(host).backgroundImage;
    const stops = stopsOf(image);
    const horizontal = axisOf(image) === 'x';
    const box = host.getBoundingClientRect();
    let alpha = 1;
    for (const r of rects) {
      const a = horizontal ? (r.left - box.left) / box.width : (r.top - box.top) / box.height;
      const b = horizontal ? (r.right - box.left) / box.width : (r.bottom - box.top) / box.height;
      alpha = Math.min(alpha, veilAt(stops, a), veilAt(stops, b));
      for (const s of stops) if (s.at > a && s.at < b) alpha = Math.min(alpha, s.alpha);
    }
    out.push({ label, colour, token: found?.token ?? null, bound: found?.bound ?? null, alpha, opaque: false });
  }
  return out;
};
