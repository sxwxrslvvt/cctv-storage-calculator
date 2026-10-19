import { useState } from 'react';
import { fromBytes, type calculate } from '../../domain/storage/calculator';
import { ru } from '../../lib/ru';

type Summary = ReturnType<typeof calculate>['summaries'][number];
const percent = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const volume = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });

export function StorageBreakdown({ summaries, totalBytes }: { summaries: Summary[]; totalBytes: number }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  return <section className="group-breakdown" aria-labelledby="breakdown-title">
    <div className="breakdown-heading"><h3 id="breakdown-title">{ru.breakdown}</h3><span>{ru.breakdownHint}</span></div>
    <div className="allocation-track" aria-hidden="true" data-testid="allocation-chart">
      {totalBytes > 0 && summaries.map((group, index) => <span key={group.id} className={`allocation-segment allocation-color-${index % 8}`}
        data-group-id={group.id} data-share={group.bytes / totalBytes} data-dimmed={activeId !== null && activeId !== group.id}
        style={{ flexGrow: group.bytes, flexBasis: 0 }} />)}
    </div>
    {totalBytes === 0 && <p className="allocation-empty">{ru.noAllocation}</p>}
    <ul className="allocation-list" aria-label={ru.breakdown} onMouseLeave={() => setActiveId(null)}>
      {summaries.map((group, index) => {
        const share = totalBytes === 0 ? 0 : group.bytes / totalBytes * 100;
        const shareLabel = share > 0 && share < 0.1 ? '< 0,1' : percent.format(share);
        const tb = fromBytes(group.bytes, 'TB');
        const value = tb > 0 && tb < 0.001 ? '< 0,001' : volume.format(tb);
        return <li key={group.id}><button type="button" className="allocation-row" onMouseEnter={() => setActiveId(group.id)}
          onFocus={() => setActiveId(group.id)} onBlur={() => setActiveId(null)}
          onClick={() => {
            const input = document.getElementById(`${group.id}.count`);
            input?.focus({ preventScroll: true });
            input?.scrollIntoView({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          }}>
          <span className="allocation-name"><i className={`allocation-color-${index % 8}`} aria-hidden="true" />{ru.group} {index + 1}</span>{' '}
          <strong>{value} TB</strong>{' '}<span className="allocation-percent">{shareLabel}%</span><span className="sr-only">. {ru.editGroup}</span>
        </button></li>;
      })}
    </ul>
  </section>;
}
