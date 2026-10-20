const formatters = {
  0: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }),
  1: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }),
  2: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }),
  3: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }),
};

export function formatNumber(value: number, digits: 0 | 1 | 2 | 3 = 3) {
  const threshold = 10 ** -digits;
  const formatter = formatters[digits];
  return value > 0 && value < threshold ? `< ${formatter.format(threshold)}` : formatter.format(value);
}
