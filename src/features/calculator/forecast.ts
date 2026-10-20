import type { calculate } from '../../domain/storage/calculator';

type Result = Pick<ReturnType<typeof calculate>, 'bytesPerDay' | 'totalBytes' | 'retention'>;

export function forecastBytes(result: Result, days: number, day: number) {
  const boundedDay = Math.min(days, Math.max(0, day));
  return boundedDay === days ? result.totalBytes : result.bytesPerDay * boundedDay;
}

export function forecastFillDay(result: Result, days: number) {
  return result.retention.kind === 'finite' && result.retention.days <= days ? result.retention.days : null;
}
