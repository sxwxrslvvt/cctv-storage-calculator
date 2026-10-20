import { Camera, Database, TrendingUp, ArrowDownRight } from 'lucide-react';
import { fromBytes, type calculate } from '../../domain/storage/calculator';
import { formatNumber as format } from '../../lib/format';
import { ru } from '../../lib/ru';

export function ResultsOverview({ result, days, capacity, totalError }: { result: ReturnType<typeof calculate> | null; days: string; capacity: number; totalError?: string }) {
  return <section className="overview" aria-label={ru.overview}>
    <section className="result-panel" aria-labelledby="result-title">
      <div className="hero-topline"><span className="hero-tag"><Database size={14} aria-hidden="true" />ПЛАНИРОВАНИЕ ВИДЕОАРХИВА</span><ArrowDownRight size={28} aria-hidden="true" /></div>
      <h1>{ru.title}</h1>
      <div className="result-heading"><h2 id="result-title">{ru.result}</h2></div>
      <p className="sr-only" role="status" aria-atomic="true">{result ? `${ru.result}: ${format(fromBytes(result.totalBytes, 'TB'))} TB` : ru.invalid}</p>
      {result ? <>
        <p className="hero-value" data-testid="total-tb"><span className="result-number" key={result.totalBytes}>{format(fromBytes(result.totalBytes, 'TB'))}</span><span className="hero-unit">TB</span></p>
        <p className="result-caption"><strong>{ru.archiveFor} {days} {ru.dayUnit}</strong><span>{ru.resultHint}</span></p>
        <div className="hero-capacity"><div><span>Доля доступной ёмкости</span><strong>{capacity > 0 ? `${format(result.totalBytes / capacity * 100, 1)}%` : result.totalBytes === 0 ? 'Нет записи' : 'Нет ёмкости'}</strong></div><div className="hero-capacity-track" aria-hidden="true"><span style={{ width: `${capacity > 0 ? Math.min(100, result.totalBytes / capacity * 100) : result.totalBytes > 0 ? 100 : 0}%` }} /></div></div>
        <dl className="unit-grid">{(['GB', 'GiB', 'TiB'] as const).map(unit => <div key={unit}><dt>{unit}</dt><dd data-testid={`total-${unit.toLowerCase()}`}>{format(fromBytes(result.totalBytes, unit))}</dd></div>)}</dl>
      </> : <div className="invalid-result"><h3>{ru.invalid}</h3><p>{ru.invalidHint}</p>{totalError && <p role="alert">{ru.limit}</p>}</div>}
    </section>
    <div className="hero-metrics"><div><TrendingUp size={18} aria-hidden="true" /><span>{ru.perDay}</span><strong>{result ? format(fromBytes(result.bytesPerDay, 'GB')) : '—'}<small>{result && ' GB'}</small></strong></div>
    <div><Camera size={18} aria-hidden="true" /><span>{ru.totalCameras}</span><strong>{result ? format(result.cameraCount, 0) : '—'}</strong></div><p>Расчёт по среднему битрейту.<br />Данные остаются в вашем браузере.</p></div>
  </section>;
}
