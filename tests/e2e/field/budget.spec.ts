import { test, expect, type Locator, type Page } from '@playwright/test';
import { allowSoftwareGpu } from '../software-gpu';

const UPLOAD_BUDGET = 160_000;
const SETTLED = 35_000;

async function running(page: Page): Promise<Locator> {
  await page.goto('/');
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  return canvas;
}

const frames = (canvas: Locator) => canvas.evaluate((c) => Number(c.getAttribute('data-frames') ?? 0));

// Sampled once per frame, not on a timer: `data-upload` is a single-frame spike, so only a
// per-frame read is certain to see every one.
const peakOverThreeSeconds = (canvas: Locator, attribute: string) =>
  canvas.evaluate(
    (c, name) =>
      new Promise<number>((resolve) => {
        let peak = 0;
        const started = performance.now();
        const sample = () => {
          peak = Math.max(peak, Number(c.getAttribute(name) ?? 0));
          if (performance.now() - started < 3000) requestAnimationFrame(sample);
          else resolve(peak);
        };
        requestAnimationFrame(sample);
      }),
    attribute,
  );

test('on a hardware GPU, the field runs for five seconds without a main-thread long task', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('body > canvas');
  await expect(canvas).toHaveAttribute('data-state', /running|off/, { timeout: 10_000 });
  const renderer = await page.evaluate(() => {
    const gl = (document.querySelector('body > canvas') as HTMLCanvasElement).getContext('webgl2')!;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });
  test.skip(/SwiftShader/i.test(renderer), `software renderer: ${renderer}`);
  await expect(canvas).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  const long = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let count = 0;
        const observer = new PerformanceObserver((list) => {
          count += list.getEntries().length;
        });
        observer.observe({ type: 'longtask' });
        setTimeout(() => {
          observer.disconnect();
          resolve(count);
        }, 5000);
      }),
  );
  expect(long, 'long tasks while the field runs').toBe(0);
});

test.describe('with the software-renderer check hidden', () => {
  test.beforeEach(({ page }) => allowSoftwareGpu(page));

  test("once the field has filled, the main thread's own work per frame stays at or under 16 ms", { tag: '@slow' }, async ({ page }) => {
    test.setTimeout(120_000);
    const canvas = await running(page);
    await page.waitForTimeout(SETTLED);
    expect(Number(await canvas.getAttribute('data-live')), 'the field never filled: data-live is 0').toBeGreaterThan(0);
    const before = await frames(canvas);
    const peak = await peakOverThreeSeconds(canvas, 'data-cpu');
    expect(await frames(canvas), 'no frames advanced while data-cpu was sampled').toBeGreaterThan(before);
    expect(peak, 'data-cpu was never written').toBeGreaterThan(0);
    expect(peak, "the frame's CPU section, in ms").toBeLessThanOrEqual(16);
  });

  test('once the field has filled, no frame uploads more than 160 000 bytes of geometry', { tag: '@slow' }, async ({ page }) => {
    test.setTimeout(120_000);
    const canvas = await running(page);
    await page.waitForTimeout(SETTLED);
    expect(Number(await canvas.getAttribute('data-live')), 'the field never filled: data-live is 0').toBeGreaterThan(0);
    const before = await frames(canvas);
    const peak = await peakOverThreeSeconds(canvas, 'data-upload');
    expect(await frames(canvas), 'no frames advanced while data-upload was sampled').toBeGreaterThan(before);
    expect(peak, 'data-upload was never written').toBeGreaterThan(0);
    expect(peak, 'bytes uploaded in one frame').toBeLessThanOrEqual(UPLOAD_BUDGET);
  });

  test('the root paints no background of its own, so the field at z-index −2 shows through', async ({ page }) => {
    await page.goto('/');
    const painted = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'var(--ground)';
      document.body.append(probe);
      const ground = getComputedStyle(probe).color;
      probe.remove();
      return {
        root: getComputedStyle(document.documentElement).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        ground,
      };
    });
    expect(painted.root, 'a root background would paint over the canvas').toBe('rgba(0, 0, 0, 0)');
    expect(painted.body, 'the body carries --ground and propagates it to the root').toBe(painted.ground);
  });
});
