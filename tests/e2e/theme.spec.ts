import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { watchBrowserErrors } from './browser';

test.beforeEach(async ({ page }) => {
  watchBrowserErrors(page);
  await page.goto('./');
});

test('keyboard skip link reaches the calculator', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Перейти к калькулятору' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('light, dark and system persist independently of calculations', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Камер', { exact: true }).fill('1');
  await page.getByLabel('Битрейт на камеру, Mbps').fill('1');
  for (const theme of ['light', 'dark', 'system']) {
    await page.getByLabel('Оформление').selectOption(theme);
    await expect(page.getByTestId('total-gb')).toHaveText('324');
    expect(await page.evaluate(() => localStorage.getItem('cctv-theme'))).toBe(theme);
  }
  await page.reload();
  await expect(page.getByLabel('Оформление')).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Оформление').selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('stored theme is applied before the app module loads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('cctv-theme', 'dark'));
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/assets\/.*\.js$/, async route => { await gate; await route.continue(); });
  const navigation = page.goto('./');
  try {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(17, 21, 31)');
    await expect(page.locator('#root')).toBeEmpty();
  } finally { release(); }
  await navigation;
  await expect(page.getByLabel('Оформление')).toHaveValue('dark');
});

test('invalid storage and denied storage do not break the app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cctv-theme', 'invalid'));
  await page.reload();
  await expect(page.getByLabel('Оформление')).toHaveValue('system');
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.reload();
  await page.getByLabel('Оформление').selectOption('dark');
  await expect(page.getByTestId('total-tb')).toHaveText('5,184TB');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const theme of ['light', 'dark']) {
  test(`${theme} WCAG states, reduced motion and keyboard`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByLabel('Оформление').selectOption(theme);
    for (const [width, height] of [[320, 568], [360, 800], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 900], [1440, 900], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    for (const state of ['initial', 'custom', 'invalid']) {
      if (state === 'custom') {
        await page.getByRole('combobox', { name: 'Разрешение', exact: true }).selectOption('custom');
        await page.getByLabel('Режим записи').selectOption('daily');
      }
      if (state === 'invalid') await page.getByLabel('Камер', { exact: true }).fill('1.5');
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(audit.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
    }
    const reset = page.getByRole('button', { name: 'Сбросить' });
    await reset.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('total-tb')).toHaveText('5,184TB');
    await expect(reset).toHaveCSS('transition-duration', '0s');
    const input = page.getByLabel('Камер', { exact: true });
    await input.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Битрейт на камеру, Mbps')).toBeFocused();
    await expect(page.getByLabel('Битрейт на камеру, Mbps')).toHaveCSS('outline-style', 'solid');
    await expect(page.getByRole('status')).toContainText('5,184');
  });
}
