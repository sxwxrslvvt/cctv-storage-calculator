import { describe, expect, it } from 'vitest';
import { calculate, toBytes, type CameraGroup, type StorageUnit } from './calculator';

const MAX_BYTES = BigInt(Number.MAX_SAFE_INTEGER);
const camera = (count: number, kbps: number, minutes = 1440): CameraGroup => ({
  id: `${count}-${kbps}-${minutes}`, count, bitrateMbps: kbps / 1000,
  codec: 'H.264', resolution: '1080p', width: 1920, height: 1080,
  schedule: minutes === 1440 ? { mode: 'continuous' } : {
    mode: 'daily', start: '00:00', end: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
  },
});

// The oracle uses integer kbps and minutes, independently of production conversions.
function reference(count: number, kbps: number, minutes: number, days: number): bigint {
  return BigInt(count) * BigInt(kbps) * 1000n * BigInt(minutes) * 60n * BigInt(days) / 8n;
}

describe('independent bigint precision reference', () => {
  it.each([
    [10000, 1000, 1440, 83], [10000, 1000, 1440, 84],
    [10000, 1000000, 1440, 3650], [1, 1000000, 1440, 834],
    [1, 1000000, 1440, 835], [10000, 1, 1440, 3650],
    [9999, 999999, 1, 120], [9999, 999999, 1, 121],
  ])('checks count=%i, kbps=%i, minutes=%i, days=%i', (count, kbps, minutes, days) => {
    const expected = reference(count, kbps, minutes, days);
    const operation = () => calculate([camera(count, kbps, minutes)], days, 0);
    if (expected > MAX_BYTES) expect(operation).toThrow(RangeError);
    else expect(BigInt(operation().totalBytes)).toBe(expected);
  });

  it('checks the closest supported byte totals below and above the limit', () => {
    // Every supported recording volume is a multiple of 7500 bytes.
    const quanta = MAX_BYTES / 7500n;
    const fullDayKbps = quanta / (10000n * 1440n);
    const remainder = quanta % (10000n * 1440n);
    const groups = [
      camera(10000, Number(fullDayKbps)),
      camera(Number(remainder / 1000000n), 1000000, 1),
      camera(1, Number(remainder % 1000000n), 1),
    ];
    const expected = quanta * 7500n;
    const actual = calculate(groups, 1, 0);
    expect(BigInt(actual.totalBytes)).toBe(expected);
    expect(MAX_BYTES - expected).toBeLessThan(7500n);
    expect(actual.summaries.reduce((sum, item) => sum + BigInt(item.bytes), 0n)).toBe(expected);
    groups.push(camera(1, 1, 1));
    expect(expected + 7500n).toBeGreaterThan(MAX_BYTES);
    expect(() => calculate(groups, 1, 0)).toThrow(RangeError);
  });

  it('checks 100 heterogeneous groups against exact aggregation', () => {
    const inputs = Array.from({ length: 100 }, (_, i) => ({ count: 91 + i, kbps: 800000 - i * 73, minutes: 1 + i % 59 }));
    const groups = inputs.map(g => camera(g.count, g.kbps, g.minutes));
    for (const days of [1, 17, 3650]) {
      const expected = inputs.reduce((sum, g) => sum + reference(g.count, g.kbps, g.minutes, days), 0n);
      if (expected > MAX_BYTES) expect(() => calculate(groups, days, 0)).toThrow(RangeError);
      else {
        const result = calculate(groups, days, 0);
        expect(BigInt(result.totalBytes)).toBe(expected);
        result.summaries.forEach((summary, i) => {
          const g = inputs[i];
          expect(BigInt(summary.bytes)).toBe(reference(g.count, g.kbps, g.minutes, days));
        });
      }
    }
  });

  it('checks 2000 reproducible combinations across the supported ranges', () => {
    let seed = 20261019;
    const random = (max: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % max;
    };
    for (let i = 0; i < 2000; i++) {
      const count = random(10001), kbps = random(1000001), minutes = 1 + random(1440), days = 1 + random(3650);
      const expected = reference(count, kbps, minutes, days);
      const operation = () => calculate([camera(count, kbps, minutes)], days, 0);
      if (expected > MAX_BYTES) expect(operation).toThrow(RangeError);
      else expect(BigInt(operation().totalBytes)).toBe(expected);
    }
  });

  it.each([
    ['TB', 1n, 10n, 1000000000000n],
    ['GiB', 123456789n, 1000000000n, 1073741824n],
    ['TiB', 999999999999999n, 1000000000000n, 1099511627776n],
  ] as const)('bounds fractional %s capacity and reverse-retention error', (unit: StorageUnit, numerator, denominator, factor) => {
    const capacity = Number(numerator) / Number(denominator);
    const bytes = toBytes(capacity, unit);
    const expectedBytes = Number(numerator * factor) / Number(denominator);
    expect(Math.abs(bytes - expectedBytes)).toBeLessThanOrEqual(Number.EPSILON * expectedBytes * 2);
    const group = camera(9876, 83599, 31);
    const perDay = reference(9876, 83599, 31, 1);
    const result = calculate([group], 7, bytes);
    expect(BigInt(result.bytesPerDay)).toBe(perDay);
    expect(result.retention.kind).toBe('finite');
    if (result.retention.kind === 'finite') {
      const expectedDays = Number(numerator * factor) / Number(denominator * perDay);
      expect(Math.abs(result.retention.days - expectedDays)).toBeLessThanOrEqual(Number.EPSILON * expectedDays * 3);
    }
  });
});
