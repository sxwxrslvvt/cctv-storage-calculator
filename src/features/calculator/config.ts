import { type CameraGroup, type Schedule, type StorageUnit, LIMITS, calculate, toBytes, dailySeconds, mbpsToBits, isCodec, isResolution } from '../../domain/storage/calculator';

export { resolutions } from '../../domain/storage/calculator';
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
    if (number < min || number > max || (integer && !/^\d+(?:[.,]0+)?$/.test(value.trim()))) {
      throw new RangeError(`${integer ? 'Целое число' : 'Число'} от ${min} до ${max}.`);
    }
    return number;
  });
  const days = numeric('days', draft.days, 1, LIMITS.days, true);
  const capacity = numeric('capacity', draft.capacity, 0, LIMITS.capacity);
  draft.groups.forEach(g => {
    if (!isCodec(g.codec)) errors[`${g.id}.codec`] = 'Выберите H.264 или H.265.';
    if (!isResolution(g.resolution)) errors[`${g.id}.resolution`] = 'Выберите стандартное или своё разрешение.';
  });
  const groups: CameraGroup[] = draft.groups.map(g => ({
    ...g,
    count: numeric(`${g.id}.count`, g.count, 0, LIMITS.cameras, true),
    bitrateMbps: field(`${g.id}.bitrateMbps`, () => {
      const n = parseNumber(g.bitrateMbps);
      if (!/^\d+(?:[.,]\d{1,3}0*)?$/.test(g.bitrateMbps.trim())) {
        throw new RangeError('Битрейт: не более 3 знаков после запятой.');
      }
      mbpsToBits(n);
      return n;
    }),
    width: numeric(`${g.id}.width`, g.width, 1, LIMITS.dimension, true),
    height: numeric(`${g.id}.height`, g.height, 1, LIMITS.dimension, true),
    schedule: g.mode === 'continuous' ? { mode: 'continuous' } : { mode: g.mode, start: g.start, end: g.end },
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
