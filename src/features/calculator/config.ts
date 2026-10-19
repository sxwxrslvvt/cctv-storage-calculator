import { type CameraGroup, type Schedule, type StorageUnit, LIMITS, calculate, toBytes, dailySeconds, mbpsToBits } from '../../domain/storage/calculator';

export const resolutions = {
  '720p': [1280, 720], '1080p': [1920, 1080], '4MP': [2560, 1440], '4K': [3840, 2160],
} as const;
export type GroupDraft = Omit<CameraGroup, 'count' | 'bitrateMbps' | 'width' | 'height' | 'schedule'> & {
  count: string; bitrateMbps: string; width: string; height: string;
  mode: Schedule['mode']; start: string; end: string;
};
export interface Draft { groups: GroupDraft[]; days: string; capacity: string; unit: StorageUnit }
export const newGroup = (id: string): GroupDraft => ({
  id, count: '4', bitrateMbps: '4', codec: 'H.265', resolution: '1080p',
  width: '1920', height: '1080', mode: 'continuous', start: '08:00', end: '20:00',
});
export const defaults = (): Draft => ({ groups: [newGroup('1')], days: '30', capacity: '8', unit: 'TB' });

export function parseNumber(value: string): number {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) throw new RangeError('Введите неотрицательное число.');
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) throw new RangeError('Введите конечное число.');
  return parsed;
}

export function evaluate(draft: Draft) {
  const errors: Record<string, string> = {};
  function field(key: string, operation: () => number): number {
    try { return operation(); } catch (error) {
      errors[key] = error instanceof Error ? error.message : 'Проверьте значение.';
      return 0;
    }
  }
  const numeric = (key: string, value: string, min: number, max: number, integer = false) => field(key, () => {
    const number = parseNumber(value);
    if (number < min || number > max || (integer && !Number.isInteger(number))) {
      throw new RangeError(`${integer ? 'Целое число' : 'Число'} от ${min} до ${max}.`);
    }
    return number;
  });
  const days = numeric('days', draft.days, 1, LIMITS.days, true);
  const capacity = numeric('capacity', draft.capacity, 0, LIMITS.capacity);
  const groups: CameraGroup[] = draft.groups.map(g => ({
    ...g,
    count: numeric(`${g.id}.count`, g.count, 0, LIMITS.cameras, true),
    bitrateMbps: field(`${g.id}.bitrateMbps`, () => {
      const n = parseNumber(g.bitrateMbps);
      mbpsToBits(n);
      return n;
    }),
    width: numeric(`${g.id}.width`, g.width, 1, LIMITS.dimension, true),
    height: numeric(`${g.id}.height`, g.height, 1, LIMITS.dimension, true),
    schedule: g.mode === 'continuous' ? { mode: 'continuous' } : { mode: 'daily', start: g.start, end: g.end },
  }));
  // Schedule validation also runs when another field is invalid.
  groups.forEach(g => field(`${g.id}.schedule`, () => dailySeconds(g.schedule)));
  if (Object.keys(errors).length) return { errors, result: null };
  try { return { errors, result: calculate(groups, days, toBytes(capacity, draft.unit)) }; }
  catch (error) {
    errors.total = error instanceof Error ? error.message : 'Проверьте параметры.';
    return { errors, result: null };
  }
}
