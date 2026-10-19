import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StorageBreakdown } from './StorageBreakdown';
import { calculate, type CameraGroup } from '../../domain/storage/calculator';

function result(counts: number[]) {
  const groups: CameraGroup[] = counts.map((count, index) => ({ id: String(index + 1), count, bitrateMbps: 1,
    codec: 'H.265', resolution: '1080p', width: 1920, height: 1080, schedule: { mode: 'continuous' } }));
  return calculate(groups, 30, 0);
}

describe('storage allocation', () => {
  it('represents one group as 100% with an accessible textual value', () => {
    const calculation = result([1]);
    render(<StorageBreakdown {...calculation} />);
    expect(screen.getByRole('button', { name: /Группа 1.*0,324 TB.*100%.*Перейти/ })).toBeVisible();
    expect(screen.getByTestId('allocation-chart').firstElementChild).toHaveAttribute('data-share', '1');
  });
  it('uses the actual byte proportions, including zero groups', () => {
    const calculation = result([1, 3, 0]);
    render(<StorageBreakdown {...calculation} />);
    const segments = Array.from(screen.getByTestId('allocation-chart').children);
    expect(segments.map(segment => Number(segment.getAttribute('data-share')))).toEqual([0.25, 0.75, 0]);
    expect(calculation.summaries.map(group => BigInt(group.bytes))).toEqual([324000000000n, 972000000000n, 0n]);
    expect(screen.getByRole('button', { name: /Группа 2.*0,972 TB.*75%/ })).toBeVisible();
  });
  it('keeps zero flow explicit without NaN or a fictitious 100%', () => {
    render(<StorageBreakdown {...result([0, 0])} />);
    expect(screen.getByTestId('allocation-chart')).toBeEmptyDOMElement();
    expect(screen.getByText('Поток равен нулю — объём не распределён.')).toBeVisible();
    expect(screen.getAllByRole('button').every(row => row.textContent?.includes('0%'))).toBe(true);
  });
  it('retains a textual entry for every group at the supported limit', () => {
    render(<StorageBreakdown {...result(Array.from({ length: 100 }, () => 1))} />);
    expect(within(screen.getByRole('list', { name: 'Распределение архива' })).getAllByRole('button')).toHaveLength(100);
    expect(screen.getByTestId('allocation-chart').children).toHaveLength(100);
    expect(screen.getByRole('button', { name: /Группа 100 / })).toHaveTextContent('1%');
  });
  it('distinguishes a tiny positive contribution from zero', () => {
    render(<StorageBreakdown {...result([1, 10000])} />);
    expect(screen.getByRole('button', { name: /Группа 1 / })).toHaveTextContent('< 0,1%');
  });
});
