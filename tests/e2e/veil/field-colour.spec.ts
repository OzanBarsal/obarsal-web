import { test, expect } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { FIELD_CEILING, luminance } from './sweep';

test.beforeEach(({ page }) => allowSoftwareGpu(page));

// The bounds are only sound while the field stays inside FIELD_CEILING. Nothing can exceed white
// today, so this is loose on purpose: it is what fires if that constant is ever tightened, or if a
// shader change composites brighter than the model allows. The gate below is 200 live segments, which
// is a grown field and not a settled one — it fires around 0.7s, and the field keeps growing past it.
test('no pixel of the growing field composites brighter than the ceiling the bounds are solved against', { tag: '@slow' }, async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  await expect
    .poll(() => canvas.evaluate((c) => Number(c.getAttribute('data-live') ?? 0)), { timeout: 60_000 })
    .toBeGreaterThan(200);

  const seen = await page.evaluate(async (frames) => {
    const chan = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = (r: number, g: number, b: number) => 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
    const probe = document.createElement('div');
    document.body.append(probe);
    const rgbOf = (token: string) => {
      probe.style.color = `var(--${token})`;
      return /rgba?\(([^)]*)\)/.exec(getComputedStyle(probe).color)![1]!.split(',').map(Number) as number[];
    };
    const ground = rgbOf('ground');
    probe.remove();

    const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d')!;
    ctx.globalCompositeOperation = 'copy';
    let worst = { lum: -1, rgb: [0, 0, 0], alpha: 0 };
    for (let f = 0; f < frames; f += 1) {
      await new Promise((done) => requestAnimationFrame(done));
      ctx.drawImage(canvas, 0, 0);
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < px.length; i += 4) {
        const a = px[i + 3]! / 255;
        if (a === 0) continue;
        // Over --ground at the pixel's own alpha: unpremultiplied RGB alone saturates to white at
        // near-zero alpha and means nothing.
        const over = [0, 1, 2].map((k) => ground[k]! + (px[i + k]! - ground[k]!) * a);
        const l = lum(over[0]!, over[1]!, over[2]!);
        if (l > worst.lum) worst = { lum: l, rgb: [px[i]!, px[i + 1]!, px[i + 2]!], alpha: a };
      }
    }
    return { worst };
  }, 40);

  expect(
    seen.worst.lum,
    `brightest composite rgb(${seen.worst.rgb.join(', ')}) at alpha ${seen.worst.alpha.toFixed(3)} ` +
      `reaches luminance ${seen.worst.lum.toFixed(4)}, past FIELD_CEILING ${FIELD_CEILING} ` +
      `at ${luminance(FIELD_CEILING).toFixed(4)} — the bounds are solved against that and are now fiction`,
  ).toBeLessThanOrEqual(luminance(FIELD_CEILING));
});
