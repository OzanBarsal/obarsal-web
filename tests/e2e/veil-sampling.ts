export type Sample = { label: string; colour: string; token: string | null; bound: number | null; raw: number; effective: number };
export type Sampling = { samples: Sample[]; counts: { selector: string; kept: number }[] };

// The veil's stops are read from the computed gradient, not hardcoded: the invariant is the product
// of the field's alpha and the veil's, so a change to either side has to move this number.
export const sampleEffectiveAlpha = ({ bounds, selectors, frames }: { bounds: Record<string, number>; selectors: string[]; frames: number }) =>
  new Promise<Sampling>((resolve) => {
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
    const stopsOf = (image: string): { at: number; alpha: number }[] => {
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
      return parts
        .map((part) => ({ part, at: /(-?[\d.]+)%\s*$/.exec(part) }))
        .filter((p): p is { part: string; at: RegExpExecArray } => p.at !== null)
        .map((p) => ({ at: Number(p.at[1]) / 100, alpha: alphaOf(p.part) }));
    };
    const veilAt = (stops: { at: number; alpha: number }[], f: number): number => {
      if (stops.length === 0) return 0;
      if (f <= stops[0]!.at) return stops[0]!.alpha;
      for (let i = 1; i < stops.length; i += 1) {
        const from = stops[i - 1]!;
        const to = stops[i]!;
        if (f <= to.at) return from.alpha + (to.alpha - from.alpha) * ((f - from.at) / (to.at - from.at));
      }
      return stops[stops.length - 1]!.alpha;
    };
    const onScreen = (r: DOMRect) => r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;

    const counts: { selector: string; kept: number }[] = [];
    const targets = selectors.flatMap((selector) => {
      const nodes = [...document.querySelectorAll(selector)];
      const kept = nodes
        .map((node, i) => ({ node, label: nodes.length > 1 ? `${selector} #${i + 1}` : selector }))
        .filter(({ node }) => onScreen(node.getBoundingClientRect()));
      counts.push({ selector, kept: kept.length });
      return kept.map(({ node, label }) => {
        let host: Element | null = node;
        while (host && !getComputedStyle(host).backgroundImage.includes('linear-gradient')) host = host.parentElement;
        const image = host ? getComputedStyle(host).backgroundImage : '';
        const colour = getComputedStyle(node).color;
        const found = byColour.get(colour);
        return {
          node,
          host,
          stops: stopsOf(image),
          horizontal: image.includes('to right'),
          label,
          colour,
          token: found?.token ?? null,
          bound: found?.bound ?? null,
          raw: 0,
          effective: 0,
        };
      });
    });

    const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
    const dpr = canvas.width / canvas.clientWidth;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d')!;
    ctx.globalCompositeOperation = 'copy';
    const drawn = () => Number(canvas.dataset.frames ?? 0);
    const startFrame = drawn();
    const step = () => {
      ctx.drawImage(canvas, 0, 0);
      for (const target of targets) {
        const box = target.host?.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(target.node);
        for (const line of range.getClientRects()) {
          const w = Math.max(1, Math.floor(line.width * dpr));
          const h = Math.max(1, Math.floor(line.height * dpr));
          const x0 = Math.floor(line.left * dpr);
          const y0 = Math.floor(line.top * dpr);
          const px = ctx.getImageData(x0, y0, w, h).data;
          for (let i = 0; i < w * h; i += 1) {
            const a = px[i * 4 + 3]! / 255;
            if (a > target.raw) target.raw = a;
            if (a <= target.effective) continue;
            const x = (x0 + (i % w)) / dpr;
            const y = (y0 + Math.floor(i / w)) / dpr;
            const f = box ? Math.max(0, target.horizontal ? (x - box.left) / box.width : (y - box.top) / box.height) : 1;
            const effective = a * (1 - veilAt(target.stops, f));
            if (effective > target.effective) target.effective = effective;
          }
        }
      }
      if (drawn() - startFrame < frames) requestAnimationFrame(step);
      else resolve({ counts, samples: targets.map(({ label, colour, token, bound, raw, effective }) => ({ label, colour, token, bound, raw, effective })) });
    };
    requestAnimationFrame(step);
  });
