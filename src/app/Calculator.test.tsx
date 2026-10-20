import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Calculator } from './Calculator';

async function fill(label: string, value: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(label);
  await user.clear(input);
  if (value) await user.type(input, value);
}

describe('calculator interactions', () => {
  it('applies a real preset, clears selection after edits and resets defaults', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    const preset = screen.getByRole('button', { name: /^Магазин/ });
    await user.click(preset);
    expect(preset).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Камер')).toHaveValue('8');
    expect(screen.getByLabelText('Начало')).toHaveValue('08:00');
    expect(screen.getByLabelText('Конец')).toHaveValue('22:00');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('6,048');
    await fill('Камер', '9');
    expect(preset).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(screen.getByLabelText('Камер')).toHaveValue('4');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('5,184');
  });
  it('renders documented defaults and all storage units', () => {
    render(<Calculator />);
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.getByLabelText('Камер')).toHaveValue('4');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('5,184');
    expect(screen.getByTestId('total-gb')).toHaveTextContent('184');
    expect(screen.getByTestId('total-gib')).toBeVisible();
    expect(screen.getByTestId('total-tib')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Удалить группу 1' })).toBeDisabled();
  });
  it('updates totals and reverse retention immediately', async () => {
    render(<Calculator />);
    await fill('Камер', '1');
    await fill('Битрейт на камеру, Mbps', '1');
    await fill('Доступная ёмкость', '1');
    expect(screen.getByTestId('total-gb')).toHaveTextContent('324');
    expect(screen.getByTestId('retention')).toHaveTextContent('92,59');
  });
  it('adds, edits and removes independent groups', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await user.click(screen.getByRole('button', { name: 'Добавить группу' }));
    const second = within(screen.getByRole('group', { name: 'Группа 2' }));
    await user.clear(second.getByLabelText('Камер'));
    await user.type(second.getByLabelText('Камер'), '2');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('7,776');
    await user.click(second.getByRole('button', { name: 'Удалить группу 2' }));
    expect(screen.queryByRole('group', { name: 'Группа 2' })).not.toBeInTheDocument();
    expect(screen.getByTestId('total-tb')).toHaveTextContent('5,184');
  });
  it.each(['', '-1', '1.5', '10001', 'Infinity', 'abc'])('blocks invalid count %s and restores results after correction', async value => {
    render(<Calculator />);
    await fill('Камер', value);
    expect(screen.getByLabelText('Камер')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('total-tb')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
    await fill('Камер', '1');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('1,296');
  });
  it('supports overnight recording and rejects equal times', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await user.selectOptions(screen.getByLabelText('Режим записи'), 'daily');
    await user.clear(screen.getByLabelText('Начало'));
    await user.type(screen.getByLabelText('Начало'), '20:00');
    await user.clear(screen.getByLabelText('Конец'));
    await user.type(screen.getByLabelText('Конец'), '08:00');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('2,592');
    await user.clear(screen.getByLabelText('Конец'));
    await user.type(screen.getByLabelText('Конец'), '20:00');
    expect(screen.getByRole('alert')).toHaveTextContent('Начало и конец совпадают');
  });
  it('accepts decimal comma, custom resolution and metadata without changing bitrate', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await fill('Битрейт на камеру, Mbps', '1,5');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('1,944');
    await user.selectOptions(screen.getByLabelText('Разрешение'), '4K');
    await user.selectOptions(screen.getByLabelText('Кодек'), 'H.264');
    await user.selectOptions(screen.getByLabelText('Разрешение'), 'custom');
    await fill('Ширина, px', '2000');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('1,944');
    expect(screen.getByLabelText('Битрейт на камеру, Mbps')).toHaveValue('1,5');
  });
  it('has an explicit unbounded state and resets all configuration', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await fill('Битрейт на камеру, Mbps', '0');
    expect(screen.getByTestId('retention')).toHaveTextContent('Без ограничения');
    await user.click(screen.getByRole('button', { name: 'Добавить группу' }));
    await user.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(screen.getAllByRole('group', { name: /^Группа \d+$/ })).toHaveLength(1);
    expect(screen.getByLabelText('Битрейт на камеру, Mbps')).toHaveValue('4');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('5,184');
  });
  it('does not display a small positive volume as zero', async () => {
    render(<Calculator />);
    await fill('Камер', '1');
    await fill('Битрейт на камеру, Mbps', '0.001');
    await fill('Срок хранения, дней', '1');
    expect(screen.getByTestId('total-tb')).toHaveTextContent('< 0,001');
    expect(screen.getByTestId('total-gb')).toHaveTextContent('0,011');
  });
});
