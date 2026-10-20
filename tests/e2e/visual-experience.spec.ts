import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { watchBrowserErrors } from './browser';

test.beforeEach(async ({ page }) => {
  watchBrowserErrors(page);
  await page.goto('./');
});

test('allocation geometry follows bytes and navigates to editable parameters', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Добавить группу' }).click();
  const second = page.getByRole('group', { name: 'Группа 2', exact: true });
  await second.getByLabel('Камер', { exact: true }).fill('12');
  const segments = page.locator('.allocation-segment');
  await expect(segments).toHaveCount(2);
  await expect(segments.first()).toHaveAttribute('data-share', '0.25');
  await expect(segments.last()).toHaveAttribute('data-share', '0.75');
  await expect.poll(async () => {
    const widths = await segments.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().width));
    return widths[1] / widths[0];
  }).toBeCloseTo(3, 1);
  const row = page.getByRole('button', { name: /Группа 2.*75%.*Перейти/ });
  await row.focus();
  await expect(segments.first()).toHaveAttribute('data-dimmed', 'true');
  await page.keyboard.press('Enter');
  await expect(second.getByLabel('Камер', { exact: true })).toBeFocused();
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Оформление').selectOption(theme);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: testInfo.outputPath(`allocation-${theme}.png`), fullPage: true });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations.map(v => v.id)).toEqual([]);
  }
  await second.getByLabel('Камер', { exact: true }).fill('0');
  await page.getByRole('group', { name: 'Группа 1', exact: true }).getByLabel('Камер', { exact: true }).fill('0');
  await expect(page.locator('.allocation-segment')).toHaveCount(0);
  await expect(page.getByText('Поток равен нулю — объём не распределён.')).toBeVisible();
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`motion keeps the current result and cleans up exits: ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const input = page.getByLabel('Камер', { exact: true });
    for (const value of ['8', '', '0', '2', '10000', '1']) {
      await input.fill(value);
      if (!value) {
        await expect(page.getByTestId('total-tb')).toHaveCount(0);
        await expect(page.getByTestId('allocation-chart')).toHaveCount(0);
      } else if (value === '10000') {
        await expect(page.getByRole('alert')).toContainText('Общий объём ограничен');
        await expect(page.getByTestId('total-tb')).toHaveCount(0);
        await expect(page.getByTestId('allocation-chart')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('total-tb')).toHaveText(`${new Intl.NumberFormat('ru-RU').format(Number(value) * 1.296)}TB`);
      }
    }
    await page.getByLabel('Единица ёмкости').selectOption('GiB');
    await expect(page.getByTestId('total-tb')).toHaveText('1,296TB');
    await page.getByRole('button', { name: 'Добавить группу' }).click();
    await expect(page.getByTestId('total-tb')).toHaveText('6,48TB');
    const exit = await page.getByRole('button', { name: 'Удалить группу 2' }).evaluate(button => {
      (button as HTMLButtonElement).click();
      const snapshot = document.querySelector<HTMLFieldSetElement>('.group-exit');
      return snapshot ? { inert: snapshot.inert, hidden: snapshot.getAttribute('aria-hidden'), duplicateIds: snapshot.querySelectorAll('[id]').length } : null;
    });
    expect(exit).toEqual(reducedMotion === 'reduce' ? null : { inert: true, hidden: 'true', duplicateIds: 0 });
    await expect(page.getByTestId('total-tb')).toHaveText('1,296TB');
    await expect(page.getByRole('group', { name: /^Группа \d+$/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Добавить группу' })).toBeFocused();
    await expect(page.locator('.group-exit')).toHaveCount(0);
    await page.getByLabel('Оформление').selectOption('dark');
    await page.getByLabel('Оформление').selectOption('light');
    await expect(page.getByTestId('total-tb')).toHaveText('1,296TB');
    if (reducedMotion === 'reduce') {
      await expect(page.locator('.result-number')).toHaveCSS('animation-name', 'none');
      await expect(page.locator('.allocation-segment')).toHaveCSS('transition-duration', '0s');
    }
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
}
