import { useId } from 'react';
import { Check, CircleAlert, HardDrive } from 'lucide-react';
import { fromBytes, type calculate, type StorageUnit } from '../../domain/storage/calculator';
import { formatNumber as format } from '../../lib/format';

export function StorageCapacity({ result, availableBytes, unit }: { result: ReturnType<typeof calculate> | null; availableBytes: number; unit: StorageUnit }) {
  const id = useId();
  if (!result) return <div className="capacity-unavailable"><HardDrive size={40} aria-hidden="true" /><p>Баланс ёмкости появится после исправления параметров.</p></div>;
  const required = result.totalBytes;
  const excess = required > availableBytes;
  const ratio = availableBytes > 0 ? required / availableBytes : required > 0 ? 1 : 0;
  const percentage = availableBytes > 0 ? `${format(ratio * 100, 1)}%` : '—';
  const status = required === 0 ? 'Нет записи' : availableBytes === 0 ? 'Нужен диск' : excess ? 'Недостаточно ёмкости' : 'Архив поместится';
  const volume = (bytes: number) => `${format(fromBytes(bytes, unit))} ${unit}`;
  return <div className="capacity-visual" data-excess={excess}>
    <div className="capacity-ring">
      <svg viewBox="0 0 200 200" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>Баланс ёмкости HDD</title>
        <desc id={`${id}-description`}>Требуется {volume(required)}. Доступно {volume(availableBytes)}. {status}.</desc>
        <defs><linearGradient id={`${id}-ring`}><stop stopColor="var(--blue)" /><stop offset="1" stopColor="var(--accent)" /></linearGradient></defs>
        <circle className="capacity-ring-track" cx="100" cy="100" r="82" />
        <circle className="capacity-ring-value" cx="100" cy="100" r="82" pathLength="100" stroke={`url(#${id}-ring)`} strokeDasharray={`${Math.min(1, ratio) * 100} 100`} transform="rotate(-90 100 100)" data-testid="capacity-ring-value" />
      </svg>
      <div className="capacity-ring-label" aria-hidden="true"><HardDrive size={22} /><strong data-testid="capacity-percent">{percentage}</strong><span>от доступного</span></div>
    </div>
    <p className="capacity-status" data-testid="capacity-status">{excess ? <CircleAlert size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{status}</p>
    <dl className="capacity-balance"><div><dt>Требуется</dt><dd data-testid="capacity-required">{volume(required)}</dd></div><div><dt>Доступно</dt><dd>{volume(availableBytes)}</dd></div><div><dt>{excess ? 'Не хватает' : 'Свободный остаток'}</dt><dd data-testid="capacity-balance">{volume(Math.abs(availableBytes - required))}</dd></div></dl>
  </div>;
}
