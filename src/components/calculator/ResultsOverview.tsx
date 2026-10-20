import { Camera, CalendarDays, Database, HardDrive, TrendingUp } from 'lucide-react';
import { fromBytes, type calculate } from '../../domain/storage/calculator';
import { formatNumber as format } from '../../lib/format';
import { ru } from '../../lib/ru';

export function ResultsOverview({ result, days, totalError }: { result: ReturnType<typeof calculate> | null; days: string; totalError?: string }) {
  return <section className="overview" aria-label={ru.overview}>
    <section className="result-panel" aria-labelledby="result-title">
      <div className="result-heading"><span className="result-icon"><Database size={20} aria-hidden="true" /></span><h2 id="result-title">{ru.result}</h2><span className={`live-dot${result ? '' : ' is-invalid'}`} aria-hidden="true" /></div>
      <p className="sr-only" role="status" aria-atomic="true">{result ? `${ru.result}: ${format(fromBytes(result.totalBytes, 'TB'))} TB` : ru.invalid}</p>
      {result ? <>
        <p className="hero-value" data-testid="total-tb"><span className="result-number" key={result.totalBytes}>{format(fromBytes(result.totalBytes, 'TB'))}</span><span className="hero-unit">TB</span></p>
        <p className="result-caption"><strong>{ru.archiveFor} {days} {ru.dayUnit}</strong><span>{ru.resultHint}</span></p>
        <dl className="unit-grid">{(['GB', 'GiB', 'TiB'] as const).map(unit => <div key={unit}><dt>{unit}</dt><dd data-testid={`total-${unit.toLowerCase()}`}>{format(fromBytes(result.totalBytes, unit))}</dd></div>)}</dl>
      </> : <div className="invalid-result"><h3>{ru.invalid}</h3><p>{ru.invalidHint}</p>{totalError && <p role="alert">{ru.limit}</p>}</div>}
    </section>
    <div className="metric-card metric-rate"><TrendingUp size={18} aria-hidden="true" /><span>{ru.perDay}</span><strong>{result ? format(fromBytes(result.bytesPerDay, 'GB')) : '—'}<small>{result && ' GB'}</small></strong><p>{ru.dailyAverage}</p></div>
    <div className="metric-card"><Camera size={18} aria-hidden="true" /><span>{ru.totalCameras}</span><strong>{result ? format(result.cameraCount, 0) : '—'}</strong><p>{ru.allGroups}</p></div>
    <div className="metric-card"><CalendarDays size={18} aria-hidden="true" /><span>{ru.retention}</span><strong>{result ? days : '—'}<small>{result && ` ${ru.dayUnit}`}</small></strong><p>{ru.selectedPeriod}</p></div>
    <div className="metric-card metric-hdd"><HardDrive size={18} aria-hidden="true" /><span>{ru.hddForecast}</span><strong>{result ? result.retention.kind === 'unbounded' ? ru.unbounded : <>{format(result.retention.days, 2)}<small> {ru.dayUnit}</small></> : '—'}</strong><p>{ru.onAvailableDisk}</p></div>
  </section>;
}
