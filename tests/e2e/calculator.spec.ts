import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
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
