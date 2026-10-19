import { useCallback, useRef, useState } from 'react';
import { Camera, HardDrive, Plus, RotateCcw, ShieldCheck, Info, ArrowUpRight, Database, CalendarDays } from 'lucide-react';
import { defaults, evaluate, newGroup, type GroupDraft } from '../features/calculator/config';
import { fromBytes, LIMITS, UNITS, type StorageUnit } from '../domain/storage/calculator';
import { ru } from '../lib/ru';
import { GroupCard } from '../components/calculator/GroupCard';
import { NumberField } from '../components/ui/NumberField';
import { ThemeControl } from '../features/theme/ThemeControl';

const formatters = {
  0: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }),
  2: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }),
  3: new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }),
};
const EMPTY_ERRORS: Readonly<Record<string, string>> = Object.freeze({});
const format = (value: number, digits: 0 | 2 | 3 = 3) => {
  const formatter = formatters[digits];
  const threshold = 10 ** -digits;
  return value > 0 && value < threshold ? `< ${formatter.format(threshold)}` : formatter.format(value);
};

export function Calculator() {
  const [draft, setDraft] = useState(defaults);
  const nextId = useRef(2);
  const { errors, result } = evaluate(draft);
  const update = useCallback((id: string, patch: Partial<GroupDraft>) => setDraft(previous => ({ ...previous, groups: previous.groups.map(g => g.id === id ? { ...g, ...patch } : g) })), []);
  const remove = useCallback((id: string) => setDraft(previous => ({ ...previous, groups: previous.groups.filter(g => g.id !== id) })), []);
  const groupErrors = Object.keys(errors).length ? errors : EMPTY_ERRORS;
  return <>
    <a className="skip-link" href="#calculator">{ru.skip}</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href={import.meta.env.BASE_URL}><span className="brand-icon"><Camera size={24} aria-hidden="true" /></span><span><strong>{ru.product}</strong><small>{ru.productSub}</small></span></a>
      <span className="privacy"><ShieldCheck size={15} aria-hidden="true" />{ru.badge}</span>
      <ThemeControl />
    </div></header>
    <main id="calculator" tabIndex={-1} className="page-shell">
      <div className="intro"><p className="eyebrow">{ru.eyebrow}</p><h1>{ru.title}</h1><p>{ru.intro}</p></div>
      <div className="calculator-layout">
        <section className="panel configuration" aria-labelledby="configuration-title">
          <div className="panel-heading"><div><h2 id="configuration-title">{ru.configuration}</h2><p>{ru.configurationSub}</p></div>
            <button type="button" className="quiet-button" onClick={() => setDraft(defaults())}><RotateCcw size={15} aria-hidden="true" />{ru.reset}</button>
          </div>
          <div className="configuration-body">
            <div className="section-label"><h3>{ru.groups}</h3><span>{String(draft.groups.length).padStart(2, '0')}</span></div>
            <div className="group-list">{draft.groups.map((g, index) => <GroupCard key={g.id} group={g} index={index} errors={groupErrors} removable={draft.groups.length > 1}
              onChange={update} onRemove={remove} />)}</div>
            <button type="button" className="add-button" disabled={draft.groups.length >= LIMITS.groups} onClick={() => {
              const group = newGroup(String(nextId.current++));
              setDraft(previous => ({ ...previous, groups: [...previous.groups, group] }));
            }}><Plus size={17} aria-hidden="true" />{ru.add}</button>
            <p className="helper example-note"><Info size={15} aria-hidden="true" />{ru.example}</p>
            <div className="retention-config"><h3><CalendarDays size={18} aria-hidden="true" />{ru.retention}</h3>
              <NumberField id="days" label={ru.days} value={draft.days} onChange={days => setDraft(previous => ({ ...previous, days }))} error={errors.days} hint={ru.daysHint} integer />
            </div>
          </div>
        </section>
        <aside className="results-column" aria-label={ru.result}>
          <section className="result-panel" aria-labelledby="result-title">
            <div className="result-heading"><span className="result-icon"><Database size={21} aria-hidden="true" /></span><h2 id="result-title">{ru.result}</h2><span className={`live-dot${result ? '' : ' is-invalid'}`} aria-hidden="true" /></div>
            <p className="sr-only" role="status" aria-atomic="true">{result ? `${ru.result}: ${format(fromBytes(result.totalBytes, 'TB'))} TB` : ru.invalid}</p>
            <div>
              {result ? <>
                <p className="hero-value" data-testid="total-tb">{format(fromBytes(result.totalBytes, 'TB'))}<span>TB</span></p>
                <p className="result-caption"><strong>{ru.archiveFor} {draft.days} {ru.dayUnit}</strong><span>{ru.resultHint}</span></p>
                <dl className="unit-grid">{(['GB', 'GiB', 'TiB'] as const).map(unit => <div key={unit}><dt>{unit}</dt><dd data-testid={`total-${unit.toLowerCase()}`}>{format(fromBytes(result.totalBytes, unit))}</dd></div>)}</dl>
                <div className="result-stats"><div><span>{ru.perDay}</span><strong>{format(fromBytes(result.bytesPerDay, 'GB'))} GB</strong></div><div><span>{ru.totalCameras}</span><strong>{format(result.cameraCount, 0)}</strong></div></div>
                <div className="group-breakdown"><h3>{ru.breakdown}</h3>{result.summaries.map((summary, index) => <div key={summary.id}><span><i />{ru.group} {index + 1}</span><strong>{format(fromBytes(summary.bytes, 'TB'))} TB</strong></div>)}</div>
              </> : <div className="invalid-result"><h3>{ru.invalid}</h3><p>{ru.invalidHint}</p>{errors.total && <p role="alert">{ru.limit}</p>}</div>}
            </div>
          </section>
          <section className="panel disk-panel" aria-labelledby="disk-title"><div className="flex items-center gap-3"><span className="disk-icon"><HardDrive size={20} aria-hidden="true" /></span><h2 id="disk-title">{ru.disk}</h2></div><p className="muted">{ru.diskHint}</p>
            <div className="disk-inputs"><NumberField id="capacity" label={ru.capacity} value={draft.capacity} error={errors.capacity} onChange={capacity => setDraft(previous => ({ ...previous, capacity }))} />
              <label className="field"><span>{ru.unit}</span><select value={draft.unit} onChange={e => setDraft(previous => ({ ...previous, unit: e.target.value as StorageUnit }))}>{Object.keys(UNITS).map(unit => <option key={unit}>{unit}</option>)}</select></label>
            </div>
            <div className="reverse-result" aria-live="polite"><p>{ru.estimated}</p><strong data-testid="retention">{result ? result.retention.kind === 'unbounded' ? ru.unbounded : <>{format(result.retention.days, 2)} <span>{ru.dayUnit}</span></> : '—'}</strong>{result?.retention.kind === 'unbounded' && <p>{ru.zeroRate}</p>}</div>
          </section>
          <div className="assumptions"><Info size={18} aria-hidden="true" /><div><h3>{ru.assumptions}</h3><p>{ru.assumptionText}</p><p>{ru.units}</p><code>{ru.formula}</code></div></div>
        </aside>
      </div>
      <footer><span>{ru.footer}</span><a href="https://github.com/sxwxrslvvt/cctv-storage-calculator" target="_blank" rel="noreferrer">{ru.source}<ArrowUpRight size={14} aria-hidden="true" /></a></footer>
    </main>
  </>;
}
