import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { calculate, UNITS, type StorageUnit } from '../../domain/storage/calculator';
import { StorageCapacity } from './StorageCapacity';

const group = { id: '1', count: 4, bitrateMbps: 4, codec: 'H.265', resolution: '1080p', width: 1920, height: 1080, schedule: { mode: 'continuous' } } as const;
const expectedBytes = 4n * 4000000n * 86400n * 30n / 8n;
const display = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value).replace(/\s/g, ' ');

describe('storage capacity visualization', () => {
  it.each(Object.keys(UNITS) as StorageUnit[])('uses actual bytes for balances in %s', unit => {
    const available = 8_000_000_000_000n;
    render(<StorageCapacity result={calculate([group], 30, Number(available))} availableBytes={Number(available)} unit={unit} />);
    expect(screen.getByTestId('capacity-required')).toHaveTextContent(`${display(Number(expectedBytes) / UNITS[unit])} ${unit}`);
    expect(screen.getByTestId('capacity-balance')).toHaveTextContent(`${display(Number(available - expectedBytes) / UNITS[unit])} ${unit}`);
    expect(screen.getByTestId('capacity-percent')).toHaveTextContent('64,8%');
    expect(screen.getByTestId('capacity-ring-value')).toHaveAttribute('stroke-dasharray', '64.8 100');
  });
  it('shows excess separately and clamps the visual ring', () => {
    const available = 500_000_000_000n;
    render(<StorageCapacity result={calculate([group], 30, Number(available))} availableBytes={Number(available)} unit="TB" />);
    expect(screen.getByTestId('capacity-balance')).toHaveTextContent(`${display(Number(expectedBytes - available) / UNITS.TB)} TB`);
    expect(screen.getByTestId('capacity-status')).toHaveTextContent('Недостаточно ёмкости');
    expect(screen.getByTestId('capacity-percent')).toHaveTextContent('1 036,8%');
    expect(screen.getByTestId('capacity-ring-value')).toHaveAttribute('stroke-dasharray', '100 100');
  });
  it.each([0, 4])('handles zero capacity with %i cameras without dividing by zero', count => {
    render(<StorageCapacity result={calculate([{ ...group, count }], 30, 0)} availableBytes={0} unit="TB" />);
    expect(screen.getByTestId('capacity-percent')).toHaveTextContent('—');
    expect(screen.getByTestId('capacity-status')).toHaveTextContent(count ? 'Нужен диск' : 'Нет записи');
    expect(screen.getByTestId('capacity-ring-value')).toHaveAttribute('stroke-dasharray', `${count ? 100 : 0} 100`);
  });
  it('preserves the byte balance near the supported integer boundary', () => {
    const expected = 10000n * 83000000n * 86400n / 8n;
    const available = 8_000_000_000_000n;
    render(<StorageCapacity result={calculate([{ ...group, count: 10000, bitrateMbps: 83 }], 1, Number(available))} availableBytes={Number(available)} unit="GB" />);
    expect(screen.getByTestId('capacity-balance')).toHaveTextContent(`${display(Number(expected - available) / UNITS.GB)} GB`);
    expect(screen.getByTestId('capacity-ring-value')).toHaveAttribute('stroke-dasharray', '100 100');
  });
  it('removes all current balances when the configuration is invalid', () => {
    render(<StorageCapacity result={null} availableBytes={0} unit="TB" />);
    expect(screen.queryByTestId('capacity-required')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capacity-ring-value')).not.toBeInTheDocument();
  });
});
