import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { watchBrowserErrors } from './browser';

test.beforeEach(async ({ page }) => {
  watchBrowserErrors(page);
  await page.goto('./');
});

test('presets replace actual parameters and reset restores the original calculation', async ({ page }) => {
  for (const [name, cameras, bitrate, days, seconds, capacity] of [
    ['Дом', 4, 2, 14, 86400, 2], ['Магазин', 8, 4, 30, 50400, 8], ['Офис', 12, 3, 30, 86400, 12],
  ] as const) {
    const button = page.getByRole('button', { name: new RegExp(`^${name}`) });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Камер', { exact: true })).toHaveValue(String(cameras));
    await expect(page.getByLabel('Битрейт на камеру, Mbps')).toHaveValue(String(bitrate));
    await expect(page.getByLabel('Срок хранения, дней')).toHaveValue(String(days));
    await expect(page.getByLabel('Доступная ёмкость')).toHaveValue(String(capacity));
    const bytes = BigInt(cameras) * BigInt(bitrate) * 1000000n * BigInt(seconds) * BigInt(days) / 8n;
    const tb = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(Number(bytes) / 1e12);
    await expect(page.getByTestId('total-tb')).toHaveText(`${tb}TB`);
    await expect(page.getByTestId('capacity-required')).toHaveText(`${tb} TB`);
    await page.getByLabel('Камер', { exact: true }).fill('1');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  }
  await page.getByRole('button', { name: 'Добавить группу' }).click();
  await page.getByRole('button', { name: /^Дом/ }).click();
  await expect(page.getByRole('group', { name: /^Группа \d+$/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Сбросить' }).click();
  await expect(page.getByTestId('total-tb')).toHaveText('5,184TB');
  await expect(page.getByLabel('Режим записи')).toHaveValue('continuous');
});

test('capacity visualization handles excess, equality, fractional and zero HDD', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [capacity, status, balance, ratio] of [
    ['8', 'Архив поместится', '2,816 TB', '64.8 100'],
    ['5.184', 'Архив поместится', '0 TB', '100 100'],
    ['0.5', 'Недостаточно ёмкости', '4,684 TB', '100 100'],
    ['0', 'Нужен диск', '5,184 TB', '100 100'],
  ]) {
    await page.getByLabel('Доступная ёмкость').fill(capacity);
    await expect(page.getByTestId('capacity-status')).toHaveText(status);
    await expect(page.getByTestId('capacity-balance')).toHaveText(balance);
    await expect(page.getByTestId('capacity-ring-value')).toHaveAttribute('stroke-dasharray', ratio);
  }
  await page.getByLabel('Камер', { exact: true }).fill('0');
  await expect(page.getByTestId('capacity-status')).toHaveText('Нет записи');
  await expect(page.getByTestId('capacity-ring-value')).toHaveAttribute('stroke-dasharray', '0 100');
  await expect(page.getByTestId('capacity-ring-value')).toHaveCSS('transition-duration', '0s');
  await page.getByLabel('Камер', { exact: true }).fill('');
  await expect(page.getByTestId('capacity-ring-value')).toHaveCount(0);
  await expect(page.getByTestId('capacity-required')).toHaveCount(0);
  await page.getByLabel('Камер', { exact: true }).fill('4');
  await expect(page.getByTestId('capacity-required')).toHaveText('5,184 TB');
});

test('camera schematic selects the real group and advanced settings work by keyboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Добавить группу' }).click();
  const nodes = page.getByRole('list', { name: 'Схема групп камер' });
  const node = nodes.getByRole('button').last();
  await node.focus();
  await page.keyboard.press('Enter');
  const group = page.getByRole('group', { name: 'Группа 2', exact: true });
  await expect(group.getByLabel('Камер', { exact: true })).toBeFocused();
  await expect(node).toHaveAttribute('aria-pressed', 'true');
  await group.getByLabel('Камер', { exact: true }).fill('10000');
  await page.getByLabel('Срок хранения, дней').fill('1');
  await expect(nodes.locator('svg[viewBox="0 0 64 48"]')).toHaveCount(2);
  await expect(node).toContainText('×10000');
  const summary = group.locator('summary');
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(group.getByLabel('Кодек')).not.toBeVisible();
  await expect(group.getByLabel('Камер', { exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(group.getByLabel('Кодек')).toBeVisible();
  await page.getByRole('button', { name: 'Удалить группу 2' }).click();
  await expect(nodes.getByRole('button')).toHaveCount(1);
  await expect(nodes.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
});

test('redesigned composition remains readable in both themes and all target sizes', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Оформление').selectOption(theme);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}.png`), fullPage: true });
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
  }
});
