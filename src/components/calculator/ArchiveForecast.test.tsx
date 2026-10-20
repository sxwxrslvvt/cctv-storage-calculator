import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import { calculate, type CameraGroup } from '../../domain/storage/calculator';
import { ArchiveForecast } from './ArchiveForecast';

const group: CameraGroup = { id: '1', count: 1, bitrateMbps: 1, codec: 'H.265', resolution: '1080p', width: 1920, height: 1080, schedule: { mode: 'continuous' } };

it('exposes an image description and a keyboard-readable current volume', () => {
  const result = calculate([group], 30, 100000000000);
  const { rerender } = render(<ArchiveForecast result={result} days={30} availableBytes={100000000000} unit="GB" />);
  expect(screen.getByRole('img', { name: /Накопление архива.*Усреднённое/ })).toBeVisible();
  expect(screen.getByTestId('forecast-volume')).toHaveTextContent('324 GB');
  fireEvent.change(screen.getByRole('slider', { name: 'День прогноза' }), { target: { value: '15' } });
  expect(screen.getByTestId('forecast-volume')).toHaveTextContent('162 GB');
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'День прогноза 15: 162 GB');
  const short = calculate([group], 1, 100000000000);
  rerender(<ArchiveForecast result={short} days={1} availableBytes={100000000000} unit="GB" />);
  expect(screen.getByRole('slider')).toHaveValue('1');
  expect(screen.getByTestId('forecast-volume')).toHaveTextContent('10,8 GB');
});

it('represents zero capacity and zero flow without invalid SVG coordinates', () => {
  const result = calculate([{ ...group, bitrateMbps: 0 }], 1, 0);
  const { container } = render(<ArchiveForecast result={result} days={1} availableBytes={0} unit="TB" />);
  expect(screen.queryByTestId('fill-marker')).not.toBeInTheDocument();
  expect(screen.getByTestId('forecast-summary')).toHaveTextContent('Поток данных равен нулю');
  expect(container.querySelector('svg')?.innerHTML).not.toMatch(/NaN|Infinity/);
});
