import { useState } from 'react';
import { fromBytes, type calculate } from '../../domain/storage/calculator';
import { ru } from '../../lib/ru';
import { formatNumber as format } from '../../lib/format';

type Summary = ReturnType<typeof calculate>['summaries'][number];

export function StorageBreakdown({ summaries, totalBytes, selectedId, onSelect }: { summaries: Summary[]; totalBytes: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const activeId = focusedId ?? hoveredId ?? selectedId;
  const activeIndex = summaries.findIndex(group => group.id === activeId);
  const activeGroup = summaries[activeIndex];
  const marker = totalBytes > 0 && activeGroup?.bytes > 0 ? (summaries.slice(0, activeIndex).reduce((sum, group) => sum + group.bytes, 0) + activeGroup.bytes / 2) / totalBytes * 100 : null;
  return <section className="group-breakdown" aria-labelledby="breakdown-title">
    <div className="breakdown-heading"><h3 id="breakdown-title">{ru.breakdown}</h3><span>{ru.breakdownHint}</span></div>
    <div className="allocation-visual"><div className="allocation-track" aria-hidden="true" data-testid="allocation-chart">
      {totalBytes > 0 && summaries.map((group, index) => <span key={group.id} className={`allocation-segment allocation-color-${index % 8}`}
        data-group-id={group.id} data-share={group.bytes / totalBytes} data-dimmed={activeId !== null && activeId !== group.id}
        style={{ flexGrow: group.bytes, flexBasis: 0 }} />)}
    </div>{marker !== null && <span className="allocation-pointer" aria-hidden="true" style={{ left: `${marker}%` }} />}</div>
    {totalBytes === 0 && <p className="allocation-empty">{ru.noAllocation}</p>}
    <ul className="allocation-list" aria-label={ru.breakdown} onMouseLeave={() => setHoveredId(null)}>
      {summaries.map((group, index) => {
        const share = totalBytes === 0 ? 0 : group.bytes / totalBytes * 100;
        const shareLabel = format(share, 1);
        const tb = fromBytes(group.bytes, 'TB');
        const value = format(tb);
        return <li key={group.id}><button type="button" className="allocation-row" aria-pressed={selectedId === group.id} onMouseEnter={() => setHoveredId(group.id)}
          onFocus={() => setFocusedId(group.id)} onBlur={() => setFocusedId(null)}
          onClick={() => {
            onSelect(group.id);
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
