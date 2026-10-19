import { Camera, Trash2, Clock3 } from 'lucide-react';
import { type GroupDraft, resolutions } from '../../features/calculator/config';
import { ru } from '../../lib/ru';
import { NumberField } from '../ui/NumberField';
import { isResolution } from '../../domain/storage/calculator';

interface Props {
  group: GroupDraft; index: number; removable: boolean;
  errors: Record<string, string>;
  onChange: (patch: Partial<GroupDraft>) => void; onRemove: () => void;
}
export function GroupCard({ group: g, index, removable, errors, onChange, onRemove }: Props) {
  const scheduleError = errors[`${g.id}.schedule`];
  return <fieldset className="group-card">
    <legend className="sr-only">{ru.group} {index + 1}</legend>
    <div className="group-heading"><span className="group-icon"><Camera size={18} aria-hidden="true" /></span>
      <h3>{ru.group} {index + 1}</h3><span className="group-index">{String(index + 1).padStart(2, '0')}</span>
      <button type="button" className="icon-button" disabled={!removable} onClick={onRemove} aria-label={`${ru.remove} ${index + 1}`}><Trash2 size={17} aria-hidden="true" /></button>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <NumberField id={`${g.id}.count`} label={ru.cameras} value={g.count} error={errors[`${g.id}.count`]} onChange={count => onChange({ count })} integer />
      <NumberField id={`${g.id}.bitrateMbps`} label={ru.bitrate} value={g.bitrateMbps} error={errors[`${g.id}.bitrateMbps`]} onChange={bitrateMbps => onChange({ bitrateMbps })} />
      <label className="field"><span>{ru.codec}</span><select value={g.codec} onChange={e => onChange({ codec: e.target.value as GroupDraft['codec'] })}><option>H.264</option><option>H.265</option></select></label>
      <label className="field"><span>{ru.resolution}</span><select value={g.resolution} onChange={e => {
        const value = e.target.value;
        if (!isResolution(value)) return;
        const dimensions = value === 'custom' ? null : resolutions[value];
        onChange({ resolution: value, ...(dimensions ? { width: String(dimensions[0]), height: String(dimensions[1]) } : {}) });
      }}>{Object.keys(resolutions).map(key => <option key={key}>{key}</option>)}<option value="custom">{ru.custom}</option></select></label>
      {g.resolution === 'custom' && <>
        <NumberField id={`${g.id}.width`} label={ru.width} value={g.width} error={errors[`${g.id}.width`]} onChange={width => onChange({ width })} integer />
        <NumberField id={`${g.id}.height`} label={ru.height} value={g.height} error={errors[`${g.id}.height`]} onChange={height => onChange({ height })} integer />
      </>}
    </div>
    <label className="field schedule-field"><span className="flex items-center gap-2"><Clock3 size={14} aria-hidden="true" />{ru.recording}</span>
      <select value={g.mode} onChange={e => onChange({ mode: e.target.value as GroupDraft['mode'] })}><option value="continuous">{ru.continuous}</option><option value="daily">{ru.daily}</option></select>
    </label>
    {g.mode === 'daily' && <div className="schedule-times">
      <div className="grid grid-cols-2 gap-4">{(['start', 'end'] as const).map(key => <label key={key} className="field"><span>{ru[key]}</span><input type="time" value={g[key]} onChange={e => onChange({ [key]: e.target.value })} aria-invalid={!!scheduleError} aria-describedby={scheduleError ? `${g.id}-schedule-error` : undefined} /></label>)}</div>
      {g.end < g.start && <p className="helper">{ru.overnight}</p>}
      {scheduleError && <p id={`${g.id}-schedule-error`} className="error" role="alert">{scheduleError}</p>}
    </div>}
  </fieldset>;
}
