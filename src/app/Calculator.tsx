import { useCallback, useRef, useState } from 'react';
import { Camera, HardDrive, Plus, RotateCcw, ShieldCheck, Info, ArrowUpRight, CalendarDays } from 'lucide-react';
import { defaults, evaluate, newGroup, type GroupDraft } from '../features/calculator/config';
import { toBytes, LIMITS, UNITS, type StorageUnit } from '../domain/storage/calculator';
import { formatNumber as format } from '../lib/format';
import { ru } from '../lib/ru';
import { GroupCard } from '../components/calculator/GroupCard';
import { NumberField } from '../components/ui/NumberField';
import { ThemeControl } from '../features/theme/ThemeControl';
import { StorageBreakdown } from '../components/calculator/StorageBreakdown';
import { ResultsOverview } from '../components/calculator/ResultsOverview';
import { ArchiveForecast } from '../components/calculator/ArchiveForecast';

const EMPTY_ERRORS: Readonly<Record<string, string>> = Object.freeze({});

export function Calculator() {
  const [draft, setDraft] = useState(defaults);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const nextId = useRef(2);
  const { errors, result } = evaluate(draft);
  const update = useCallback((id: string, patch: Partial<GroupDraft>) => setDraft(previous => ({ ...previous, groups: previous.groups.map(g => g.id === id ? { ...g, ...patch } : g) })), []);
  const remove = useCallback((id: string) => {
    setDraft(previous => ({ ...previous, groups: previous.groups.filter(g => g.id !== id) }));
    setSelectedGroupId(previous => previous === id ? null : previous);
    queueMicrotask(() => document.getElementById('add-group')?.focus());
  }, []);
  const selectGroup = useCallback((id: string) => setSelectedGroupId(id), []);
  const groupErrors = Object.keys(errors).length ? errors : EMPTY_ERRORS;
  return <>
    <a className="skip-link" href="#calculator">{ru.skip}</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href={import.meta.env.BASE_URL}><span className="brand-icon"><Camera size={23} aria-hidden="true" /></span><span><strong>{ru.product}</strong><small>{ru.productSub}</small></span></a>
      <span className="privacy"><ShieldCheck size={15} aria-hidden="true" />{ru.badge}</span><ThemeControl />
    </div></header>
    <main id="calculator" tabIndex={-1} className="page-shell">
      <div className="intro"><div><p className="eyebrow">{ru.eyebrow}</p><h1>{ru.title}</h1></div><p className="intro-copy">{ru.intro}</p></div>
      <ResultsOverview result={result} days={draft.days} totalError={errors.total} />
      <div className="calculator-layout">
        <section className="panel configuration" aria-labelledby="configuration-title">
          <div className="panel-heading"><div><p className="section-kicker">{ru.systemSetup}</p><h2 id="configuration-title">{ru.configuration}</h2></div>
            <button type="button" className="quiet-button" onClick={() => { setDraft(defaults()); setSelectedGroupId(null); }}><RotateCcw size={15} aria-hidden="true" />{ru.reset}</button>
          </div>
          <div className="configuration-body">
            <div className="section-label"><h3>{ru.groups}</h3><span>{String(draft.groups.length).padStart(2, '0')}</span></div>
            <div className="group-list">{draft.groups.map((g, index) => <GroupCard key={g.id} group={g} index={index} errors={groupErrors} removable={draft.groups.length > 1}
              selected={selectedGroupId === g.id} onChange={update} onRemove={remove} />)}</div>
            <button id="add-group" type="button" className="add-button" disabled={draft.groups.length >= LIMITS.groups} onClick={() => {
              const group = newGroup(String(nextId.current++));
              setDraft(previous => ({ ...previous, groups: [...previous.groups, group] }));
            }}><Plus size={17} aria-hidden="true" />{ru.add}</button>
            <p className="helper example-note"><Info size={15} aria-hidden="true" />{ru.example}</p>
            <div className="retention-config"><h3><CalendarDays size={18} aria-hidden="true" />{ru.retention}</h3>
              <NumberField id="days" label={ru.days} value={draft.days} onChange={days => setDraft(previous => ({ ...previous, days }))} error={errors.days} hint={ru.daysHint} integer />
            </div>
          </div>
        </section>
        <div className="analysis-column">
          {result ? <ArchiveForecast result={result} days={Number(draft.days.replace(',', '.'))} availableBytes={toBytes(Number(draft.capacity.replace(',', '.')), draft.unit)} unit={draft.unit} />
            : <section className="panel forecast-panel forecast-unavailable"><h2>{ru.forecastTitle}</h2><p>{ru.invalidHint}</p></section>}
          <div className="analysis-details">
            <section className="panel distribution-panel" aria-label={ru.breakdown}>
              {result ? <StorageBreakdown summaries={result.summaries} totalBytes={result.totalBytes} selectedId={selectedGroupId} onSelect={selectGroup} /> : <><h2>{ru.breakdown}</h2><p className="muted">{ru.invalidHint}</p></>}
            </section>
            <section className="panel disk-panel" aria-labelledby="disk-title"><div className="disk-heading"><span className="disk-icon"><HardDrive size={20} aria-hidden="true" /></span><h2 id="disk-title">{ru.disk}</h2></div><p className="muted">{ru.diskHint}</p>
              <div className="disk-inputs"><NumberField id="capacity" label={ru.capacity} value={draft.capacity} error={errors.capacity} onChange={capacity => setDraft(previous => ({ ...previous, capacity }))} />
                <label className="field"><span>{ru.unit}</span><select value={draft.unit} onChange={e => setDraft(previous => ({ ...previous, unit: e.target.value as StorageUnit }))}>{Object.keys(UNITS).map(unit => <option key={unit}>{unit}</option>)}</select></label>
              </div>
              <div className="reverse-result" aria-live="polite"><p>{ru.estimated}</p><strong data-testid="retention">{result ? result.retention.kind === 'unbounded' ? ru.unbounded : <>{format(result.retention.days, 2)} <span>{ru.dayUnit}</span></> : '—'}</strong>{result?.retention.kind === 'unbounded' && <p>{ru.zeroRate}</p>}</div>
            </section>
          </div>
          <div className="assumptions"><Info size={18} aria-hidden="true" /><div><h3>{ru.assumptions}</h3><p>{ru.assumptionText}</p><p>{ru.units}</p><code>{ru.formula}</code></div></div>
        </div>
      </div>
      <footer><span>{ru.footer}</span><a href="https://github.com/sxwxrslvvt/cctv-storage-calculator" target="_blank" rel="noreferrer">{ru.source}<ArrowUpRight size={14} aria-hidden="true" /></a></footer>
    </main>
  </>;
}
