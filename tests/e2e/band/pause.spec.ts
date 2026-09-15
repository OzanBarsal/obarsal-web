import { test, expect } from '@playwright/test';
import { site } from '../../../content';

const SECTION = `section[aria-labelledby="section-${site.clients.section.index}"]`;
const BAND = `${SECTION} div:has(> ul)`;
const SWITCH = `${SECTION} label > input[type="checkbox"][role="switch"]`;

test('the pause switch is named from content, sits under the band flush with its right edge, and is a 48px target', async ({ page }) => {
  await page.goto('/');
  const band = page.locator(BAND);
  await band.scrollIntoViewIfNeeded();
  const input = page.locator(SWITCH);
  await expect(input).toHaveAttribute('aria-label', site.clients.pauseLabel);
  await expect(input).not.toBeChecked();
  const bandBox = (await band.boundingBox())!;
  const box = (await page.locator(`${SECTION} label`).boundingBox())!;
  expect(box.width, 'target width').toBeGreaterThanOrEqual(48);
  expect(box.height, 'target height').toBeGreaterThanOrEqual(48);
  expect(Math.round(box.y), 'below the band').toBeGreaterThanOrEqual(Math.round(bandBox.y + bandBox.height));
  expect(Math.round(box.x + box.width), 'right edge').toBe(Math.round(bandBox.x + bandBox.width));
});

test('switching it on pauses the loop, off starts it again, by pointer and by keyboard', async ({ page }) => {
  await page.goto('/');
  const band = page.locator(BAND);
  await band.scrollIntoViewIfNeeded();
  const track = band.locator('ul');
  const input = page.locator(SWITCH);
  await expect(track).toHaveCSS('animation-play-state', 'running');
  await input.click();
  await expect(input).toBeChecked();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await page.mouse.move(0, 0);
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await input.focus();
  await page.keyboard.press('Space');
  await expect(input).not.toBeChecked();
  await expect(track).toHaveCSS('animation-play-state', 'running');
});

test.describe('under reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the wall does not move, so the switch is not rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(`${SECTION} ul`)).toHaveCSS('animation-name', 'none');
    await expect(page.locator(`${SECTION} label`)).toHaveCSS('display', 'none');
  });
});
