import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { watchBrowserErrors } from './browser';

test.beforeEach(async ({ page }) => {
  watchBrowserErrors(page);
  await page.goto('./');
});

test('native theme popup has explicit colors and complete keyboard behavior', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const select = page.getByLabel('Оформление');
  for (const theme of ['light', 'dark']) {
    await select.selectOption(theme);
    const colors = await select.evaluate(el => {
      const option = el.querySelector('option')!;
      const svg = el.parentElement!.querySelector('svg')!;
      const bounds = el.getBoundingClientRect();
      const icon = svg.getBoundingClientRect();
      return { background: getComputedStyle(option).backgroundColor, control: getComputedStyle(el).backgroundColor,
        containsIcon: icon.left >= bounds.left && icon.right <= bounds.right && icon.top >= bounds.top && icon.bottom <= bounds.bottom,
        parentBorder: getComputedStyle(el.parentElement!).borderTopWidth };
    });
    expect(colors.background).toBe(colors.control);
    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.containsIcon).toBe(true);
    expect(colors.parentBorder).toBe('0px');
    await select.click();
    await page.screenshot({ path: testInfo.outputPath(`theme-open-${theme}.png`) });
    await page.keyboard.press('Escape');
    await expect(select).toHaveValue(theme);
  }
  await select.click();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue('dark');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Доступная ёмкость')).toBeFocused();
  await expect(page.getByTestId('total-tb')).toHaveText('5,184TB');
});

test('archive forecast uses actual units, keyboard selection and boundary states', async ({ page }) => {
  await page.getByLabel('Камер', { exact: true }).fill('1');
  await page.getByLabel('Битрейт на камеру, Mbps').fill('1');
  await page.getByLabel('Доступная ёмкость').fill('1');
  const slider = page.getByRole('slider', { name: 'День прогноза' });
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(slider).toHaveValue('0');
  await expect(page.getByTestId('forecast-volume')).toHaveText('0 TB');
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
  for (const [unit, expected] of [['GB', '162 GB'], ['TB', '0,162 TB'], ['GiB', '150,874 GiB'], ['TiB', '0,147 TiB']]) {
    await page.getByLabel('Единица ёмкости').selectOption(unit);
    await expect(page.getByTestId('forecast-volume')).toHaveText(expected);
    await expect(slider).toHaveAttribute('aria-valuetext', `День прогноза 15: ${expected}`);
  }
  await expect(page.getByTestId('fill-marker')).toHaveCount(0);
  await page.getByLabel('Доступная ёмкость').fill('0');
  await expect(page.getByTestId('fill-marker')).toHaveCount(1);
  await expect(page.getByTestId('forecast-summary')).toHaveText('Заполнение HDD через: 0 дн.');
  await page.getByLabel('Битрейт на камеру, Mbps').fill('0');
  await expect(page.getByTestId('fill-marker')).toHaveCount(0);
  await expect(page.getByTestId('forecast-summary')).toContainText('Поток данных равен нулю');
  await page.getByLabel('Срок хранения, дней').fill('1');
  await expect(slider).toHaveValue('1');
  await page.getByLabel('Срок хранения, дней').fill('');
  await expect(slider).toHaveCount(0);
  await expect(page.getByTestId('total-tb')).toHaveCount(0);
  await page.getByLabel('Срок хранения, дней').fill('1');
  await expect(slider).toHaveValue('1');
});

test('chart pointer and group selection stay linked to real results', async ({ page, isMobile }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const plot = page.getByRole('img', { name: /Накопление архива/ });
  await plot.scrollIntoViewIfNeeded();
  const bounds = (await plot.boundingBox())!;
  const point = { x: bounds.x + 72 + (bounds.width - 24 - 72) / 2, y: bounds.y + 120 };
  if (isMobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.move(point.x, point.y);
  await expect(page.getByRole('slider')).toHaveValue('15');
  await expect(page.getByTestId('forecast-volume')).toHaveText('2,592 TB');
  await page.getByRole('button', { name: 'Добавить группу' }).click();
  const row = page.getByRole('button', { name: /Группа 2.*50%.*Перейти/ });
  await page.getByRole('button', { name: /Группа 1.*50%.*Перейти/ }).hover();
  await row.focus();
  await expect(page.locator('.allocation-segment').first()).toHaveAttribute('data-dimmed', 'true');
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Группа 2', exact: true })).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('total-tb')).toHaveText('10,368TB');
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Оформление').selectOption(theme);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: testInfo.outputPath(`dashboard-groups-${theme}.png`), fullPage: true });
    await plot.screenshot({ path: testInfo.outputPath(`archive-${theme}.png`) });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations.map(v => v.id)).toEqual([]);
  }
  await page.getByRole('button', { name: 'Удалить группу 2' }).click();
  await expect(page.getByRole('button', { name: /Группа 1.*100%.*Перейти/ })).toHaveAttribute('aria-pressed', 'false');
});
