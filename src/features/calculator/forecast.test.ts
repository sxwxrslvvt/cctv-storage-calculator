import { describe, expect, it } from 'vitest';
import { calculate, toBytes, type CameraGroup, type Schedule } from '../../domain/storage/calculator';
import { forecastBytes, forecastFillDay } from './forecast';

function scenario({ count = 1, bitrate = 1, days = 30, capacity = 0, schedule = { mode: 'continuous' } as Schedule } = {}) {
  const group: CameraGroup = { id: '1', count, bitrateMbps: bitrate, codec: 'H.265', resolution: '1080p', width: 1920, height: 1080, schedule };
  return calculate([group], days, capacity);
}

describe('archive forecast presentation', () => {
  it('matches independent byte references and the exact final total', () => {
    const result = scenario();
    for (const day of [0, 1, 15, 30]) {
      expect(forecastBytes(result, 30, day)).toBe(Number(1000000n * 86400n * BigInt(day) / 8n));
    }
    expect(forecastBytes(result, 30, 30)).toBe(result.totalBytes);
  });
  it('uses daily averages for overnight intervals', () => {
    const result = scenario({ schedule: { mode: 'daily', start: '22:00', end: '06:00' } });
    expect(forecastBytes(result, 30, 15)).toBe(Number(1000000n * 28800n * 15n / 8n));
  });
  it('supports a one-day horizon and fractional interpolation', () => {
    expect(forecastBytes(scenario({ days: 1 }), 1, 0.5)).toBe(5400000000);
  });
  it('keeps large valid values accurate without extending the horizon', () => {
    const result = scenario({ count: 10000, days: 83 });
    expect(forecastBytes(result, 83, 82)).toBe(Number(10000n * 1000000n * 86400n * 82n / 8n));
    expect(forecastBytes(result, 83, 84)).toBe(result.totalBytes);
    expect(forecastBytes(result, 83, -1)).toBe(0);
  });
  it('marks a fill inside the horizon and includes its endpoints', () => {
    expect(forecastFillDay(scenario({ capacity: 10800000000 * 15 }), 30)).toBe(15);
    expect(forecastFillDay(scenario({ capacity: 10800000000 * 30 }), 30)).toBe(30);
    expect(forecastFillDay(scenario(), 30)).toBe(0);
  });
  it('does not invent a fill point beyond the interval', () => {
    expect(forecastFillDay(scenario({ capacity: toBytes(1, 'TiB') }), 30)).toBeNull();
  });
  it.each([0, toBytes(1.5, 'TB')])('handles zero flow with capacity %s', capacity => {
    const result = scenario({ bitrate: 0, capacity });
    expect(forecastBytes(result, 30, 15)).toBe(0);
    expect(forecastFillDay(result, 30)).toBeNull();
  });
});
