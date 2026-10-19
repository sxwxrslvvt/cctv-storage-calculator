import { describe, expect, it } from 'vitest';
import { calculate, dailySeconds, fromBytes, groupBytesPerDay, mbpsToBits, toBytes, UNITS, type CameraGroup } from './calculator';

const group = (patch: Partial<CameraGroup> = {}): CameraGroup => ({ id: 'a', count: 1, bitrateMbps: 1, codec: 'H.264', resolution: '1080p', width: 1920, height: 1080, schedule: { mode: 'continuous' }, ...patch });

describe('mathematical contract', () => {
  it.each([
    [1, 1, 324_000_000_000],
    [4, 1, 1_296_000_000_000],
    [8, 4, 10_368_000_000_000],
  ])('%i cameras at %i Mbps for 30 days', (count, bitrateMbps, expected) => {
    expect(calculate([group({ count, bitrateMbps })], 30, 1e12).totalBytes).toBe(expected);
  });
  it('example D: twelve daily hours', () => {
    expect(calculate([group({ bitrateMbps: 8, schedule: { mode: 'daily', start: '08:00', end: '20:00' } })], 30, 0).totalBytes).toBe(1_296_000_000_000);
  });
  it('example E: 1 TB reverse retention', () => {
    const result = calculate([group()], 30, toBytes(1, 'TB'));
    expect(result.retention.kind).toBe('finite');
    if (result.retention.kind === 'finite') expect(result.retention.days).toBeCloseTo(92.5925925926, 8);
  });
  it('combines heterogeneous groups and reuses the daily rate for reverse retention', () => {
    const result = calculate([group(), group({ id: 'b', count: 2, bitrateMbps: 8, schedule: { mode: 'daily', start: '20:00', end: '08:00' } })], 7, 1e12);
    expect(result.bytesPerDay).toBe(97_200_000_000);
    expect(result.totalBytes).toBe(680_400_000_000);
    expect(result.summaries.map(g => g.bytes)).toEqual([75_600_000_000, 604_800_000_000]);
    expect(result.cameraCount).toBe(3);
    if (result.retention.kind === 'finite') expect(result.retention.days).toBeCloseTo(1e12 / 97_200_000_000, 10);
  });
  it.each([1, 7, 365, 3650])('handles %i retention days without intermediate rounding', days => {
    expect(calculate([group({ bitrateMbps: 0.001 })], days, 0).totalBytes).toBe(10_800_000 * days);
  });
  it('does not use metadata to change the data rate', () => {
    expect(groupBytesPerDay(group({ codec: 'H.265', width: 3840, height: 2160, resolution: '4K' }))).toBe(groupBytesPerDay(group()));
  });
});

describe('units and schedules', () => {
  it.each(Object.entries(UNITS))('converts and round trips %s', (unit, factor) => {
    const key = unit as keyof typeof UNITS;
    expect(toBytes(1, key)).toBe(factor);
    expect(fromBytes(toBytes(2.5, key), key)).toBe(2.5);
  });
  it('distinguishes binary and decimal storage', () => {
    expect(fromBytes(1e12, 'TB')).toBe(1);
    expect(fromBytes(1e12, 'GiB')).toBeCloseTo(931.3225746155, 8);
    expect(fromBytes(1e12, 'TiB')).toBeCloseTo(0.9094947018, 9);
  });
  it('converts Mbps without floating-point residue', () => {
    expect(mbpsToBits(1)).toBe(1_000_000);
    expect(mbpsToBits(0.123)).toBe(123_000);
    expect(mbpsToBits(0.001)).toBe(1000);
    expect(mbpsToBits(1000)).toBe(1e9);
  });
  it.each([
    ['08:00', '20:00', 43200], ['22:00', '06:00', 28800],
    ['23:59', '00:00', 60], ['00:00', '23:59', 86340], ['08:15', '09:45', 5400],
  ])('exact daily interval %s–%s', (start, end, seconds) => {
    expect(dailySeconds({ mode: 'daily', start, end })).toBe(seconds);
  });
  it('continuous recording is exactly 86400 seconds', () => expect(dailySeconds({ mode: 'continuous' })).toBe(86400));
});

describe('validation and limits', () => {
  it.each([NaN, Infinity, -Infinity, -1, 0.5, 10001])('rejects camera count %s', count => expect(() => groupBytesPerDay(group({ count }))).toThrow());
  it.each([NaN, Infinity, -1, 1000.001, 0.0001, 1e-12])('rejects bitrate %s', bitrateMbps => expect(() => groupBytesPerDay(group({ bitrateMbps }))).toThrow());
  it.each([NaN, Infinity, -1, 0, 1.5, 3651])('rejects retention period %s', days => expect(() => calculate([group()], days, 1e12)).toThrow());
  it.each(['', '24:00', '8:00', '10:60', '12:00:00'])('rejects time %s', start => expect(() => dailySeconds({ mode: 'daily', start, end: '20:00' })).toThrow());
  it('rejects a zero-length interval', () => expect(() => dailySeconds({ mode: 'daily', start: '08:00', end: '08:00' })).toThrow());
  it.each([0, 0.5, 16385, NaN])('validates custom dimensions %s', width => expect(() => groupBytesPerDay(group({ width }))).toThrow());
  it('supports zero rate with an explicit unbounded state, including zero capacity', () => {
    for (const available of [0, 1e12]) {
      expect(calculate([group({ bitrateMbps: 0 }), group({ count: 0 })], 30, available).retention).toEqual({ kind: 'unbounded' });
    }
    expect(calculate([group()], 1, 0).retention).toEqual({ kind: 'finite', days: 0 });
  });
  it('supports the largest single input values if the combined result is safe', () => {
    expect(calculate([group({ count: 10000, bitrateMbps: 0.001 })], 3650, 0).totalBytes).toBe(394_200_000_000_000);
    expect(calculate([group({ bitrateMbps: 1000 })], 1, 0).totalBytes).toBe(10_800_000_000_000);
  });
  it('rejects unsafe totals and aggregate overflow', () => {
    expect(() => calculate([group({ count: 10000, bitrateMbps: 1000 })], 3650, 0)).toThrow();
    const groups = Array.from({ length: 100 }, (_, i) => group({ id: String(i), count: 10, bitrateMbps: 1000 }));
    expect(() => calculate(groups, 10, 0)).toThrow();
    expect(calculate(Array.from({ length: 100 }, () => group()), 1, 0).totalBytes).toBe(1_080_000_000_000);
  });
  it('preserves exact bytes near the safe-integer boundary and rejects the next day', () => {
    const cameras = group({ count: 10000 });
    expect(calculate([cameras], 83, 0).totalBytes).toBe(8_964_000_000_000_000);
    expect(() => calculate([cameras], 84, 0)).toThrow();
  });
  it('rejects empty and excessive groups', () => {
    expect(() => calculate([], 1, 0)).toThrow();
    expect(() => calculate(Array.from({ length: 101 }, () => group()), 1, 0)).toThrow();
  });
  it.each([NaN, Infinity, -1, 1001])('rejects invalid available capacity %s', value => expect(() => toBytes(value, 'TB')).toThrow());
  it('rejects invalid raw bytes', () => {
    expect(() => fromBytes(Infinity, 'TB')).toThrow();
    expect(() => calculate([group()], 30, -1)).toThrow();
    expect(() => fromBytes(Number.MAX_SAFE_INTEGER + 1, 'TB')).toThrow();
  });
});
