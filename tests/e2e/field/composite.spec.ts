import { test, expect } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';
import { horizonFraction } from '../../../lib/field/camera';
import { DRIFT } from '../../../lib/field/constants';

test.beforeEach(({ page }) => allowSoftwareGpu(page));

// Row minima, not single pixels: the field may cover any one pixel, but the darkest channel values
// of a row are sky wherever at least one pixel of the row shows it. The read waits for the frame the
// renderer draws: the context keeps no drawing buffer, so a presented one reads back empty.
const rowMinima = (fractions: number[]) => new Promise<{ alphaMin: number; rows: number[][]; drew: boolean }>((resolve) => {
  const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
  const drawn = () => Number(canvas.dataset.frames ?? 0);
  const at = drawn();
  const read = (drew: boolean) => {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let alphaMin = 255;
    for (let i = 3; i < data.length; i += 4) alphaMin = Math.min(alphaMin, data[i]!);
    const rows = fractions.map((f) => {
      const y = Math.min(canvas.height - 1, Math.round(f * (canvas.height - 1)));
      const min = [255, 255, 255];
      for (let x = 0; x < canvas.width; x += 1) for (let k = 0; k < 3; k += 1) min[k] = Math.min(min[k]!, data[(y * canvas.width + x) * 4 + k]!);
      return min;
    });
    resolve({ alphaMin, rows, drew });
  };
  let waited = 0;
  const tick = () => {
    if (drawn() > at) read(true);
    else if ((waited += 1) > 180) read(false);
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const tokenRgb = (page: import('@playwright/test').Page, names: string[]) => page.evaluate((tokens) => {
  const probe = document.createElement('div');
  document.body.append(probe);
  const out = tokens.map((t) => {
    probe.style.color = `var(--${t})`;
    return /rgba?\(([^)]*)\)/.exec(getComputedStyle(probe).color)![1]!.split(',').map(Number);
  });
  probe.remove();
  return out;
}, names);

// The drift's per-channel swing is at most DRIFT * 255; the extra step covers the dither and the
// quantisation, each half a step.
const NOISE = Math.ceil(DRIFT * 255) + 1;

const near = (got: number[], want: number[], label: string) => {
  for (let k = 0; k < 3; k += 1) expect(Math.abs(got[k]! - want[k]!), `${label} channel ${k}: ${got.join(',')} against ${want.join(',')}`).toBeLessThanOrEqual(NOISE);
};

test('the running canvas is opaque and each sampled row minimum is within drift and dither of the CSS sky at that row: --ground at the top, --sky-mid at the horizon, --sky-low at the bottom', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  await expect.poll(() => canvas.evaluate((c) => Number(c.getAttribute('data-frames') ?? 0)), { timeout: 10_000 }).toBeGreaterThan(3);
  const size = page.viewportSize()!;
  const h = horizonFraction(size.width, size.height);
  const [ground, mid, low] = await tokenRgb(page, ['ground', 'sky-mid', 'sky-low']);
  const { alphaMin, rows, drew } = await page.evaluate(rowMinima, [0, h, 1]);
  expect(drew, 'no frame was drawn').toBe(true);
  expect(alphaMin, 'a transparent pixel: the composite did not cover the canvas').toBe(255);
  near(rows[0]!, ground!, 'top row');
  near(rows[1]!, mid!, 'horizon row');
  near(rows[2]!, low!, 'bottom row');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the still frame is one composite: opaque, with its horizon row minimum within drift and dither of --sky-mid', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('body > canvas');
    await expect(canvas).toHaveAttribute('data-state', 'still', { timeout: 10_000 });
    const size = page.viewportSize()!;
    const [mid] = await tokenRgb(page, ['sky-mid']);
    const reading = page.evaluate(rowMinima, [horizonFraction(size.width, size.height)]);
    await page.setViewportSize({ width: size.width, height: size.height + 1 });
    const { alphaMin, rows, drew } = await reading;
    expect(drew, 'no frame was drawn').toBe(true);
    expect(alphaMin, 'a transparent pixel: the composite did not cover the canvas').toBe(255);
    near(rows[0]!, mid!, 'horizon row');
  });
});

test('a lost context sets the canvas off and leaves the CSS sky on the element', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  await canvas.evaluate((c) => {
    const gl = (c as HTMLCanvasElement).getContext('webgl2')!;
    gl.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(canvas).toHaveAttribute('data-state', 'off');
  const bg = await canvas.evaluate((c) => getComputedStyle(c).backgroundImage);
  expect(bg).not.toContain('radial-gradient');
  expect(bg).toContain('linear-gradient');
});
