export const UNITS = { GB: 1e9, TB: 1e12, GiB: 2 ** 30, TiB: 2 ** 40 } as const;
export type StorageUnit = keyof typeof UNITS;
export const resolutions = {
  '720p': [1280, 720], '1080p': [1920, 1080], '4MP': [2560, 1440], '4K': [3840, 2160],
} as const;
export type Resolution = keyof typeof resolutions | 'custom';
export function isResolution(value: string): value is Resolution {
  return value === 'custom' || Object.hasOwn(resolutions, value);
}
export function isCodec(value: string): value is CameraGroup['codec'] {
  return value === 'H.264' || value === 'H.265';
}
export type Schedule = { mode: 'continuous' } | { mode: 'daily'; start: string; end: string };
export interface CameraGroup {
  id: string;
  count: number;
  bitrateMbps: number;
  codec: 'H.264' | 'H.265';
  resolution: Resolution;
  width: number;
  height: number;
  schedule: Schedule;
}
export const LIMITS = { groups: 100, cameras: 10000, bitrate: 1000, days: 3650, capacity: 1000, dimension: 16384 } as const;

function numberInRange(value: number, min: number, max: number, integer = false): void {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RangeError(`Допустимо ${integer ? 'целое ' : ''}число от ${min} до ${max}.`);
  }
}

function safeBytes(value: number): number {
  numberInRange(value, 0, Number.MAX_SAFE_INTEGER);
  return value;
}

export function mbpsToBits(mbps: number): number {
  numberInRange(mbps, 0, LIMITS.bitrate);
  if (Math.round(mbps * 1000) / 1000 !== mbps) {
    throw new RangeError('Битрейт: не более 3 знаков после запятой.');
  }
  // Input precision is 0.001 Mbps; convert to integral bits/s without FP residue.
  return Math.round(mbps * 1000) * 1000;
}

export function toBytes(value: number, unit: StorageUnit): number {
  numberInRange(value, 0, LIMITS.capacity);
  if (!Object.hasOwn(UNITS, unit)) throw new RangeError('Неизвестная единица объёма.');
  return safeBytes(value * UNITS[unit]);
}

export function fromBytes(bytes: number, unit: StorageUnit): number {
  safeBytes(bytes);
  if (!Object.hasOwn(UNITS, unit)) throw new RangeError('Неизвестная единица объёма.');
  return bytes / UNITS[unit];
}

export function dailySeconds(schedule: Schedule): number {
  if (schedule.mode === 'continuous') return 86400;
  if (schedule.mode !== 'daily') throw new RangeError('Недопустимый режим записи.');
  const minutes = (time: string): number => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new RangeError('Укажите время в формате ЧЧ:ММ.');
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const duration = (minutes(schedule.end) - minutes(schedule.start) + 1440) % 1440;
  if (duration === 0) throw new RangeError('Начало и конец совпадают. Для полных суток выберите 24/7.');
  return duration * 60;
}

export function groupBytesPerDay(group: CameraGroup): number {
  if (!isCodec(group.codec)) throw new RangeError('Выберите H.264 или H.265.');
  if (!isResolution(group.resolution)) throw new RangeError('Выберите стандартное или своё разрешение.');
  numberInRange(group.count, 0, LIMITS.cameras, true);
  numberInRange(group.width, 1, LIMITS.dimension, true);
  numberInRange(group.height, 1, LIMITS.dimension, true);
  return safeBytes(group.count * mbpsToBits(group.bitrateMbps) * dailySeconds(group.schedule) / 8);
}

export type Retention = { kind: 'unbounded' } | { kind: 'finite'; days: number };
export function calculate(groups: CameraGroup[], days: number, availableBytes: number) {
  numberInRange(days, 1, LIMITS.days, true);
  numberInRange(groups.length, 1, LIMITS.groups, true);
  safeBytes(availableBytes);
  const summaries = groups.map(group => {
    const bytesPerDay = groupBytesPerDay(group);
    return { id: group.id, secondsPerDay: dailySeconds(group.schedule), bytesPerDay, bytes: safeBytes(bytesPerDay * days) };
  });
  const bytesPerDay = safeBytes(summaries.reduce((sum, group) => sum + group.bytesPerDay, 0));
  const totalBytes = safeBytes(summaries.reduce((sum, group) => sum + group.bytes, 0));
  const retention: Retention = bytesPerDay === 0
    ? { kind: 'unbounded' }
    : { kind: 'finite', days: availableBytes / bytesPerDay };
  return { summaries, bytesPerDay, totalBytes, retention, cameraCount: groups.reduce((sum, group) => sum + group.count, 0) };
}
