export type Sample = { label: string; colour: string; token: string | null; bound: number | null; raw: number; effective: number };
export type Sampling = { veil: number; samples: Sample[]; counts: { selector: string; kept: number }[] };

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
    const veil = alphaOf(getComputedStyle(document.querySelector('.glass')!).backgroundColor);
    const onScreen = (r: DOMRect) => r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;

    const counts: { selector: string; kept: number }[] = [];
    const targets = selectors.flatMap((selector) => {
      const nodes = [...document.querySelectorAll(selector)];
      const kept = nodes
        .map((node, i) => ({ node, label: nodes.length > 1 ? `${selector} #${i + 1}` : selector }))
        .filter(({ node }) => onScreen(node.getBoundingClientRect()));
      counts.push({ selector, kept: kept.length });
      return kept.map(({ node, label }) => {
        const colour = getComputedStyle(node).color;
        const found = byColour.get(colour);
        return { node, label, colour, token: found?.token ?? null, bound: found?.bound ?? null, raw: 0 };
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
        const range = document.createRange();
        range.selectNodeContents(target.node);
        for (const line of range.getClientRects()) {
          const w = Math.max(1, Math.floor(line.width * dpr));
          const h = Math.max(1, Math.floor(line.height * dpr));
          const px = ctx.getImageData(Math.floor(line.left * dpr), Math.floor(line.top * dpr), w, h).data;
          for (let i = 0; i < w * h; i += 1) {
            const a = px[i * 4 + 3]! / 255;
            if (a > target.raw) target.raw = a;
          }
        }
      }
      if (drawn() - startFrame < frames) requestAnimationFrame(step);
      else resolve({
        veil,
        counts,
        samples: targets.map(({ label, colour, token, bound, raw }) => ({ label, colour, token, bound, raw, effective: raw * (1 - veil) })),
      });
    };
    requestAnimationFrame(step);
  });

export type Grid = { cells: number; filled: number };

export const sampleLitGrid = ({ fraction, columns, rows, threshold }: { fraction: number; columns: number; rows: number; threshold: number }) =>
  new Promise<Grid>((resolve) => {
    requestAnimationFrame(() => {
      const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const ctx = copy.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hit = new Uint8Array(columns * rows);
      for (let y = 0; y < canvas.height; y += 1) {
        const row = Math.floor((y / canvas.height) * rows) * columns;
        for (let x = 0; x < canvas.width; x += 1) {
          if (data[(y * canvas.width + x) * 4 + 3]! > threshold) hit[row + Math.floor((x / canvas.width) * columns)] = 1;
        }
      }
      let cells = 0;
      let filled = 0;
      for (let r = 0; r < rows; r += 1) {
        if ((r + 0.5) / rows <= fraction) continue;
        for (let c = 0; c < columns; c += 1) { cells += 1; filled += hit[r * columns + c]!; }
      }
      resolve({ cells, filled });
    });
  });

export const countLitPixels = ({ fromFraction, threshold }: { fromFraction: number; threshold: number }) =>
  new Promise<number>((resolve) => {
    requestAnimationFrame(() => {
      const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const ctx = copy.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);
      const top = Math.floor(canvas.height * fromFraction);
      const { data } = ctx.getImageData(0, top, canvas.width, canvas.height - top);
      let count = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > threshold) count += 1;
      resolve(count);
    });
  });
