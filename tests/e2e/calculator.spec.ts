import { test, expect, type Page } from '@playwright/test';
import { watchBrowserErrors } from './browser';

test.beforeEach(async ({ page }) => {
  watchBrowserErrors(page);
  await page.goto('./');
});

async function exampleA(page: Page) {
  await page.getByLabel('Камер', { exact: true }).fill('1');
  await page.getByLabel('Битрейт на камеру, Mbps').fill('1');
}

test('loads defaults without overflow and updates calculations', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('total-tb')).toContainText('5,184');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('initial.png'), fullPage: true });
  await exampleA(page);
  await expect(page.getByTestId('total-gb')).toHaveText('324');
  await page.getByLabel('Срок хранения, дней').fill('10');
  await expect(page.getByTestId('total-gb')).toHaveText('108');
});

test('independent groups and reverse retention', async ({ page }) => {
  await exampleA(page);
  await page.getByLabel('Доступная ёмкость').fill('1');
  await expect(page.getByTestId('retention')).toContainText('92,59');
  await page.getByRole('button', { name: 'Добавить группу' }).click();
  const group = page.getByRole('group', { name: 'Группа 2' });
  await group.getByLabel('Камер', { exact: true }).fill('1');
  await group.getByLabel('Битрейт на камеру, Mbps').fill('1');
  await expect(page.getByTestId('total-gb')).toHaveText('648');
  await expect(page.getByTestId('retention')).toContainText('46,3');
  await group.getByRole('button', { name: 'Удалить группу 2' }).click();
  await expect(page.getByTestId('total-gb')).toHaveText('324');
});

test('overnight interval, validation and reset', async ({ page }) => {
  await exampleA(page);
  await page.getByLabel('Режим записи').selectOption('daily');
  await page.getByLabel('Начало').fill('22:00');
  await page.getByLabel('Конец').fill('06:00');
  await expect(page.getByTestId('total-gb')).toHaveText('108');
  await page.getByLabel('Конец').fill('22:00');
  await expect(page.getByRole('alert')).toContainText('Начало и конец совпадают');
  await expect(page.getByTestId('total-gb')).toHaveCount(0);
  await page.getByRole('button', { name: 'Сбросить' }).click();
  await expect(page.getByTestId('total-tb')).toContainText('5,184');
});

test('zero data rate and binary capacity', async ({ page }) => {
  await exampleA(page);
  await page.getByLabel('Доступная ёмкость').fill('1');
  await page.getByLabel('Единица ёмкости').selectOption('TiB');
  await expect(page.getByTestId('retention')).toContainText('101,81');
  await page.getByLabel('Битрейт на камеру, Mbps').fill('0');
  await expect(page.getByTestId('retention')).toHaveText('Без ограничения');
  await expect(page.getByTestId('total-gb')).toHaveText('0');
});

test('custom resolution metadata and invalid fields', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Разрешение', exact: true }).selectOption('custom');
  await page.getByLabel('Ширина, px').fill('2560');
  await page.getByLabel('Высота, px').fill('1440');
  await page.getByLabel('Кодек').selectOption('H.264');
  await expect(page.getByTestId('total-tb')).toContainText('5,184');
  await page.getByLabel('Камер', { exact: true }).fill('1.5');
  await expect(page.getByLabel('Камер', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('total-tb')).toHaveCount(0);
});

test('narrow screen and keyboard access', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.getByRole('combobox', { name: 'Разрешение', exact: true }).selectOption('custom');
  await page.getByLabel('Режим записи').selectOption('daily');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const input = page.getByLabel('Камер', { exact: true });
  await input.focus();
  await expect(input).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Битрейт на камеру, Mbps')).toBeFocused();
});

for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440, 1920]) {
  test(`release review at ${width}px: large values, errors and group identity`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const noOverflow = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    };
    await page.getByLabel('Камер', { exact: true }).fill('10000');
    await page.getByLabel('Срок хранения, дней').fill('1');
    await page.getByLabel('Битрейт на камеру, Mbps').fill('83');
    await expect(page.getByTestId('total-tb')).toHaveText(/8\s964TB/);
    for (const unit of ['gb', 'gib', 'tib']) {
      expect(await page.getByTestId(`total-${unit}`).evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      })).toBe(1);
    }
    await noOverflow();
    await page.screenshot({ path: testInfo.outputPath('large.png'), fullPage: true });

    await page.getByLabel('Срок хранения, дней').fill('3650');
    await expect(page.getByRole('alert')).toContainText('Общий объём ограничен');
    await expect(page.getByTestId('total-tb')).toHaveCount(0);
    await expect(page.getByTestId('retention')).toHaveText('—');
    await noOverflow();
    await page.getByLabel('Срок хранения, дней').fill('1');
    await page.getByLabel('Битрейт на камеру, Mbps').fill('1.0001');
    await expect(page.getByRole('alert')).toContainText('не более 3 знаков');
    await noOverflow();
    await page.screenshot({ path: testInfo.outputPath('errors.png'), fullPage: true });

    await page.getByRole('button', { name: 'Сбросить' }).click();
    for (const preset of ['720p', '1080p', '4MP', '4K']) {
      await page.getByRole('combobox', { name: 'Разрешение', exact: true }).selectOption(preset);
      await expect(page.getByTestId('total-tb')).toHaveText('5,184TB');
    }
    await page.getByRole('combobox', { name: 'Разрешение', exact: true }).selectOption('custom');
    await expect(page.getByLabel('Ширина, px')).toHaveValue('3840');
    await expect(page.getByLabel('Высота, px')).toHaveValue('2160');
    await page.getByLabel('Ширина, px').fill('');
    await expect(page.getByTestId('total-tb')).toHaveCount(0);
    await page.getByLabel('Ширина, px').fill('1');
    await page.getByLabel('Высота, px').fill('16384');
    await expect(page.getByTestId('total-tb')).toHaveText('5,184TB');

    await page.getByRole('button', { name: 'Добавить группу' }).click();
    await page.getByRole('button', { name: 'Добавить группу' }).click();
    const third = page.getByRole('group', { name: 'Группа 3' });
    await third.getByLabel('Камер', { exact: true }).fill('1');
    await third.getByLabel('Битрейт на камеру, Mbps').fill('8');
    await page.getByRole('button', { name: 'Удалить группу 2' }).click();
    const second = page.getByRole('group', { name: 'Группа 2' });
    await expect(second.getByLabel('Камер', { exact: true })).toHaveValue('1');
    await expect(second.getByLabel('Битрейт на камеру, Mbps')).toHaveValue('8');
    await expect(page.getByTestId('total-gb')).toHaveText(/7\s776/);
    await page.getByRole('button', { name: 'Добавить группу' }).click();
    await expect(page.getByRole('group', { name: 'Группа 3' }).getByLabel('Камер', { exact: true })).toHaveValue('4');
    await expect(second.getByLabel('Битрейт на камеру, Mbps')).toHaveValue('8');
    await noOverflow();
    await second.getByLabel('Камер', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(second.getByLabel('Битрейт на камеру, Mbps')).toBeFocused();
  });
}
