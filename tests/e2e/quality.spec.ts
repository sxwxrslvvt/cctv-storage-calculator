import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { watchBrowserErrors } from './browser';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { cls: 0, lcp: 0 };
    Object.defineProperty(window, '__cctvQAMetrics', { value: metrics });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  watchBrowserErrors(page);
  await page.goto('./');
});

test('WCAG accessibility baseline and screenshots', async ({ page }, testInfo) => {
  for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: testInfo.outputPath(`initial-${width}.png`), fullPage: true });
  }
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const auditPath = testInfo.outputPath('axe.json');
  await writeFile(auditPath, JSON.stringify(audit, null, 2));
  await testInfo.attach('axe.json', { path: auditPath, contentType: 'application/json' });
  expect(audit.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
});

test('all capacity units use independent byte conversion and reverse retention', async ({ page }) => {
  await page.getByLabel('Камер', { exact: true }).fill('1');
  await page.getByLabel('Битрейт на камеру, Mbps').fill('1');
  await page.getByLabel('Доступная ёмкость').fill('1');
  for (const [unit, bytes] of [['GB', 1000000000n], ['TB', 1000000000000n], ['GiB', 1073741824n], ['TiB', 1099511627776n]] as const) {
    await page.getByLabel('Единица ёмкости').selectOption(unit);
    const expected = Number(bytes) / Number(1000000n * 86400n / 8n);
    const text = (await page.getByTestId('retention').innerText()).replace(/\s|дн\./g, '').replace(',', '.');
    expect(Math.abs(Number(text) - expected)).toBeLessThanOrEqual(0.005);
  }
  await page.getByLabel('Режим записи').selectOption('daily');
  await page.getByLabel('Начало').fill('22:00');
  await page.getByLabel('Конец').fill('06:00');
  await expect(page.getByTestId('total-gb')).toHaveText('108');
  await page.getByLabel('Режим записи').selectOption('continuous');
  await expect(page.getByTestId('total-gb')).toHaveText('324');
  for (const codec of ['H.265', 'H.264']) {
    await page.getByLabel('Кодек').selectOption(codec);
    await expect(page.getByTestId('total-gb')).toHaveText('324');
  }
  await page.getByLabel('Камер', { exact: true }).fill('0');
  await page.getByLabel('Доступная ёмкость').fill('0');
  await expect(page.getByTestId('retention')).toHaveText('Без ограничения');
  await page.getByLabel('Камер', { exact: true }).fill('1');
  await expect(page.getByTestId('retention')).toHaveText('0 дн.');
});

test('text resize to 200% preserves controls and results', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const size = await page.getByLabel('Камер', { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const enlarged = await page.getByLabel('Камер', { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(enlarged).toBeGreaterThanOrEqual(size * 1.99);
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 });
    for (const font of ['Arial, sans-serif', 'system-ui', '']) {
      await page.locator('h1').evaluate((element, font) => { element.style.fontFamily = font; }, font);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('h1').evaluate(element => {
        const node = element.firstChild!;
        let offset = 0;
        return element.textContent!.split(' ').every(word => {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset + word.length);
          offset += word.length + 1;
          return range.getClientRects().length === 1;
        });
      })).toBe(true);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('text-200-percent.png'), fullPage: true });
  await page.screenshot({ path: testInfo.outputPath('text-200-percent-viewport.png') });
  expect(await page.locator('.result-number').evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  })).toBe(1);
  await page.getByRole('combobox', { name: 'Разрешение', exact: true }).selectOption('custom');
  await page.getByLabel('Режим записи').selectOption('daily');
  await page.getByLabel('Начало').fill('22:00');
  await page.getByLabel('Конец').fill('06:00');
  await expect(page.getByTestId('total-tb')).toHaveText('1,728TB');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('observational load and interaction timings at one and 100 groups', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return { domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd, transferredBytes: performance.getEntriesByType('resource').reduce((sum, e) => sum + (e as PerformanceResourceTiming).transferSize, 0) };
  });
  const timings: Record<string, number[]> = {};
  for (const count of [1, 100]) {
    if (count === 100) for (let i = 1; i < count; i++) await page.getByRole('button', { name: 'Добавить группу' }).click();
    await expect(page.getByRole('group', { name: /^Группа \d+$/ })).toHaveCount(count);
    const input = page.getByRole('group', { name: 'Группа 1', exact: true }).getByLabel('Камер', { exact: true });
    await input.scrollIntoViewIfNeeded();
    timings[String(count)] = [];
    for (let i = 0; i < 5; i++) {
      const start = await page.evaluate(() => performance.now());
      await input.fill(String(i % 2 + 4));
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      timings[String(count)].push((await page.evaluate(() => performance.now())) - start);
    }
  }
  const allocation = page.getByRole('list', { name: 'Распределение архива' });
  await expect(allocation.getByRole('button')).toHaveCount(100);
  const schematic = page.getByRole('list', { name: 'Схема групп камер' });
  await expect(schematic.getByRole('button')).toHaveCount(100);
  await expect(schematic.locator('svg[viewBox="0 0 64 48"]')).toHaveCount(100);
  await allocation.getByRole('button').last().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Группа 100', exact: true }).getByLabel('Камер', { exact: true })).toBeFocused();
  const path = testInfo.outputPath('browser-timings.json');
  const paint = await page.evaluate(() => (window as unknown as { __cctvQAMetrics: { cls: number; lcp: number } }).__cctvQAMetrics);
  await writeFile(path, JSON.stringify({ navigation, paint, timings, workers: testInfo.config.workers, note: 'Browser + Playwright round trips; no CPU/network throttling. Observational, not Lighthouse scores.' }, null, 2));
  await testInfo.attach('browser-timings.json', { path, contentType: 'application/json' });
});
